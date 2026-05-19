import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { LoginScreen } from './src/screens/LoginScreen';
import { ResidentHomeScreen } from './src/screens/ResidentHomeScreen';
import { GatehouseHomeScreen } from './src/screens/GatehouseHomeScreen';
import { theme } from './src/theme/theme';
import type { AppProfile, AuthenticatedUser } from './src/types/domain';

export default function App() {
  const [profile, setProfile] = useState<AppProfile | null>(null);

  const user = useMemo<AuthenticatedUser | null>(() => {
    if (!profile) {
      return null;
    }

    return {
      id: profile === 'resident' ? 'demo-resident' : 'demo-gatehouse',
      name: profile === 'resident' ? 'Morador Demo' : 'Portaria Demo',
      email: profile === 'resident' ? 'morador@confia.test' : 'portaria@confia.test',
      condominiumId: 'cond-demo',
      condominiumName: 'Condominio Demo',
      profile,
    };
  }, [profile]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen onSelectProfile={setProfile} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Confia</Text>
          <Text style={styles.subtitle}>{user.condominiumName}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.logoutButton} onPress={() => setProfile(null)}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {user.profile === 'resident' ? <ResidentHomeScreen user={user} /> : <GatehouseHomeScreen user={user} />}
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
    paddingVertical: theme.spacing.md,
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
});
