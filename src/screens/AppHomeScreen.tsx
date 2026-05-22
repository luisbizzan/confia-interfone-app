import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '../components/Card';
import { theme } from '../theme/theme';
import type { AuthenticatedUser, UserContext } from '../types/domain';

type AppHomeScreenProps = {
  context: UserContext;
  onOpenIntercom: () => void;
  user: AuthenticatedUser;
};

export function AppHomeScreen({ context, onOpenIntercom, user }: AppHomeScreenProps) {
  const intercomEnabled = context.features?.INTERCOM !== false;

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.eyebrow}>Inicio</Text>
        <Text style={styles.title}>Ola, {displayName(user)}</Text>
        <Text style={styles.description}>Escolha o que deseja usar no Confia.</Text>
      </View>

      <View style={styles.actions}>
        {intercomEnabled ? (
          <ShortcutCard
            description={user.profile === 'gatehouse' ? 'Fale com unidades autorizadas.' : 'Ligue para a portaria ou outras unidades.'}
            icon="call"
            onPress={onOpenIntercom}
            title="Interfone"
          />
        ) : (
          <Card>
            <View style={styles.shortcut}>
              <View style={[styles.icon, styles.iconDisabled]}>
                <MaterialIcons color={theme.colors.muted} name="call" size={26} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.shortcutTitle}>Interfone</Text>
                <Text style={styles.shortcutDescription}>Recurso nao habilitado para este condominio.</Text>
              </View>
            </View>
          </Card>
        )}
      </View>
    </View>
  );
}

function ShortcutCard({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: 'call';
  onPress: () => void;
  title: string;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress}>
      <Card>
        <View style={styles.shortcut}>
          <View style={styles.icon}>
            <MaterialIcons color="#ffffff" name={icon} size={28} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.shortcutTitle}>{title}</Text>
            <Text style={styles.shortcutDescription}>{description}</Text>
          </View>
          <MaterialIcons color={theme.colors.primary} name="chevron-right" size={28} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function displayName(user: AuthenticatedUser) {
  if (user.profile === 'gatehouse') {
    return 'portaria';
  }

  return user.name.includes('@') ? 'morador' : user.name;
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
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
  actions: {
    gap: theme.spacing.md,
  },
  shortcut: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  iconDisabled: {
    backgroundColor: '#e5e7eb',
  },
  shortcutTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  shortcutDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
