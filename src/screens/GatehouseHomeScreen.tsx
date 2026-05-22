import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ActiveCallExperience, IncomingCallExperience, OutgoingCallExperience } from '../components/CallExperience';
import { Card } from '../components/Card';
import { PhoneActionButton } from '../components/PhoneActionButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoUnits } from '../data/demo-data';
import { answerGatehouseCall, cancelCall, endCall, getMyCallHistory, getMyPendingCalls, startGatehouseToUnitCall } from '../services/calls';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, BackendCallRecord, CallRecord, PendingPortariaCall, UnitDirectoryItem, UserContext } from '../types/domain';

type GatehouseHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  user: AuthenticatedUser;
};

const CALL_REFRESH_INTERVAL_MS = 5000;

export function GatehouseHomeScreen({ context, directoryUnits, user }: GatehouseHomeScreenProps) {
  const activeDevice = context.portaria_devices.find((device) => device.is_active);
  const units = directoryUnits.length > 0 ? directoryUnits : demoUnits;
  const unitLabels = useMemo(() => new Map(units.map((unit) => [unit.id, unit.label])), [units]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [pendingCalls, setPendingCalls] = useState<PendingPortariaCall[]>([]);
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const ringingCalls = pendingCalls.length;

  useEffect(() => {
    refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);

    const interval = setInterval(() => {
      refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
    }, CALL_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [unitLabels]);

  const activeCall = history.find((call) => call.status === 'ANSWERED' && !call.endedAt);
  const outgoingCall = history.find((call) => call.status === 'RINGING' && !call.endedAt);
  const incomingCall = pendingCalls[0];

  if (incomingCall) {
    return (
      <IncomingCallExperience
        callerLabel={`${unitLabels.get(incomingCall.origin_unit_id ?? incomingCall.unit_id) ?? 'Unidade'} para Portaria`}
        onAnswer={() => handleAnswerGatehouseCall(incomingCall.call_id, unitLabels, setHistory, setPendingCalls, setFeedback)}
        onRefresh={() => refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback)}
        startedAt={formatDateTime(incomingCall.started_at)}
        targetLabel="Portaria"
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
        onRefresh={() => refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback)}
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
              key={unit.id}
              setActiveCallTarget={setActiveCallTarget}
              setFeedback={setFeedback}
              setHistory={setHistory}
              setPendingCalls={setPendingCalls}
              unit={unit}
              unitLabels={unitLabels}
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
            calls={history}
            onCancel={(callId) => handleCancelCall(callId, unitLabels, setHistory, setPendingCalls, setFeedback)}
          />
        ) : null}
      </View>
    </View>
  );
}

function GatehouseUnitCard({
  activeCallTarget,
  setActiveCallTarget,
  setFeedback,
  setHistory,
  setPendingCalls,
  unit,
  unitLabels,
}: {
  activeCallTarget: string | null;
  setActiveCallTarget: (target: string | null) => void;
  setFeedback: (message: string | null) => void;
  setHistory: (history: CallRecord[]) => void;
  setPendingCalls: (calls: PendingPortariaCall[]) => void;
  unit: UnitDirectoryItem;
  unitLabels: Map<string, string>;
}) {
  return (
    <Card>
      <View style={styles.unitRow}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{unit.label}</Text>
          <Text style={styles.itemMeta}>{unit.residents.join(', ')}</Text>
        </View>
        <PhoneActionButton
          accessibilityLabel={`Chamar unidade ${unit.label}`}
          disabled={!unit.canReceiveCalls || activeCallTarget !== null}
          testID={unit.canReceiveCalls ? 'gatehouse-call-unit' : 'gatehouse-unit-unavailable'}
          onPress={() =>
            unit.canReceiveCalls
              ? handleGatehouseToUnitCall(
                  unit.id,
                  unit.label,
                  unitLabels,
                  setHistory,
                  setPendingCalls,
                  setFeedback,
                  setActiveCallTarget,
                )
              : Alert.alert('Unidade bloqueada', 'Esta unidade nao recebe chamadas no momento.')
          }
        />
      </View>
      <Text style={[styles.itemHelp, unit.canReceiveCalls ? styles.statusOk : styles.statusBlocked]}>
        {activeCallTarget === unit.id ? 'Chamando...' : unit.canReceiveCalls ? 'Disponivel' : 'Bloqueada'}
      </Text>
    </Card>
  );
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
) {
  await Promise.all([
    refreshHistory(unitLabels, setHistory, setFeedback, options),
    refreshPendingCalls(setPendingCalls, setFeedback, options),
  ]);
}

async function handleGatehouseToUnitCall(
  unitId: string,
  unitLabel: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  setFeedback(`Chamando ${unitLabel}...`);
  setActiveCallTarget(unitId);

  try {
    const call = await startGatehouseToUnitCall(unitId);
    setFeedback(`Chamada iniciada para ${unitLabel}. Status: ${call.status}.`);
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback, { silent: true });
  } catch (err) {
    setFeedback(`Nao foi possivel chamar ${unitLabel}: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  } finally {
    setActiveCallTarget(null);
  }
}

async function handleAnswerGatehouseCall(
  callId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  setFeedback('Atendendo chamada...');

  try {
    const call = await answerGatehouseCall(callId);
    setFeedback(`Chamada atendida. Status: ${call.status}.`);
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    setFeedback(`Nao foi possivel atender: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
}

async function handleCancelCall(
  callId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  setFeedback('Cancelando chamada...');

  try {
    const call = await cancelCall(callId);
    setFeedback(`Chamada cancelada. Status: ${call.status}.`);
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    setFeedback(`Nao foi possivel cancelar: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
}

async function handleEndCall(
  callId: string,
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setPendingCalls: (calls: PendingPortariaCall[]) => void,
  setFeedback: (message: string | null) => void,
) {
  setFeedback('Encerrando chamada...');

  try {
    const call = await endCall(callId);
    setFeedback(`Chamada encerrada. Status: ${call.status}.`);
    await refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  } catch (err) {
    setFeedback(`Nao foi possivel encerrar: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
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
    toLabel: call.target_type === 'PORTARIA' ? 'Portaria' : targetUnit,
    status: call.status,
    startedAt: formatDateTime(call.started_at),
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
});
