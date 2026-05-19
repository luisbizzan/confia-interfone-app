import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { hasSupabaseConfig } from '../services/supabase';
import { theme } from '../theme/theme';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.brand}>Confia</Text>
        <Text style={styles.title}>Interfone Digital</Text>
        <Text style={styles.description}>Entre com o usuario criado no backoffice para morador ou portaria.</Text>

        {!hasSupabaseConfig ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY para ativar o login real.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="E-mail"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Senha"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          {isSubmitting ? <ActivityIndicator color={theme.colors.primary} /> : <PrimaryButton label="Entrar" onPress={handleSubmit} />}
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
  form: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  input: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  warning: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  warningText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
  },
});
