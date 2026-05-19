import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoCalls, demoUnits } from '../data/demo-data';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, CallRecord, UnitDirectoryItem, UserContext } from '../types/domain';

type ResidentHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  user: AuthenticatedUser;
};

export function ResidentHomeScreen({ context, directoryUnits, user }: ResidentHomeScreenProps) {
  const myUnits = context.unit_members.map((member) => formatUnitLabel(member.unit));
  const units = directoryUnits.length > 0 ? directoryUnits : myUnits.length > 0 ? buildUnitsFromContext(context) : demoUnits;

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
          <PrimaryButton label="Chamar portaria" onPress={() => showCallDraft('Portaria')} />
          <PrimaryButton label="Ver historico" tone="neutral" onPress={() => showInfo('Historico completo entra nesta fase.')} />
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unidades do condominio</Text>
        <View style={styles.list}>
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
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

function UnitCard({ unit }: { unit: UnitDirectoryItem }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{unit.label}</Text>
          <Text style={styles.itemMeta}>{unit.type}</Text>
          <Text style={styles.itemMeta}>{unit.residents.join(', ')}</Text>
        </View>
        <Text style={[styles.badge, unit.canReceiveCalls ? styles.badgeSuccess : styles.badgeMuted]}>
          {unit.canReceiveCalls ? 'Recebe' : 'Bloqueada'}
        </Text>
      </View>
      <View style={styles.cardAction}>
        <PrimaryButton
          label="Chamar unidade"
          tone={unit.canReceiveCalls ? 'primary' : 'neutral'}
          onPress={() => (unit.canReceiveCalls ? showCallDraft(unit.label) : showInfo('Esta unidade nao recebe chamadas no momento.'))}
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

function showCallDraft(target: string) {
  Alert.alert('Chamada preparada', `Na integracao real, o app criara uma chamada para ${target}.`);
}

function showInfo(message: string) {
  Alert.alert('Confia', message);
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
