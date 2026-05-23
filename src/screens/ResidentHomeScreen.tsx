import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ActiveCallExperience, IncomingCallExperience, OutgoingCallExperience } from '../components/CallExperience';
import { Card } from '../components/Card';
import { PhoneActionButton } from '../components/PhoneActionButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoUnits } from '../data/demo-data';
import { buildBusyUnitIds, getActiveCondominiumCalls } from '../services/availability';
import {
  answerResidentCall,
  cancelCall,
  endCall,
  getMyCallHistory,
  getMyPendingCalls,
  startResidentToGatehouseCall,
  startResidentToUnitCall,
} from '../services/calls';
import { isCallRelevantToResident, isOutgoingResidentCall } from '../services/call-ownership';
import { getErrorMessage, logCallDiagnostic } from '../services/diagnostics';
import { reportAppError } from '../services/error-reporting';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, BackendCallRecord, CallRecord, PendingUnitCall, UnitDirectoryItem, UserContext } from '../types/domain';

type ResidentHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  user: AuthenticatedUser;
};

const CALL_REFRESH_INTERVAL_MS = 5000;

export function ResidentHomeScreen({ context, directoryUnits, user }: ResidentHomeScreenProps) {
  const myUnits = context.unit_members.map((member) => formatUnitLabel(member.unit));
  const originUnit = context.unit_members.find((member) => member.active_for_calls && member.can_make_calls);
  const units = directoryUnits.length > 0 ? directoryUnits : myUnits.length > 0 ? buildUnitsFromContext(context) : demoUnits;
  const callableUnits = units.filter((unit) => unit.id !== originUnit?.unit_id);
  const unitLabels = useMemo(() => buildUnitLabelMap([...directoryUnits, ...buildUnitsFromContext(context)]), [context, directoryUnits]);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [pendingCalls, setPendingCalls] = useState<PendingUnitCall[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyUnitIds, setBusyUnitIds] = useState<Set<string>>(new Set());
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, undefined, user.condominiumId, setBusyUnitIds);

    const interval = setInterval(() => {
      refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true }, user.condominiumId, setBusyUnitIds);
    }, CALL_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [unitLabels, user.condominiumId]);

  const relevantHistory = history.filter((call) => isCallRelevantToResident(call, context));
  const activeCall = relevantHistory.find((call) => call.status === 'ANSWERED' && !call.endedAt);
  const outgoingCall = relevantHistory.find((call) => call.status === 'RINGING' && !call.endedAt && isOutgoingResidentCall(call, context));
  const incomingCall = pendingCalls[0];

  if (incomingCall) {
    return (
      <IncomingCallExperience
        callerLabel={pendingCallTitle(incomingCall, unitLabels)}
        onAnswer={() => handleAnswerResidentCall(incomingCall.call_id, user, unitLabels, setHistory, setPendingCalls, setFeedback)}
        startedAt={formatDateTime(incomingCall.started_at)}
        targetLabel="Sua unidade"
      />
    );
  }

  if (activeCall) {
    return (
      <ActiveCallExperience
        call={activeCall}
        onEnd={() => handleEndCall(activeCall.id, user, unitLabels, setHistory, setPendingCalls, setFeedback)}
      />
    );
  }

  if (outgoingCall) {
    return (
      <OutgoingCallExperience
        call={outgoingCall}
        onCancel={() => handleCancelCall(outgoingCall.id, user, unitLabels, setHistory, setPendingCalls, setFeedback)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.eyebrow}>Modo morador</Text>
        <Text style={styles.title}>Interfone</Text>
        <Text style={styles.description}>
          {myUnits.length > 0 ? `Sua unidade: ${myUnits.join(', ')}` : 'Ligue para a portaria ou para outra unidade do mesmo condominio.'}
        </Text>
      </View>

      <Card>
        <View style={styles.portariaAction}>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>Portaria</Text>
            <Text style={styles.itemMeta}>Fale com a portaria do seu condominio.</Text>
          </View>
          <PhoneActionButton
            accessibilityLabel="Chamar portaria"
            disabled={activeCallTarget !== null}
            testID="resident-call-gatehouse"
            onPress={() => {
              if (!originUnit?.unit_id) {
                showInfo('Chamada indisponivel', 'Nenhuma unidade liberada para iniciar chamadas.');
                return;
              }

              handleResidentToGatehouseCall(user, originUnit.unit_id, unitLabels, setHistory, setPendingCalls, setFeedback, setActiveCallTarget);
            }}
          />
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unidades do condominio</Text>
        <View style={styles.list}>
          {callableUnits.length === 0 ? (
            <Card>
              <Text style={styles.itemMeta}>Cadastre outra unidade com morador ativo para ligar entre casas.</Text>
            </Card>
          ) : null}
          {callableUnits.map((unit) => (
            <UnitCard
              activeCallTarget={activeCallTarget}
              key={unit.id}
              originUnitId={originUnit?.unit_id ?? null}
              setActiveCallTarget={setActiveCallTarget}
              setFeedback={setFeedback}
              setHistory={setHistory}
              setPendingCalls={setPendingCalls}
              busyUnitIds={busyUnitIds}
              unit={unit}
              unitLabels={unitLabels}
              user={user}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <PrimaryButton
          label={showHistory ? 'Ocultar historico' : 'Ver historico'}
          tone="neutral"
          onPress={() => setShowHistory((current) => !current)}
        />
        {showHistory ? (
          <CallHistory
            calls={relevantHistory}
            onCancel={(callId) => handleCancelCall(callId, user, unitLabels, setHistory, setPendingCalls, setFeedback)}
          />
        ) : null}
      </View>
    </View>
  );
}

function buildUnitsFromContext(context: UserContext): UnitDirectoryItem[] {
  return context.unit_members.map((member) => ({
    id: member.unit.id,
    isBusy: false,
    label: formatUnitLabel(member.unit),
    type: member.unit.type === 'HOUSE' ? 'Casa' : 'Apartamento',
    activeResidentsCount: member.active_for_calls && member.can_receive_calls ? 1 : 0,
    residents: [member.member_type === 'RESIDENT' ? 'Morador autorizado' : member.member_type],
    canReceiveCalls: member.can_receive_calls,
    canMakeCalls: member.can_make_calls,
  }));
}

function formatUnitLabel(unit: UserContext['unit_members'][number]['unit']) {
  return [unit.block, unit.number].filter(Boolean).join(' - ');
}

function buildUnitLabelMap(units: UnitDirectoryItem[]) {
  return new Map(units.map((unit) => [unit.id, unit.label]));
}

function UnitCard({
  activeCallTarget,
  busyUnitIds,
  originUnitId,
  setActiveCallTarget,
  setFeedback,
  setHistory,
  setPendingCalls,
  unit,
  unitLabels,
  user,
}: {
  activeCallTarget: string | null;
  busyUnitIds: Set<string>;
  originUnitId: string | null;
  setActiveCallTarget: (target: string | null) => void;
  setFeedback: (message: string | null) => void;
  setHistory: (history: CallRecord[]) => void;
  setPendingCalls: (calls: PendingUnitCall[]) => void;
  unit: UnitDirectoryItem;
  unitLabels: Map<string, string>;
  user: AuthenticatedUser;
}) {
  const canCallUnit = Boolean(unit.canReceiveCalls && originUnitId);
  const isBusy = busyUnitIds.has(unit.id);
  const helper = isBusy ? 'Em atendimento' : unit.canReceiveCalls ? 'Disponivel' : 'Indisponivel';

  return (
    <Card>
      <View style={styles.unitRow}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{unit.label}</Text>
          <Text style={styles.itemMeta}>
            {unit.type} - {unit.residents.join(', ')}
          </Text>
        </View>
        <PhoneActionButton
          accessibilityLabel={`Chamar unidade ${unit.label}`}
          disabled={activeCallTarget !== null}
          muted={!canCallUnit || isBusy}
          testID={canCallUnit ? 'resident-call-unit' : 'resident-unit-unavailable'}
          onPress={() => {
            if (isBusy) {
              showInfo('Unidade em atendimento', 'Esta unidade esta em atendimento. Tente novamente em alguns minutos.');
              return;
            }

            if (!originUnitId || !canCallUnit) {
              showInfo('Chamada indisponivel', helper);
              return;
            }

            handleResidentToUnitCall(
              originUnitId,
              unit.id,
              unit.label,
              user,
              unitLabels,
              setHistory,
              setPendingCalls,
              setFeedback,
              setActiveCallTarget,
            );
          }}
        />
      </View>
      <Text style={[styles.itemHelp, !isBusy && unit.canReceiveCalls ? styles.available : styles.unavailable]}>
        {activeCallTarget === unit.id ? 'Chamando...' : helper}
      </Text>
    </Card>
  );
}

function CallHistory({ calls, onCancel }: { calls: CallRecord[]; onCancel: (callId: string) => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Historico recente</Text>
      <View style={styles.list}>
        {calls.length === 0 ? (
          <Card>
            <Text style={styles.itemMeta}>Nenhuma chamada encontrada para este usuario.</Text>
          </Card>
        ) : (
          calls.map((call) => (
            <Card key={call.id}>
              <Text style={styles.itemTitle}>
                {call.fromLabel} para {call.toLabel}
              </Text>
              <Text style={styles.itemMeta}>
                {callStatusLabel(call.status)} - {call.startedAt}
              </Text>
              {call.status === 'RINGING' ? (
                <View style={styles.cardAction}>
                  <PrimaryButton label="Cancelar chamada" tone="neutral" onPress={() => onCancel(call.id)} />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </View>
  );
}

async function refreshResidentData(
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
  options?: { silent?: boolean },
  condominiumId?: string,
  setBusyUnitIds?: (unitIds: Set<string>) => void,
) {
  const tasks: Promise<void>[] = [
    refreshHistory(unitLabels, setHistory, setFeedback, options),
    refreshPendingCalls(setPendingCalls, setFeedback, options),
  ];

  if (condominiumId && setBusyUnitIds) {
    tasks.push(refreshBusyUnits(condominiumId, setBusyUnitIds));
  }

  await Promise.all(tasks);
}

async function refreshBusyUnits(condominiumId: string, setBusyUnitIds: (unitIds: Set<string>) => void) {
  const activeCalls = await getActiveCondominiumCalls(condominiumId);
  setBusyUnitIds(buildBusyUnitIds(activeCalls));
}

async function refreshHistory(
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setFeedback: (message: string | null) => void,
  options?: { silent?: boolean },
) {
  try {
    const calls = await getMyCallHistory();
    setHistory(calls.map((call) => mapBackendCall(call, unitLabels)));
  } catch (err) {
    if (!options?.silent) {
      setFeedback(`Nao foi possivel carregar o historico: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
    }
  }
}

async function refreshPendingCalls(
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
  options?: { silent?: boolean },
) {
  try {
    const calls = await getMyPendingCalls();
    setPendingCalls(calls.unit_calls ?? []);
  } catch (err) {
    if (!options?.silent) {
      setFeedback(`Nao foi possivel carregar chamadas recebidas: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
    }
  }
}

function mapBackendCall(call: BackendCallRecord, unitLabels: Map<string, string>): CallRecord {
  const targetUnit = unitLabels.get(call.unit_id) ?? 'Unidade';
  const originUnit = call.origin_unit_id ? unitLabels.get(call.origin_unit_id) ?? 'Unidade' : 'Unidade';

  return {
    id: call.id,
    direction:
      call.origin_type === 'PORTARIA'
        ? 'gatehouse_to_unit'
        : call.target_type === 'PORTARIA'
          ? 'resident_to_gatehouse'
          : 'resident_to_unit',
    endedAt: call.ended_at,
    fromLabel: call.origin_type === 'PORTARIA' ? 'Portaria' : originUnit,
    originPortariaDeviceId: call.origin_portaria_device_id,
    originType: call.origin_type,
    originUnitId: call.origin_unit_id,
    toLabel: call.target_type === 'PORTARIA' ? 'Portaria' : targetUnit,
    status: call.status,
    startedAt: formatDateTime(call.started_at),
    targetPortariaDeviceId: call.target_portaria_device_id,
    targetType: call.target_type,
    unitId: call.unit_id,
  };
}

function pendingCallTitle(call: PendingUnitCall, unitLabels: Map<string, string>) {
  if (call.origin_type === 'PORTARIA') {
    return `Portaria para ${unitLabels.get(call.unit_id) ?? 'sua unidade'}`;
  }

  return `${call.origin_unit_id ? unitLabels.get(call.origin_unit_id) ?? 'Unidade' : 'Unidade'} para ${
    unitLabels.get(call.unit_id) ?? 'sua unidade'
  }`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function showInfo(title: string, message: string) {
  if (typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message, [{ text: 'OK' }]);
}

async function handleResidentToGatehouseCall(
  user: AuthenticatedUser,
  unitId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Chamando portaria...');
  setActiveCallTarget('portaria');
  void logCallDiagnostic({ action: 'resident_call_gatehouse', result: 'STARTED', unitId, user });

  try {
    const call = await startResidentToGatehouseCall(unitId);
    void logCallDiagnostic({
      action: 'resident_call_gatehouse',
      callId: call.id,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      unitId,
      user,
    });
    setHistory([
      buildOptimisticCall({
        id: call.id,
        fromLabel: unitLabels.get(unitId) ?? 'Sua unidade',
        originType: 'UNIT',
        originUnitId: unitId,
        status: 'RINGING',
        targetType: 'PORTARIA',
        toLabel: 'Portaria',
        unitId,
      }),
    ]);
    setFeedback(null);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
  } catch (err) {
    const message = getErrorMessage(err);
    void logCallDiagnostic({
      action: 'resident_call_gatehouse',
      durationMs: Date.now() - startedAt,
      errorMessage: message,
      result: 'ERROR',
      unitId,
      user,
    });
    setFeedback(null);
    showInfo('Nao foi possivel chamar a portaria', message);
  } finally {
    setActiveCallTarget(null);
  }
}

async function handleAnswerResidentCall(
  callId: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Atendendo chamada...');
  void logCallDiagnostic({ action: 'resident_answer_call', callId, result: 'STARTED', user });

  try {
    const call = await answerResidentCall(callId, user.id);
    void logCallDiagnostic({
      action: 'resident_answer_call',
      callId,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      user,
    });
    setFeedback(`Chamada atendida. Status: ${call.status}.`);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    const message = getErrorMessage(err);
    void logCallDiagnostic({ action: 'resident_answer_call', callId, durationMs: Date.now() - startedAt, errorMessage: message, result: 'ERROR', user });
    setFeedback(null);
    showInfo('Nao foi possivel atender', message);
  }
}

async function handleCancelCall(
  callId: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Cancelando chamada...');
  void logCallDiagnostic({ action: 'resident_cancel_call', callId, result: 'STARTED', user });

  try {
    const call = await cancelCall(callId);
    void logCallDiagnostic({
      action: 'resident_cancel_call',
      callId,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      user,
    });
    setFeedback('Chamada cancelada.');
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    const message = getCallActionErrorMessage(err);
    void logCallDiagnostic({ action: 'resident_cancel_call', callId, durationMs: Date.now() - startedAt, errorMessage: message, result: 'ERROR', user });
    reportUnexpectedCallError(err, user, 'resident_cancel_call', callId);
    setFeedback(null);
    showInfo('Nao foi possivel cancelar', message);
  }
}

async function handleEndCall(
  callId: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Encerrando chamada...');
  void logCallDiagnostic({ action: 'resident_end_call', callId, result: 'STARTED', user });

  try {
    const call = await endCall(callId);
    void logCallDiagnostic({
      action: 'resident_end_call',
      callId,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      user,
    });
    setFeedback('Chamada encerrada.');
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    const message = getCallActionErrorMessage(err);
    void logCallDiagnostic({ action: 'resident_end_call', callId, durationMs: Date.now() - startedAt, errorMessage: message, result: 'ERROR', user });
    reportUnexpectedCallError(err, user, 'resident_end_call', callId);
    setFeedback(null);
    showInfo('Nao foi possivel encerrar', message);
  }
}

async function handleResidentToUnitCall(
  originUnitId: string,
  targetUnitId: string,
  targetLabel: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback(`Chamando ${targetLabel}...`);
  setActiveCallTarget(targetUnitId);
  void logCallDiagnostic({ action: 'resident_call_unit', result: 'STARTED', targetUnitId, unitId: originUnitId, user });

  try {
    const call = await startResidentToUnitCall(originUnitId, targetUnitId);
    void logCallDiagnostic({
      action: 'resident_call_unit',
      callId: call.id,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status, target_label: targetLabel },
      result: 'SUCCESS',
      targetUnitId,
      unitId: originUnitId,
      user,
    });
    setHistory([
      buildOptimisticCall({
        id: call.id,
        fromLabel: unitLabels.get(originUnitId) ?? 'Sua unidade',
        originType: 'UNIT',
        originUnitId,
        status: 'RINGING',
        targetType: 'UNIT',
        toLabel: targetLabel,
        unitId: targetUnitId,
      }),
    ]);
    setFeedback(null);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
  } catch (err) {
    const message = getErrorMessage(err);
    void logCallDiagnostic({
      action: 'resident_call_unit',
      durationMs: Date.now() - startedAt,
      errorMessage: message,
      metadata: { target_label: targetLabel },
      result: 'ERROR',
      targetUnitId,
      unitId: originUnitId,
      user,
    });
    setFeedback(null);
    showInfo(`Nao foi possivel chamar ${targetLabel}`, message);
  } finally {
    setActiveCallTarget(null);
  }
}

function buildOptimisticCall({
  fromLabel,
  id,
  originType,
  originUnitId,
  status,
  targetType,
  toLabel,
  unitId,
}: {
  fromLabel: string;
  id: string;
  originType: 'PORTARIA' | 'UNIT';
  originUnitId: string | null;
  status: CallRecord['status'];
  targetType: 'PORTARIA' | 'UNIT';
  toLabel: string;
  unitId: string;
}): CallRecord {
  return {
    direction: originType === 'PORTARIA' ? 'gatehouse_to_unit' : targetType === 'PORTARIA' ? 'resident_to_gatehouse' : 'resident_to_unit',
    endedAt: null,
    fromLabel,
    id,
    originPortariaDeviceId: null,
    originType,
    originUnitId,
    startedAt: formatDateTime(new Date().toISOString()),
    status,
    targetPortariaDeviceId: null,
    targetType,
    toLabel,
    unitId,
  };
}

function getCallActionErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  if (/cannot end|cannot cancel|not allowed|not authorized/i.test(message)) {
    return 'Esta chamada ja foi encerrada ou nao pertence mais a este dispositivo. Atualize a tela e tente novamente.';
  }

  return message;
}

function reportUnexpectedCallError(error: unknown, user: AuthenticatedUser, action: string, callId: string) {
  const message = getErrorMessage(error);

  if (/atendimento|ocupad|busy/i.test(message)) {
    return;
  }

  void reportAppError(error, {
    metadata: { action, callId, profile: user.profile, userId: user.id },
    source: 'call-action-error',
  });
}

function callStatusLabel(status: CallRecord['status']) {
  const labels = {
    ANSWERED: 'Atendida',
    CANCELLED: 'Cancelada',
    MISSED: 'Perdida',
    RINGING: 'Tocando',
    answered: 'Atendida',
    ended: 'Encerrada',
    missed: 'Perdida',
    ringing: 'Tocando',
  };

  return labels[status];
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: theme.spacing.xs,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.md,
  },
  portariaAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  itemMeta: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  itemHelp: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.sm,
  },
  unitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  feedback: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  available: {
    color: theme.colors.success,
  },
  unavailable: {
    color: theme.colors.muted,
  },
  badge: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    color: theme.colors.success,
  },
  badgeMuted: {
    backgroundColor: '#e5e7eb',
    color: theme.colors.muted,
  },
  cardAction: {
    marginTop: theme.spacing.md,
  },
});
