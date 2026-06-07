import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ActiveCallExperience, IncomingCallExperience, OutgoingCallExperience } from '../components/CallExperience';
import { Card } from '../components/Card';
import { MessageActionButton } from '../components/MessageActionButton';
import { PhoneActionButton } from '../components/PhoneActionButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoUnits } from '../data/demo-data';
import { buildBusyUnitIds, getActiveCondominiumCalls } from '../services/availability';
import { answerGatehouseCall, cancelCall, endCall, getMyCallHistory, getMyPendingCalls, startGatehouseToUnitCall } from '../services/calls';
import { isCallRelevantToGatehouse, isOutgoingGatehouseCall } from '../services/call-ownership';
import { getErrorMessage, logCallDiagnostic } from '../services/diagnostics';
import { reportAppError } from '../services/error-reporting';
import { listMyMessageThreads, type MessageTarget, type MessageThread } from '../services/messages';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, BackendCallRecord, CallRecord, PendingPortariaCall, UnitDirectoryItem, UserContext } from '../types/domain';

type GatehouseHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  messagingEnabled?: boolean;
  onOpenMessages?: (target: MessageTarget) => void;
  user: AuthenticatedUser;
};

const CALL_REFRESH_INTERVAL_MS = 5000;
const MESSAGE_BADGE_REFRESH_INTERVAL_MS = 10000;

