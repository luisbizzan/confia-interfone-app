import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { demoCalls, demoUnits } from '../data/demo-data';
import { startGatehouseToUnitCall } from '../services/calls';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, UnitDirectoryItem, UserContext } from '../types/domain';

type GatehouseHomeScreenProps = {
  context: UserContext;
  directoryUnits: UnitDirectoryItem[];
  user: AuthenticatedUser;
};

export function GatehouseHomeScreen({ context, directoryUnits, user }: GatehouseHomeScreenProps) {
  const ringingCalls = demoCalls.filter((call) => call.status === 'ringing').length;
  const activeDevice = context.portaria_devices.find((device) => device.is_active);
  const units = directoryUnits.length > 0 ? directoryUnits : demoUnits;

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
            <GatehouseUnitCard key={unit.id} unit={unit} />
          ))}
        </View>
      </View>
    </View>
  );
}

function GatehouseUnitCard({ unit }: { unit: UnitDirectoryItem }) {
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
          label="Chamar unidade"
          tone={unit.canReceiveCalls ? 'primary' : 'neutral'}
          onPress={() =>
            unit.canReceiveCalls
              ? handleGatehouseToUnitCall(unit.id, unit.label)
              : Alert.alert('Unidade bloqueada', 'Esta unidade nao recebe chamadas no momento.')
          }
        />
      </View>
    </Card>
  );
}

async function handleGatehouseToUnitCall(unitId: string, unitLabel: string) {
  try {
    const call = await startGatehouseToUnitCall(unitId);
    Alert.alert('Chamada iniciada', `${unitLabel} esta tocando. Status: ${call.status}.`);
  } catch (err) {
    Alert.alert('Nao foi possivel chamar', err instanceof Error ? err.message : 'Tente novamente.');
  }
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
});
