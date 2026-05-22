import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { LoginScreen } from './src/screens/LoginScreen';
import { ResidentHomeScreen } from './src/screens/ResidentHomeScreen';
import { GatehouseHomeScreen } from './src/screens/GatehouseHomeScreen';
import { loadCurrentAuthState, signInWithEmail, signOut, type LoadedAuthState } from './src/services/auth';
import { theme } from './src/theme/theme';

export default function App() {
  const [authState, setAuthState] = useState<LoadedAuthState>({ status: 'unauthenticated' });
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    loadCurrentAuthState()
      .then((state) => {
        if (mounted) {
          setAuthState(state);
        }
      })
      .catch(() => {
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
  }

  async function handleLogout() {
    await signOut();
    setAuthState({ status: 'unauthenticated' });
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
        {user.profile === 'resident' ? (
          <ResidentHomeScreen context={context} directoryUnits={units} user={user} />
        ) : (
          <GatehouseHomeScreen context={context} directoryUnits={units} user={user} />
        )}
      </ScrollView>
    </SafeAreaView>
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
});
