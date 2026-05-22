import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppHomeScreen } from './src/screens/AppHomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ResidentHomeScreen } from './src/screens/ResidentHomeScreen';
import { GatehouseHomeScreen } from './src/screens/GatehouseHomeScreen';
import { loadCurrentAuthState, signInWithEmail, signOut, type LoadedAuthState } from './src/services/auth';
import { clearErrorReportingContext, registerGlobalErrorHandlers, reportAppError, setErrorReportingContext } from './src/services/error-reporting';
import { theme } from './src/theme/theme';
import type { AuthenticatedUser, UserContext } from './src/types/domain';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

function AppContent() {
  const [authState, setAuthState] = useState<LoadedAuthState>({ status: 'unauthenticated' });
  const [isBooting, setIsBooting] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'intercom' | 'settings'>('home');

  useEffect(() => {
    registerGlobalErrorHandlers();
  }, []);

  useEffect(() => {
    if (authState.status === 'authenticated') {
      setErrorReportingContext({
        route: activeView,
        user: authState.user,
      });
      return;
    }

    clearErrorReportingContext();
  }, [activeView, authState]);

  useEffect(() => {
    let mounted = true;

    loadCurrentAuthState()
      .then((state) => {
        if (mounted) {
          setAuthState(state);
        }
      })
      .catch((error) => {
        void reportAppError(error, { source: 'auth-bootstrap' });
        if (mounted) {
          setAuthState({ status: 'unauthenticated' });
        }
      })
      .finally(() => {
        if (mounted) {
          setIsBooting(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(email: string, password: string) {
    const state = await signInWithEmail(email, password);
    setAuthState(state);
    setActiveView('home');
  }

  async function handleLogout() {
    await signOut();
    setAuthState({ status: 'unauthenticated' });
    setActiveView('home');
  }

  if (isBooting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando sessao...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (authState.status === 'unauthenticated') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  const { user, context, units } = authState;
  const intercomEnabled = context.features?.INTERCOM !== false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Confia</Text>
          <Text style={styles.subtitle}>{user.condominiumName}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeView === 'home' ? (
          <AppHomeScreen context={context} onOpenIntercom={() => setActiveView('intercom')} user={user} />
        ) : null}
        {activeView === 'settings' ? <SettingsView context={context} user={user} /> : null}
        {activeView === 'intercom' && intercomEnabled && user.profile === 'resident' ? (
          <ResidentHomeScreen context={context} directoryUnits={units} user={user} />
        ) : null}
        {activeView === 'intercom' && intercomEnabled && user.profile === 'gatehouse' ? (
          <GatehouseHomeScreen context={context} directoryUnits={units} user={user} />
        ) : null}
        {activeView === 'intercom' && !intercomEnabled ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableTitle}>Interfone indisponivel</Text>
            <Text style={styles.unavailableText}>Este recurso nao esta habilitado para o condominio.</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <NavigationButton active={activeView === 'home'} icon="home" label="Inicio" onPress={() => setActiveView('home')} />
        {intercomEnabled ? (
          <NavigationButton
            active={activeView === 'intercom'}
            icon="call"
            label="Interfone"
            onPress={() => setActiveView('intercom')}
          />
        ) : null}
        <NavigationButton
          active={activeView === 'settings'}
          icon="settings"
          label="Configuracoes"
          onPress={() => setActiveView('settings')}
        />
      </View>
    </SafeAreaView>
  );
}

function NavigationButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: 'call' | 'home' | 'settings';
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.navigationButton} onPress={onPress}>
      <MaterialIcons color={active ? theme.colors.primary : theme.colors.muted} name={icon} size={22} />
      <Text style={[styles.navigationLabel, active && styles.navigationLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SettingsView({ context, user }: { context: UserContext; user: AuthenticatedUser }) {
  return (
    <View style={styles.settings}>
      <Text style={styles.settingsEyebrow}>Configuracoes</Text>
      <Text style={styles.settingsTitle}>Conta e recursos</Text>
      <View style={styles.settingPanel}>
        <Text style={styles.settingLabel}>Perfil</Text>
        <Text style={styles.settingValue}>{user.profile === 'gatehouse' ? 'Portaria' : 'Morador'}</Text>
        <Text style={styles.settingLabel}>Recursos do condominio</Text>
        <Text style={styles.settingValue}>{context.features?.INTERCOM !== false ? 'Interfone habilitado' : 'Interfone indisponivel'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 0) + theme.spacing.sm : theme.spacing.md,
  },
  brand: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  bottomNavigation: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  navigationButton: {
    alignItems: 'center',
    gap: 2,
    minWidth: 76,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  navigationLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  navigationLabelActive: {
    color: theme.colors.primary,
  },
  unavailable: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  unavailableTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  unavailableText: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  settings: {
    gap: theme.spacing.md,
  },
  settingsEyebrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  settingsTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  settingPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  settingLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  settingValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
