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
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { reportAppError } from '../services/error-reporting';
import { hasSupabaseConfig } from '../services/supabase';
import { theme } from '../theme/theme';

type LoginScreenProps = {
  isPasswordRecoveryMode?: boolean;
  onCompletePasswordReset: (password: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onPasswordRecoveryHandled: () => void;
  onRequestPasswordReset: (email: string) => Promise<void>;
};

const confiaLogo = require('../../assets/confia-system-logo-preview.png');

type ScreenMode = 'login' | 'request-reset' | 'set-new-password';

export function LoginScreen({
  isPasswordRecoveryMode = false,
  onCompletePasswordReset,
  onLogin,
  onPasswordRecoveryHandled,
  onRequestPasswordReset,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [mode, setMode] = useState<ScreenMode>(isPasswordRecoveryMode ? 'set-new-password' : 'login');
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isPasswordRecoveryMode) {
      setMode('set-new-password');
      setError(null);
      setSuccess(null);
    }
  }, [isPasswordRecoveryMode]);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (mode === 'request-reset') {
      await handleRequestReset();
      return;
    }

    if (mode === 'set-new-password') {
      await handleCompleteReset();
      return;
    }

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

  async function handleRequestReset() {
    if (!email.trim()) {
      setError('Informe o e-mail cadastrado.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRequestPasswordReset(email);
      setSuccess('Enviamos as instrucoes para o e-mail informado. Abra o link recebido para criar uma nova senha.');
    } catch (err) {
      setError(getPasswordResetErrorMessage(err));
      void reportAppError(err, {
        metadata: { email: email.trim(), stage: 'password-reset-request' },
        source: 'password-reset-request-error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteReset() {
    setError(null);
    setSuccess(null);

    const validationError = validateNewPassword(newPassword, passwordConfirmation);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompletePasswordReset(newPassword);
      setNewPassword('');
      setPasswordConfirmation('');
      setPassword('');
      setMode('login');
      onPasswordRecoveryHandled();
      setSuccess('Senha alterada com sucesso. Entre novamente com sua nova senha.');
    } catch (err) {
      setError(getPasswordResetErrorMessage(err));
      void reportAppError(err, {
        metadata: { stage: 'password-reset-complete' },
        source: 'password-reset-complete-error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function goToLogin() {
    setMode('login');
    setError(null);
    setSuccess(null);
    onPasswordRecoveryHandled();
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
            <Text style={styles.description}>{getModeDescription(mode)}</Text>

            {!hasSupabaseConfig ? (
              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY para ativar o login real.
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
              {mode === 'set-new-password' ? (
                <>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setNewPassword}
                    placeholder="Nova senha"
                    returnKeyType="next"
                    secureTextEntry
                    style={styles.input}
                    textContentType="newPassword"
                    value={newPassword}
                  />
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setPasswordConfirmation}
                    onSubmitEditing={handleSubmit}
                    placeholder="Confirmar nova senha"
                    returnKeyType="done"
                    secureTextEntry
                    style={styles.input}
                    textContentType="newPassword"
                    value={passwordConfirmation}
                  />
                  <PasswordRules password={newPassword} />
                </>
              ) : (
                <>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    onSubmitEditing={mode === 'request-reset' ? handleSubmit : undefined}
                    placeholder="E-mail"
                    returnKeyType={mode === 'request-reset' ? 'done' : 'next'}
                    style={styles.input}
                    textContentType="username"
                    value={email}
                  />
                  {mode === 'login' ? (
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
                  ) : null}
                </>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <View style={styles.actions}>
              {isSubmitting ? <ActivityIndicator color={theme.colors.primary} /> : <PrimaryButton label={getPrimaryActionLabel(mode)} onPress={handleSubmit} />}
              {mode === 'login' ? (
                <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => setMode('request-reset')}>
                  <Text style={styles.secondaryButtonText}>Esqueci minha senha</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={goToLogin}>
                  <Text style={styles.secondaryButtonText}>Voltar para login</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function PasswordRules({ password }: { password: string }) {
  const checks = getPasswordChecks(password);

  return (
    <View style={styles.passwordRules}>
      {checks.map((check) => (
        <Text key={check.label} style={[styles.passwordRule, check.ok && styles.passwordRuleOk]}>
          {check.ok ? 'OK' : '--'} {check.label}
        </Text>
      ))}
    </View>
  );
}

function getModeDescription(mode: ScreenMode) {
  if (mode === 'request-reset') {
    return 'Informe o e-mail cadastrado. Enviaremos um link seguro para criar uma nova senha.';
  }

  if (mode === 'set-new-password') {
    return 'Crie uma nova senha para sua conta. Depois disso, entre novamente no aplicativo.';
  }

  return 'Entre com o usuario criado no backoffice para morador ou portaria.';
}

function getPrimaryActionLabel(mode: ScreenMode) {
  if (mode === 'request-reset') {
    return 'Enviar instrucao por e-mail';
  }

  if (mode === 'set-new-password') {
    return 'Salvar nova senha';
  }

  return 'Entrar';
}

function getPasswordChecks(password: string) {
  return [
    { label: '8 ou mais caracteres', ok: password.length >= 8 },
    { label: 'letra maiuscula', ok: /[A-Z]/.test(password) },
    { label: 'letra minuscula', ok: /[a-z]/.test(password) },
    { label: 'numero', ok: /\d/.test(password) },
    { label: 'caractere especial', ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

function validateNewPassword(password: string, confirmation: string) {
  if (!password || !confirmation) {
    return 'Informe e confirme a nova senha.';
  }

  if (password !== confirmation) {
    return 'As senhas informadas nao conferem.';
  }

  if (getPasswordChecks(password).some((check) => !check.ok)) {
    return 'A nova senha ainda nao atende todos os requisitos de seguranca.';
  }

  return null;
}

function getPasswordResetErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Nao foi possivel recuperar a senha.';

  if (/failed to fetch|network request failed|timeout/i.test(message)) {
    return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
  }

  if (/expired|invalid|token/i.test(message)) {
    return 'O link de recuperacao expirou ou nao e valido. Solicite um novo e-mail.';
  }

  return 'Nao foi possivel concluir a recuperacao agora. O erro foi registrado para analise tecnica.';
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
  passwordRule: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  passwordRuleOk: {
    color: theme.colors.success,
  },
  passwordRules: {
    backgroundColor: '#eef5ff',
    borderColor: '#cfe1f8',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  success: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
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
