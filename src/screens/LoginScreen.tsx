import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { reportAppError } from '../services/error-reporting';
import { hasSupabaseConfig } from '../services/supabase';
import { theme } from '../theme/theme';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

const confiaLogo = require('../../assets/confia-system-logo-preview.png');

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      const message = getLoginErrorMessage(err);
      setError(message);

      if (shouldReportLoginError(err)) {
        void reportAppError(err, {
          metadata: { email: email.trim(), stage: 'login' },
          source: 'login-error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={[styles.container, isKeyboardVisible && styles.containerWithKeyboard]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <Image accessibilityLabel="Confia System" resizeMode="contain" source={confiaLogo} style={styles.logo} />
            <Text style={styles.title}>Confia System</Text>
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
                returnKeyType="next"
                style={styles.input}
                textContentType="username"
                value={email}
              />
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
                placeholder="Senha"
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              {isSubmitting ? <ActivityIndicator color={theme.colors.primary} /> : <PrimaryButton label="Entrar" onPress={handleSubmit} />}
            </View>
          </Card>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Nao foi possivel entrar.';

  if (/invalid login credentials|invalid credentials|email not confirmed/i.test(message)) {
    return 'E-mail ou senha invalidos.';
  }

  if (/failed to fetch|network request failed|timeout/i.test(message)) {
    return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
  }

  return 'Nao foi possivel entrar agora. O erro foi registrado para analise tecnica.';
}

function shouldReportLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return !/invalid login credentials|invalid credentials|email not confirmed/i.test(message);
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
    padding: theme.spacing.lg,
  },
  containerWithKeyboard: {
    justifyContent: 'flex-start',
    paddingBottom: 280,
    paddingTop: theme.spacing.lg,
  },
  logo: {
    height: 66,
    width: 220,
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
