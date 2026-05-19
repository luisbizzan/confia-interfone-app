import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoUnits } from '../data/demo-data';
import { answerGatehouseCall, cancelCall, getMyCallHistory, getMyPendingCalls, startGatehouseToUnitCall } from '../services/calls';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, BackendCallRecord, CallRecord, PendingPortariaCall, UnitDirectoryItem, UserContext } from '../types/domain';

type GatehouseHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  user: AuthenticatedUser;
};

export function GatehouseHomeScreen({ context, directoryUnits, user }: GatehouseHomeScreenProps) {
  const activeDevice = context.portaria_devices.find((device) => device.is_active);
  const units = directoryUnits.length > 0 ? directoryUnits : demoUnits;
  const unitLabels = useMemo(() => new Map(units.map((unit) => [unit.id, unit.label])), [units]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [pendingCalls, setPendingCalls] = useState<PendingPortariaCall[]>([]);
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const ringingCalls = pendingCalls.length;

  useEffect(() => {
    refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback);
  }, [unitLabels]);

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.eyebrow}>Modo portaria</Text>
        <Text style={styles.title}>Central da portaria</Text>
        <Text style={styles.description}>
          {user.email} esta vinculado ao condominio e pode ligar para unidades autorizadas.
        </Text>
      </View>

      <View style={styles.stats}>
        <Card>
          <Text style={styles.statValue}>{units.length}</Text>
          <Text style={styles.statLabel}>Unidades</Text>
        </Card>
        <Card>
          <Text style={styles.statValue}>{ringingCalls}</Text>
          <Text style={styles.statLabel}>Tocando</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dispositivo</Text>
        <Card>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{activeDevice?.name ?? 'Portaria principal'}</Text>
              <Text style={styles.itemMeta}>Recebe chamadas: {activeDevice?.can_receive_calls === false ? 'Nao' : 'Sim'}</Text>
              <Text style={styles.itemMeta}>Liga para unidades: {activeDevice?.can_make_calls === false ? 'Nao' : 'Sim'}</Text>
            </View>
            <Text style={styles.badge}>{activeDevice ? 'Ativo' : 'Sem vinculo'}</Text>
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
              unit={unit}
            />
          ))}
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>

      <PendingCallsPanel
        calls={pendingCalls}
        onAnswer={(callId) => handleAnswerGatehouseCall(callId, unitLabels, setHistory, setPendingCalls, setFeedback)}
        unitLabels={unitLabels}
      />

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Historico recente</Text>
          <PrimaryButton label="Atualizar" tone="neutral" onPress={() => refreshGatehouseData(unitLabels, setHistory, setPendingCalls, setFeedback)} />
        </View>
        <CallHistory
          calls={history}
          onCancel={(callId) => handleCancelCall(callId, unitLabels, setHistory, setPendingCalls, setFeedback)}
        />
      </View>
    </View>
  );
}

function GatehouseUnitCard({
  activeCallTarget,
  setActiveCallTarget,
  setFeedback,
  unit,
}: {
  activeCallTarget: string | null;
  setActiveCallTarget: (target: string | null) => void;
  setFeedback: (message: string | null) => void;
  unit: UnitDirectoryItem;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{unit.label}</Text>
          <Text style={styles.itemMeta}>{unit.residents.join(', ')}</Text>
        </View>
        <Text style={[styles.statusText, unit.canReceiveCalls ? styles.statusOk : styles.statusBlocked]}>
          {unit.canReceiveCalls ? 'Disponivel' : 'Bloqueada'}
        </Text>
      </View>
      <View style={styles.cardAction}>
        <PrimaryButton
          disabled={!unit.canReceiveCalls || activeCallTarget !== null}
          label={activeCallTarget === unit.id ? 'Chamando...' : 'Chamar unidade'}
          tone={unit.canReceiveCalls ? 'primary' : 'neutral'}
          onPress={() =>
            unit.canReceiveCalls
              ? handleGatehouseToUnitCall(unit.id, unit.label, setFeedback, setActiveCallTarget)
              : Alert.alert('Unidade bloqueada', 'Esta unidade nao recebe chamadas no momento.')
          }
        />
      </View>
    </Card>
  );
}

function PendingCallsPanel({
  calls,
  onAnswer,
  unitLabels,
}: {
  calls: PendingPortariaCall[];
  onAnswer: (callId: string) => void;
  unitLabels: Map<string, string>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Chamadas recebidas</Text>
      <View style={styles.list}>
        {calls.length === 0 ? (
          <Card>
            <Text style={styles.itemMeta}>Nenhuma chamada tocando para a portaria.</Text>
          </Card>
        ) : (
          calls.map((call) => (
            <Card key={call.call_id}>
              <Text style={styles.itemTitle}>{unitLabels.get(call.origin_unit_id ?? call.unit_id) ?? 'Unidade'} para Portaria</Text>
              <Text style={styles.itemMeta}>Tocando desde {formatDateTime(call.started_at)}</Text>
              <View style={styles.cardAction}>
                <PrimaryButton label="Atender" onPress={() => onAnswer(call.call_id)} />
              </View>
            </Card>
          ))
        )}
      </View>
    </View>
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
) {
  await Promise.all([refreshHistory(unitLabels, setHistory, setFeedback), refreshPendingCalls(setPendingCalls, setFeedback)]);
}

async function handleGatehouseToUnitCall(
  unitId: string,
  unitLabel: string,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  setFeedback(`Chamando ${unitLabel}...`);
  setActiveCallTarget(unitId);

  try {
    const call = await startGatehouseToUnitCall(unitId);
    setFeedback(`Chamada iniciada para ${unitLabel}. Status: ${call.status}.`);
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

async function refreshHistory(
  unitLabels: Map<string, string>,
  setHistory: (history: CallRecord[]) => void,
  setFeedback: (message: string | null) => void,
) {
  try {
    const calls = await getMyCallHistory();
    setHistory(calls.map((call) => mapBackendCall(call, unitLabels)));
  } catch (err) {
    setFeedback(`Nao foi possivel carregar o historico: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  }
}

async function refreshPendingCalls(setPendingCalls: (calls: PendingPortariaCall[]) => void, setFeedback: (message: string | null) => void) {
  try {
    const calls = await getMyPendingCalls();
    setPendingCalls(calls.portaria_calls ?? []);
  } catch (err) {
    setFeedback(`Nao foi possivel carregar chamadas recebidas: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
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
