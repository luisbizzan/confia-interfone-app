import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { theme } from '../theme/theme';
import type { AppProfile } from '../types/domain';

type LoginScreenProps = {
  onSelectProfile: (profile: AppProfile) => void;
};

export function LoginScreen({ onSelectProfile }: LoginScreenProps) {
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.brand}>Confia</Text>
        <Text style={styles.title}>Interfone Digital</Text>
        <Text style={styles.description}>
          Base da Fase 1 do app. O login real sera conectado ao Supabase Auth, mantendo perfis e permissoes validados no backend.
        </Text>

        <View style={styles.actions}>
          <PrimaryButton label="Entrar como morador" onPress={() => onSelectProfile('resident')} />
          <PrimaryButton label="Entrar como portaria" tone="neutral" onPress={() => onSelectProfile('gatehouse')} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  brand: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: theme.spacing.xs,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
});
