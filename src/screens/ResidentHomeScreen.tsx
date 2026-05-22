import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ActiveCallExperience, IncomingCallExperience, OutgoingCallExperience } from '../components/CallExperience';
import { Card } from '../components/Card';
import { PhoneActionButton } from '../components/PhoneActionButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoUnits } from '../data/demo-data';
import {
  answerResidentCall,
  cancelCall,
  endCall,
  getMyCallHistory,
  getMyPendingCalls,
  startResidentToGatehouseCall,
  startResidentToUnitCall,
} from '../services/calls';
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
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);

    const interval = setInterval(() => {
      refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
    }, CALL_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [unitLabels]);

  const activeCall = history.find((call) => call.status === 'ANSWERED' && !call.endedAt);
  const outgoingCall = history.find((call) => call.status === 'RINGING' && !call.endedAt);
  const incomingCall = pendingCalls[0];

  if (incomingCall) {
    return (
      <IncomingCallExperience
        callerLabel={pendingCallTitle(incomingCall, unitLabels)}
        onAnswer={() => handleAnswerResidentCall(incomingCall.call_id, user.id, unitLabels, setHistory, setPendingCalls, setFeedback)}
        onRefresh={() => refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback)}
        startedAt={formatDateTime(incomingCall.started_at)}
        targetLabel="Sua unidade"
      />
    );
  }

  if (activeCall) {
    return (
      <ActiveCallExperience
        call={activeCall}
        onEnd={() => handleEndCall(activeCall.id, unitLabels, setHistory, setPendingCalls, setFeedback)}
      />
    );
  }

  if (outgoingCall) {
    return (
      <OutgoingCallExperience
        call={outgoingCall}
        onCancel={() => handleCancelCall(outgoingCall.id, unitLabels, setHistory, setPendingCalls, setFeedback)}
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
                setFeedback('Nenhuma unidade liberada para iniciar chamadas.');
                return;
              }

              handleResidentToGatehouseCall(originUnit.unit_id, unitLabels, setHistory, setPendingCalls, setFeedback, setActiveCallTarget);
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
              unit={unit}
              unitLabels={unitLabels}
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
            calls={history}
            onCancel={(callId) => handleCancelCall(callId, unitLabels, setHistory, setPendingCalls, setFeedback)}
          />
        ) : null}
      </View>
    </View>
  );
}

function buildUnitsFromContext(context: UserContext): UnitDirectoryItem[] {
  return context.unit_members.map((member) => ({
    id: member.unit.id,
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
  originUnitId,
  setActiveCallTarget,
  setFeedback,
  setHistory,
  setPendingCalls,
  unit,
  unitLabels,
}: {
  activeCallTarget: string | null;
  originUnitId: string | null;
  setActiveCallTarget: (target: string | null) => void;
  setFeedback: (message: string | null) => void;
  setHistory: (history: CallRecord[]) => void;
  setPendingCalls: (calls: PendingUnitCall[]) => void;
  unit: UnitDirectoryItem;
  unitLabels: Map<string, string>;
}) {
  const canCallUnit = Boolean(unit.canReceiveCalls && originUnitId);
  const helper = unit.canReceiveCalls ? 'Disponivel' : 'Indisponivel';

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
          disabled={!canCallUnit || activeCallTarget !== null}
          testID={canCallUnit ? 'resident-call-unit' : 'resident-unit-unavailable'}
          onPress={() => {
            if (!originUnitId || !canCallUnit) {
              setFeedback(helper);
              return;
            }

            handleResidentToUnitCall(
              originUnitId,
              unit.id,
              unit.label,
              unitLabels,
              setHistory,
              setPendingCalls,
              setFeedback,
              setActiveCallTarget,
            );
          }}
        />
      </View>
      <Text style={[styles.itemHelp, unit.canReceiveCalls ? styles.available : styles.unavailable]}>
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
) {
  await Promise.all([
    refreshHistory(unitLabels, setHistory, setFeedback, options),
    refreshPendingCalls(setPendingCalls, setFeedback, options),
  ]);
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
    toLabel: call.target_type === 'PORTARIA' ? 'Portaria' : targetUnit,
    status: call.status,
    startedAt: formatDateTime(call.started_at),
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

function showInfo(message: string) {
  if (typeof globalThis.alert === 'function') {
    globalThis.alert(message);
    return;
  }

  Alert.alert('Confia', message);
}

async function handleResidentToGatehouseCall(
  unitId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  setFeedback('Chamando portaria...');
  setActiveCallTarget('portaria');

  try {
    const call = await startResidentToGatehouseCall(unitId);
    setFeedback(`Chamada iniciada para a portaria. Status: ${call.status}.`);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
  } catch (err) {
    setFeedback(`Nao foi possivel chamar a portaria: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  } finally {
    setActiveCallTarget(null);
  }
}

async function handleAnswerResidentCall(
  callId: string,
  userId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  setFeedback('Atendendo chamada...');

  try {
    const call = await answerResidentCall(callId, userId);
    setFeedback(`Chamada atendida. Status: ${call.status}.`);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    setFeedback(`Nao foi possivel atender: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
}

async function handleCancelCall(
  callId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  setFeedback('Cancelando chamada...');

  try {
    const call = await cancelCall(callId);
    setFeedback(`Chamada cancelada. Status: ${call.status}.`);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    setFeedback(`Nao foi possivel cancelar: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
}

async function handleEndCall(
  callId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  setFeedback('Encerrando chamada...');

  try {
    const call = await endCall(callId);
    setFeedback(`Chamada encerrada. Status: ${call.status}.`);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    setFeedback(`Nao foi possivel encerrar: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
}

async function handleResidentToUnitCall(
  originUnitId: string,
  targetUnitId: string,
  targetLabel: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingUnitCall[]) => void,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  setFeedback(`Chamando ${targetLabel}...`);
  setActiveCallTarget(targetUnitId);

  try {
    const call = await startResidentToUnitCall(originUnitId, targetUnitId);
    setFeedback(`Chamada iniciada para ${targetLabel}. Status: ${call.status}.`);
    await refreshResidentData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
  } catch (err) {
    setFeedback(`Nao foi possivel chamar ${targetLabel}: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  } finally {
    setActiveCallTarget(null);
  }
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
