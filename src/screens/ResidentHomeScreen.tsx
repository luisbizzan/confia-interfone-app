import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoCalls, demoUnits } from '../data/demo-data';
import { startResidentToGatehouseCall, startResidentToUnitCall } from '../services/calls';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, CallRecord, UnitDirectoryItem, UserContext } from '../types/domain';

type ResidentHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  user: AuthenticatedUser;
};

export function ResidentHomeScreen({ context, directoryUnits, user }: ResidentHomeScreenProps) {
  const myUnits = context.unit_members.map((member) => formatUnitLabel(member.unit));
  const originUnit = context.unit_members.find((member) => member.active_for_calls && member.can_make_calls);
  const units = directoryUnits.length > 0 ? directoryUnits : myUnits.length > 0 ? buildUnitsFromContext(context) : demoUnits;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.eyebrow}>Modo morador</Text>
        <Text style={styles.title}>Ola, {user.name}</Text>
        <Text style={styles.description}>
          {myUnits.length > 0 ? `Unidade vinculada: ${myUnits.join(', ')}` : 'Ligue para a portaria ou para outra unidade do mesmo condominio.'}
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Acoes rapidas</Text>
        <View style={styles.actions}>
          <PrimaryButton
            disabled={activeCallTarget !== null}
            label="Chamar portaria"
            onPress={() => {
              if (!originUnit?.unit_id) {
                setFeedback('Nenhuma unidade liberada para iniciar chamadas.');
                return;
              }

              handleResidentToGatehouseCall(originUnit.unit_id, setFeedback, setActiveCallTarget);
            }}
          />
          <PrimaryButton label="Ver historico" tone="neutral" onPress={() => showInfo('Historico completo entra nesta fase.')} />
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unidades do condominio</Text>
        <View style={styles.list}>
          {units.map((unit) => (
            <UnitCard
              activeCallTarget={activeCallTarget}
              key={unit.id}
              originUnitId={originUnit?.unit_id ?? null}
              setActiveCallTarget={setActiveCallTarget}
              setFeedback={setFeedback}
              unit={unit}
            />
          ))}
        </View>
      </View>

      <CallHistory calls={demoCalls} />
    </View>
  );
}

function buildUnitsFromContext(context: UserContext): UnitDirectoryItem[] {
  return context.unit_members.map((member) => ({
    id: member.unit.id,
    label: formatUnitLabel(member.unit),
    type: member.unit.type === 'HOUSE' ? 'Casa' : 'Apartamento',
    residents: [member.member_type === 'RESIDENT' ? 'Morador autorizado' : member.member_type],
    canReceiveCalls: member.can_receive_calls,
    canMakeCalls: member.can_make_calls,
  }));
}

function formatUnitLabel(unit: UserContext['unit_members'][number]['unit']) {
  return [unit.block, unit.number].filter(Boolean).join(' - ');
}

function UnitCard({
  activeCallTarget,
  originUnitId,
  setActiveCallTarget,
  setFeedback,
  unit,
}: {
  activeCallTarget: string | null;
  originUnitId: string | null;
  setActiveCallTarget: (target: string | null) => void;
  setFeedback: (message: string | null) => void;
  unit: UnitDirectoryItem;
}) {
  const isOwnUnit = originUnitId === unit.id;
  const canCallUnit = Boolean(unit.canReceiveCalls && originUnitId && !isOwnUnit);
  const helper = isOwnUnit
    ? 'Esta e a sua propria unidade. Crie uma segunda unidade com morador para testar chamada entre casas.'
    : unit.canReceiveCalls
      ? 'Toque para iniciar uma chamada real para esta unidade.'
      : 'Esta unidade nao recebe chamadas no momento.';

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{unit.label}</Text>
          <Text style={styles.itemMeta}>{unit.type}</Text>
          <Text style={styles.itemMeta}>{unit.residents.join(', ')}</Text>
          <Text style={styles.itemHelp}>{helper}</Text>
        </View>
        <Text style={[styles.badge, unit.canReceiveCalls ? styles.badgeSuccess : styles.badgeMuted]}>
          {unit.canReceiveCalls ? 'Recebe' : 'Bloqueada'}
        </Text>
      </View>
      <View style={styles.cardAction}>
        <PrimaryButton
          disabled={!canCallUnit || activeCallTarget !== null}
          label={isOwnUnit ? 'Sua unidade' : activeCallTarget === unit.id ? 'Chamando...' : 'Chamar unidade'}
          tone={canCallUnit ? 'primary' : 'neutral'}
          onPress={() => {
            if (!originUnitId || !canCallUnit) {
              setFeedback(helper);
              return;
            }

            handleResidentToUnitCall(originUnitId, unit.id, unit.label, setFeedback, setActiveCallTarget);
          }}
        />
      </View>
    </Card>
  );
}

function CallHistory({ calls }: { calls: CallRecord[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Historico recente</Text>
      <View style={styles.list}>
        {calls.map((call) => (
          <Card key={call.id}>
            <Text style={styles.itemTitle}>
              {call.fromLabel} para {call.toLabel}
            </Text>
            <Text style={styles.itemMeta}>
              {callStatusLabel(call.status)} - {call.startedAt}
            </Text>
          </Card>
        ))}
      </View>
    </View>
  );
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
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  setFeedback('Chamando portaria...');
  setActiveCallTarget('portaria');

  try {
    const call = await startResidentToGatehouseCall(unitId);
    setFeedback(`Chamada iniciada para a portaria. Status: ${call.status}.`);
  } catch (err) {
    setFeedback(`Nao foi possivel chamar a portaria: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  } finally {
    setActiveCallTarget(null);
  }
}

async function handleResidentToUnitCall(
  originUnitId: string,
  targetUnitId: string,
  targetLabel: string,
  setFeedback: (message: string | null) => void,
  setActiveCallTarget: (target: string | null) => void,
) {
  setFeedback(`Chamando ${targetLabel}...`);
  setActiveCallTarget(targetUnitId);

  try {
    const call = await startResidentToUnitCall(originUnitId, targetUnitId);
    setFeedback(`Chamada iniciada para ${targetLabel}. Status: ${call.status}.`);
  } catch (err) {
    setFeedback(`Nao foi possivel chamar ${targetLabel}: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
  } finally {
    setActiveCallTarget(null);
  }
}

function callStatusLabel(status: CallRecord['status']) {
  const labels = {
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
  feedback: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginTop: theme.spacing.md,
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