export function GatehouseHomeScreen({ context, directoryUnits, messagingEnabled = false, onOpenMessages, user }: GatehouseHomeScreenProps) {
  const activeDevice = context.portaria_devices.find((device) => device.is_active);
  const units = directoryUnits.length > 0 ? directoryUnits : demoUnits;
  const unitLabels = useMemo(() => new Map(units.map((unit) => [unit.id, unit.label])), [units]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [pendingCalls, setPendingCalls] = useState<PendingPortariaCall[]>([]);
  const [busyUnitIds, setBusyUnitIds] = useState<Set<string>>(new Set());
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const ringingCalls = pendingCalls.length;

  useEffect(() => {
    refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback, undefined, user.condominiumId, setBusyUnitIds);

    const interval = setInterval(() => {
      refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true }, user.condominiumId, setBusyUnitIds);
    }, CALL_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [unitLabels, user.condominiumId]);

  useEffect(() => {
    if (!messagingEnabled) {
      return undefined;
    }

    void refreshMessageBadges(setMessageThreads);
    const interval = setInterval(() => {
      void refreshMessageBadges(setMessageThreads);
    }, MESSAGE_BADGE_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [messagingEnabled]);

  const relevantHistory = history.filter((call) => isCallRelevantToGatehouse(call, context));
  const activeCall = relevantHistory.find((call) => call.status === 'ANSWERED' && !call.endedAt);
  const outgoingCall = relevantHistory.find((call) => call.status === 'RINGING' && !call.endedAt && isOutgoingGatehouseCall(call, context));
  const incomingCall = pendingCalls[0];

  if (incomingCall) {
    return (
      <IncomingCallExperience
        callerLabel={`${unitLabels.get(incomingCall.origin_unit_id ?? incomingCall.unit_id) ?? 'Unidade'} para Portaria`}
        onAnswer={() => handleAnswerGatehouseCall(incomingCall.call_id, user, unitLabels, setHistory, setPendingCalls, setFeedback)}
        startedAt={formatDateTime(incomingCall.started_at)}
        targetLabel="Portaria"
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
        <Text style={styles.eyebrow}>Modo portaria</Text>
        <Text style={styles.title}>Central da portaria</Text>
        <Text style={styles.description}>
          {user.email} esta vinculado ao condominio e pode ligar para unidades autorizadas.
        </Text>
      </View>

      <View style={styles.section}>
        <Card>
          <View style={styles.deviceHeader}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{activeDevice?.name ?? 'Portaria principal'}</Text>
              <Text style={styles.itemMeta}>{units.length} unidade(s) disponiveis para operar.</Text>
            </View>
            <Text style={styles.badge}>{activeDevice ? 'Ativo' : 'Sem vinculo'}</Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{units.length}</Text>
              <Text style={styles.statLabel}>Unidades</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{ringingCalls}</Text>
              <Text style={styles.statLabel}>Tocando</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unidades</Text>
        <View style={styles.list}>
          {units.map((unit) => (
            <GatehouseUnitCard
              activeCallTarget={activeCallTarget}
              activeDeviceId={activeDevice?.id ?? null}
              busyUnitIds={busyUnitIds}
              key={unit.id}
              messageThreads={messageThreads}
              messagingEnabled={messagingEnabled}
              onOpenMessages={onOpenMessages}
              setActiveCallTarget={setActiveCallTarget}
              setFeedback={setFeedback}
              setHistory={setHistory}
              setPendingCalls={setPendingCalls}
              unit={unit}
              unitLabels={unitLabels}
              user={user}
            />
          ))}
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
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

function GatehouseUnitCard({
  activeCallTarget,
  activeDeviceId,
  busyUnitIds,
  messageThreads,
  messagingEnabled,
  onOpenMessages,
  setActiveCallTarget,
  setFeedback,
  setHistory,
  setPendingCalls,
  unit,
  unitLabels,
  user,
}: {
  activeCallTarget: string | null;
  activeDeviceId: string | null;
  busyUnitIds: Set<string>;
  messageThreads: MessageThread[];
  messagingEnabled: boolean;
  onOpenMessages?: (target: MessageTarget) => void;
  setActiveCallTarget: (target: string | null) => void;
  setFeedback: (message: string | null) => void;
  setHistory: (history: CallRecord[]) => void;
  setPendingCalls: (calls: PendingPortariaCall[]) => void;
  unit: UnitDirectoryItem;
  unitLabels: Map<string, string>;
  user: AuthenticatedUser;
}) {
  const isBusy = busyUnitIds.has(unit.id);
  const helper = isBusy ? 'Em atendimento' : unit.canReceiveCalls ? 'Disponivel' : 'Bloqueada';

  return (
    <Card>
      <View style={styles.unitRow}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{unit.label}</Text>
          <Text style={styles.itemMeta}>{unit.residents.join(', ')}</Text>
        </View>
        <View style={styles.actionButtons}>
          {messagingEnabled ? (
            <MessageActionButton
              accessibilityLabel={`Enviar mensagem para unidade ${unit.label}`}
              disabled={activeCallTarget !== null}
              testID="gatehouse-message-unit"
              unreadCount={getGatehouseUnitUnreadCount(messageThreads, unit.id)}
              onPress={() =>
                onOpenMessages?.({
                  label: unit.label,
                  targetType: 'UNIT',
                  targetUnitId: unit.id,
                })
              }
            />
          ) : null}
          <PhoneActionButton
            accessibilityLabel={`Chamar unidade ${unit.label}`}
            disabled={activeCallTarget !== null}
            muted={!unit.canReceiveCalls || isBusy}
            testID={unit.canReceiveCalls ? 'gatehouse-call-unit' : 'gatehouse-unit-unavailable'}
            onPress={() =>
              isBusy
                ? showInfo('Unidade em atendimento', 'Esta unidade esta em atendimento. Tente novamente em alguns minutos.')
                : unit.canReceiveCalls
                ? handleGatehouseToUnitCall(
                    unit.id,
                    unit.label,
                    activeDeviceId,
                    user,
                    unitLabels,
                    setHistory,
                    setPendingCalls,
                    setFeedback,
                    setActiveCallTarget,
                  )
                : showInfo('Unidade bloqueada', 'Esta unidade nao recebe chamadas no momento.')
            }
          />
        </View>
      </View>
      <Text style={[styles.itemHelp, !isBusy && unit.canReceiveCalls ? styles.statusOk : styles.statusBlocked]}>
        {activeCallTarget === unit.id ? 'Chamando...' : helper}
      </Text>
    </Card>
  );
}

async function refreshMessageBadges(setMessageThreads: (threads: MessageThread[]) => void) {
  try {
    setMessageThreads(await listMyMessageThreads());
  } catch {
    // Badge refresh is auxiliary and cannot disturb the interfone screen.
  }
}

function getGatehouseUnitUnreadCount(threads: MessageThread[], unitId: string) {
  return threads
    .filter((thread) => thread.thread_type === 'PORTARIA_UNIT' && thread.unit_a_id === unitId)
    .reduce((total, thread) => total + thread.unread_count, 0);
}

function CallHistory({ calls, onCancel }: { calls: CallRecord[]; onCancel: (callId: string) => void }) {
  return (
    <View style={styles.list}>
      {calls.length === 0 ? (
        <Card>
          <Text style={styles.itemMeta}>Nenhuma chamada encontrada para esta portaria.</Text>
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
  );
}

async function refreshGatehouseData(
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
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

async function handleGatehouseToUnitCall(
  unitId: string,
  unitLabel: string,
  activeDeviceId: string | null,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback(`Chamando ${unitLabel}...`);
  setActiveCallTarget(unitId);
  void logCallDiagnostic({ action: 'gatehouse_call_unit', result: 'STARTED', targetUnitId: unitId, user });

  try {
    const call = await startGatehouseToUnitCall(unitId, user);
    void logCallDiagnostic({
      action: 'gatehouse_call_unit',
      callId: call.id,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status, target_label: unitLabel },
      result: 'SUCCESS',
      targetUnitId: unitId,
      user,
    });
    setHistory([
      buildOptimisticCall({
        id: call.id,
        originPortariaDeviceId: activeDeviceId,
        status: 'RINGING',
        toLabel: unitLabel,
        unitId,
      }),
    ]);
    setFeedback(null);
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
  } catch (err) {
    const message = getErrorMessage(err);
    void logCallDiagnostic({
      action: 'gatehouse_call_unit',
      durationMs: Date.now() - startedAt,
      errorMessage: message,
      metadata: { target_label: unitLabel },
      result: 'ERROR',
      targetUnitId: unitId,
      user,
    });
    setFeedback(null);
    showInfo(`Nao foi possivel chamar ${unitLabel}`, message);
  } finally {
    setActiveCallTarget(null);
  }
}

async function handleAnswerGatehouseCall(
  callId: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Atendendo chamada...');
  void logCallDiagnostic({ action: 'gatehouse_answer_call', callId, result: 'STARTED', user });

  try {
    const call = await answerGatehouseCall(callId);
    void logCallDiagnostic({
      action: 'gatehouse_answer_call',
      callId,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      user,
    });
    setFeedback(`Chamada atendida. Status: ${call.status}.`);
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    const message = getErrorMessage(err);
    void logCallDiagnostic({ action: 'gatehouse_answer_call', callId, durationMs: Date.now() - startedAt, errorMessage: message, result: 'ERROR', user });
    setFeedback(null);
    showInfo('Nao foi possivel atender', message);
  }
}

async function handleCancelCall(
  callId: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Cancelando chamada...');
  void logCallDiagnostic({ action: 'gatehouse_cancel_call', callId, result: 'STARTED', user });

  try {
    const call = await cancelCall(callId);
    void logCallDiagnostic({
      action: 'gatehouse_cancel_call',
      callId,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      user,
    });
    setFeedback('Chamada cancelada.');
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    const message = getCallActionErrorMessage(err);
    void logCallDiagnostic({ action: 'gatehouse_cancel_call', callId, durationMs: Date.now() - startedAt, errorMessage: message, result: 'ERROR', user });
    reportUnexpectedCallError(err, user, 'gatehouse_cancel_call', callId);
    setFeedback(null);
    showInfo('Nao foi possivel cancelar', message);
  }
}

async function handleEndCall(
  callId: string,
  user: AuthenticatedUser,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  const startedAt = Date.now();
  setFeedback('Encerrando chamada...');
  void logCallDiagnostic({ action: 'gatehouse_end_call', callId, result: 'STARTED', user });

  try {
    const call = await endCall(callId);
    void logCallDiagnostic({
      action: 'gatehouse_end_call',
      callId,
      durationMs: Date.now() - startedAt,
      metadata: { backend_status: call.status },
      result: 'SUCCESS',
      user,
    });
    setFeedback('Chamada encerrada.');
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    const message = getCallActionErrorMessage(err);
    void logCallDiagnostic({ action: 'gatehouse_end_call', callId, durationMs: Date.now() - startedAt, errorMessage: message, result: 'ERROR', user });
    reportUnexpectedCallError(err, user, 'gatehouse_end_call', callId);
    setFeedback(null);
    showInfo('Nao foi possivel encerrar', message);
  }
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

function buildOptimisticCall({
  id,
  originPortariaDeviceId,
  status,
  toLabel,
  unitId,
}: {
  id: string;
  originPortariaDeviceId: string | null;
  status: CallRecord['status'];
  toLabel: string;
  unitId: string;
}): CallRecord {
  return {
    direction: 'gatehouse_to_unit',
    endedAt: null,
    fromLabel: 'Portaria',
    id,
    originPortariaDeviceId,
    originType: 'PORTARIA',
    originUnitId: null,
    startedAt: formatDateTime(new Date().toISOString()),
    status,
    targetPortariaDeviceId: null,
    targetType: 'UNIT',
    toLabel,
    unitId,
  };
}

function showInfo(title: string, message: string) {
  if (typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message, [{ text: 'OK' }]);
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
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
  options?: { silent?: boolean },
) {
  try {
    const calls = await getMyPendingCalls();
    setPendingCalls(calls.portaria_calls ?? []);
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
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
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  statChip: {
    backgroundColor: '#eef6ff',
    borderRadius: theme.radius.sm,
    minWidth: 92,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  list: {
    gap: theme.spacing.md,
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  deviceHeader: {
    alignItems: 'center',
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
    fontSize: 13,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '900',
  },
  statusOk: {
    color: theme.colors.success,
  },
  statusBlocked: {
    color: theme.colors.danger,
  },
  unitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  cardAction: {
    marginTop: theme.spacing.md,
  },
  feedback: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  actionButtons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});
