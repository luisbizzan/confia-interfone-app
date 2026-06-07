import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Platform, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { ActiveCallExperience, IncomingCallExperience, OutgoingCallExperience } from './src/components/CallExperience';
import { AppHomeScreen } from './src/screens/AppHomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MessageCenterScreen } from './src/screens/MessageCenterScreen';
import { ResidentHomeScreen } from './src/screens/ResidentHomeScreen';
import { GatehouseHomeScreen } from './src/screens/GatehouseHomeScreen';
import { env } from './src/config/env';
import { answerGatehouseCall, answerResidentCall, cancelCall, declineCall, endCall, getMyCallHistory, getMyPendingCalls } from './src/services/calls';
import {
  isCallRelevantToGatehouse,
  isCallRelevantToResident,
  isOutgoingGatehouseCall,
  isOutgoingResidentCall,
} from './src/services/call-ownership';
import { loadCurrentAuthState, signInWithEmail, signOut, type LoadedAuthState } from './src/services/auth';
import { clearErrorReportingContext, registerGlobalErrorHandlers, reportAppError, setErrorReportingContext } from './src/services/error-reporting';
import { clearNativeCallAuth, consumeNativeIncomingCallAction, dismissNativeIncomingCall, syncNativeCallAuth, type NativeIncomingCallAction } from './src/services/native-calls';
import { addNotificationResponseListener, configureIncomingCallNotifications, registerForPushNotifications, unregisterPushToken } from './src/services/push-notifications';
import { checkAppVersionPolicy, openAppUpdateUrl, type AppVersionPolicy } from './src/services/app-version';
import type { MessageTarget } from './src/services/messages';
import { theme } from './src/theme/theme';
import type { AuthenticatedUser, BackendCallRecord, CallRecord, PendingPortariaCall, PendingUnitCall, UnitDirectoryItem, UserContext } from './src/types/domain';

const GLOBAL_CALL_REFRESH_INTERVAL_MS = 5000;

type GlobalCallState =
  | { status: 'idle'; feedback?: string }
  | { status: 'incoming'; feedback?: string; call: PendingUnitCall | PendingPortariaCall }
  | { status: 'outgoing'; feedback?: string; call: CallRecord }
  | { status: 'active'; feedback?: string; call: CallRecord };

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
  const [activeView, setActiveView] = useState<'home' | 'intercom' | 'messages' | 'settings'>('home');
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null);
  const [shouldSimulateError, setShouldSimulateError] = useState(false);
  const [globalCallState, setGlobalCallState] = useState<GlobalCallState>({ status: 'idle' });
  const [versionPolicy, setVersionPolicy] = useState<AppVersionPolicy | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushRegistrationStatus, setPushRegistrationStatus] = useState<'idle' | 'registering' | 'registered' | 'unavailable' | 'error'>('idle');

  useEffect(() => {
    registerGlobalErrorHandlers();
    void configureIncomingCallNotifications().catch((error) => {
      void reportAppError(error, { source: 'notification-bootstrap' });
    });
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
    if (authState.status !== 'authenticated') {
      void clearNativeCallAuth().catch((error) => {
        void reportAppError(error, { source: 'native-call-auth-clear' });
      });
      return undefined;
    }

    let mounted = true;

    const syncAuth = async () => {
      try {
        if (!mounted || !env.supabaseUrl || !env.supabaseAnonKey) {
          return;
        }

        await syncNativeCallAuth({
          accessToken: authState.session.access_token,
          anonKey: env.supabaseAnonKey,
          refreshToken: authState.session.refresh_token,
          supabaseUrl: env.supabaseUrl,
        });
      } catch (error) {
        void reportAppError(error, { source: 'native-call-auth-sync' });
      }
    };

    void syncAuth();
    const intervalId = setInterval(() => {
      void syncAuth();
    }, 10 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [authState]);

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      setPushToken(null);
      setPushRegistrationStatus('idle');
      return undefined;
    }

    let mounted = true;
    setPushRegistrationStatus('registering');

    registerForPushNotifications(authState.user)
      .then((token) => {
        if (mounted) {
          setPushToken(token);
          setPushRegistrationStatus(token ? 'registered' : 'unavailable');
        }
      })
      .catch((error) => {
        if (mounted) {
          setPushRegistrationStatus('error');
        }
        void reportAppError(error, { source: 'push-registration' });
      });

    const subscription = addNotificationResponseListener((notification) => {
      if (notification.kind === 'message') {
        setMessageTarget(null);
        setActiveView('messages');
        return;
      }

      setActiveView('intercom');

      if (notification.action === 'answer' && notification.callId) {
        void handleNotificationAnswer(
          authState.user,
          authState.context,
          buildUnitLabelMap(authState.context, authState.units),
          setGlobalCallState,
          notification.callId,
        );
      }

      if (notification.action === 'decline' && notification.callId) {
        void handleNotificationDecline(
          authState.user,
          authState.context,
          buildUnitLabelMap(authState.context, authState.units),
          setGlobalCallState,
          notification.callId,
        );
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [authState]);

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      return undefined;
    }

    let mounted = true;

    const consumeAction = async () => {
      try {
        const action = await consumeNativeIncomingCallAction();

        if (mounted && action) {
          await handleNativeIncomingCallAction(
            authState.user,
            authState.context,
            buildUnitLabelMap(authState.context, authState.units),
            setActiveView,
            setGlobalCallState,
            action,
          );
        }
      } catch (error) {
        void reportAppError(error, { source: 'native-call-action' });
      }
    };

    void consumeAction();

    const intervalId = setInterval(() => {
      void consumeAction();
    }, 1000);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void consumeAction();
      }
    });

    return () => {
      mounted = false;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [authState]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([checkAppVersionPolicy(), loadCurrentAuthState()])
      .then(([versionResult, authResult]) => {
        if (!mounted) {
          return;
        }

        if (versionResult.status === 'fulfilled') {
          setVersionPolicy(versionResult.value);
        } else {
          setVersionPolicy({ status: 'unavailable', reason: 'Nao foi possivel validar a versao instalada.' });
          void reportAppError(versionResult.reason, { source: 'version-policy-bootstrap' });
        }

        if (authResult.status === 'fulfilled') {
          setAuthState(authResult.value);
        } else {
          void reportAppError(authResult.reason, { source: 'auth-bootstrap' });
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

  useEffect(() => {
    if (versionPolicy?.status === 'unavailable') {
      void reportAppError(new Error(versionPolicy.reason), { source: 'version-policy-unavailable' });
    }
  }, [versionPolicy]);

  async function handleLogin(email: string, password: string) {
    const state = await signInWithEmail(email, password);
    setAuthState(state);
    setActiveView('home');
  }

  async function handleLogout() {
    await unregisterPushToken(pushToken);
    await clearNativeCallAuth();
    await signOut();
    setAuthState({ status: 'unauthenticated' });
    setActiveView('home');
    setGlobalCallState({ status: 'idle' });
    setPushToken(null);
    setPushRegistrationStatus('idle');
  }

  const authenticatedState = authState.status === 'authenticated' ? authState : null;
  const intercomEnabled = authenticatedState ? authenticatedState.context.features?.INTERCOM !== false : false;
  const messagingEnabled = authenticatedState ? authenticatedState.context.features?.MESSAGING !== false : false;
  const isMessagesView = Boolean(authenticatedState && globalCallState.status === 'idle' && activeView === 'messages' && messagingEnabled);
  const unitLabels = useMemo(
    () => (authenticatedState ? buildUnitLabelMap(authenticatedState.context, authenticatedState.units) : new Map<string, string>()),
    [authenticatedState],
  );
  const shouldRunGlobalCallMonitor = Boolean(authenticatedState && intercomEnabled && activeView !== 'intercom');

  useEffect(() => {
    if (!authenticatedState || !shouldRunGlobalCallMonitor) {
      setGlobalCallState({ status: 'idle' });
      return undefined;
    }

    let mounted = true;

    const refresh = async (options?: { silent?: boolean }) => {
      try {
        const nextState = await loadGlobalCallState(authenticatedState.user, authenticatedState.context, unitLabels);

        if (mounted) {
          setGlobalCallState(nextState);
        }
      } catch (error) {
        if (mounted && !options?.silent) {
          setGlobalCallState({
            status: 'idle',
            feedback: `Nao foi possivel monitorar chamadas: ${error instanceof Error ? error.message : 'Tente novamente.'}`,
          });
        }
      }
    };

    void refresh();
    const interval = setInterval(() => void refresh({ silent: true }), GLOBAL_CALL_REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [authenticatedState, shouldRunGlobalCallMonitor, unitLabels]);

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

  if (versionPolicy?.status === 'update_required') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <UpdateRequiredView policy={versionPolicy} />
      </SafeAreaView>
    );
  }

  if (!authenticatedState) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  const { user, context, units } = authenticatedState;

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

      {isMessagesView ? (
        <View style={[styles.content, styles.messageContent]}>
          <MessageCenterScreen initialTarget={messageTarget} onClearTarget={() => setMessageTarget(null)} user={user} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        {globalCallState.status === 'incoming' ? (
          <IncomingCallExperience
            callerLabel={pendingCallTitle(globalCallState.call, unitLabels, user.profile)}
            onAnswer={() => handleGlobalAnswer(user, context, unitLabels, setGlobalCallState, globalCallState.call)}
            startedAt={formatDateTime(globalCallState.call.started_at)}
            targetLabel={user.profile === 'gatehouse' ? 'Portaria' : 'Sua unidade'}
          />
        ) : null}
        {globalCallState.status === 'active' ? (
          <ActiveCallExperience
            call={globalCallState.call}
            onEnd={() => handleGlobalEnd(user, context, unitLabels, setGlobalCallState, globalCallState.call.id)}
          />
        ) : null}
        {globalCallState.status === 'outgoing' ? (
          <OutgoingCallExperience
            call={globalCallState.call}
            onCancel={() => handleGlobalCancel(user, context, unitLabels, setGlobalCallState, globalCallState.call.id)}
          />
        ) : null}
        {globalCallState.status !== 'idle' && globalCallState.feedback ? (
          <View style={styles.monitorFeedback}>
            <Text style={styles.monitorFeedbackText}>{globalCallState.feedback}</Text>
          </View>
        ) : null}
        {globalCallState.status === 'idle' && globalCallState.feedback ? (
          <View style={styles.monitorFeedback}>
            <Text style={styles.monitorFeedbackText}>{globalCallState.feedback}</Text>
          </View>
        ) : null}
        {globalCallState.status === 'idle' && activeView === 'home' ? (
          <AppHomeScreen context={context} onOpenIntercom={() => setActiveView('intercom')} user={user} />
        ) : null}
        {globalCallState.status === 'idle' && activeView === 'settings' ? (
          <SettingsView
            context={context}
            onSimulateError={() => setShouldSimulateError(true)}
            pushRegistrationStatus={pushRegistrationStatus}
            pushToken={pushToken}
            user={user}
            versionPolicy={versionPolicy}
          />
        ) : null}
        {globalCallState.status === 'idle' && activeView === 'intercom' && intercomEnabled && user.profile === 'resident' ? (
          <ResidentHomeScreen
            context={context}
            directoryUnits={units}
            messagingEnabled={messagingEnabled}
            user={user}
            onOpenMessages={(target) => {
              setMessageTarget(target);
              setActiveView('messages');
            }}
          />
        ) : null}
        {globalCallState.status === 'idle' && activeView === 'intercom' && intercomEnabled && user.profile === 'gatehouse' ? (
          <GatehouseHomeScreen
            context={context}
            directoryUnits={units}
            messagingEnabled={messagingEnabled}
            user={user}
            onOpenMessages={(target) => {
              setMessageTarget(target);
              setActiveView('messages');
            }}
          />
        ) : null}
        {globalCallState.status === 'idle' && activeView === 'intercom' && !intercomEnabled ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableTitle}>Interfone indisponivel</Text>
            <Text style={styles.unavailableText}>Este recurso nao esta habilitado para o condominio.</Text>
          </View>
        ) : null}
      </ScrollView>
      )}

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
        {messagingEnabled ? (
          <NavigationButton
            active={activeView === 'messages'}
            icon="chat"
            label="Mensagens"
            onPress={() => {
              setMessageTarget(null);
              setActiveView('messages');
            }}
          />
        ) : null}
        <NavigationButton
          active={activeView === 'settings'}
          icon="settings"
          label="Configuracoes"
          onPress={() => setActiveView('settings')}
        />
      </View>

      {shouldSimulateError ? <ErrorSimulationTrigger /> : null}
    </SafeAreaView>
  );
}

async function handleNotificationAnswer(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setGlobalCallState: (state: GlobalCallState) => void,
  callId: string,
) {
  try {
    await dismissNativeIncomingCall(callId);

    if (user.profile === 'gatehouse') {
      await answerGatehouseCall(callId);
    } else {
      await answerResidentCall(callId, user.id);
    }

    await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
  } catch (error) {
    void reportAppError(error, {
      metadata: { callId, action: 'notification_answer_call' },
      source: 'call-action-error',
    });

    setGlobalCallState({
      status: 'idle',
      feedback: 'Nao foi possivel atender a chamada agora. O time tecnico foi notificado.',
    });
  }
}

async function handleNativeIncomingCallAction(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setActiveView: (view: 'home' | 'intercom' | 'messages' | 'settings') => void,
  setGlobalCallState: (state: GlobalCallState) => void,
  action: NativeIncomingCallAction,
) {
  if (action.kind === 'message') {
    setActiveView('messages');
    return;
  }

  setActiveView('intercom');

  if (action.action === 'answer') {
    await handleNotificationAnswer(user, context, unitLabels, setGlobalCallState, action.call_id);
    return;
  }

  if (action.action === 'decline') {
    await handleNotificationDecline(user, context, unitLabels, setGlobalCallState, action.call_id);
    return;
  }

  await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
}

async function handleNotificationDecline(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setGlobalCallState: (state: GlobalCallState) => void,
  callId: string,
) {
  try {
    await dismissNativeIncomingCall(callId);
    await declineCall(callId, user);
    await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
  } catch (error) {
    if (isCallAlreadyResolvedError(error)) {
      await dismissNativeIncomingCall(callId);
      await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
      return;
    }

    void reportAppError(error, {
      metadata: { callId, action: 'notification_decline_call' },
      source: 'call-action-error',
    });

    setGlobalCallState({
      status: 'idle',
      feedback: 'Nao foi possivel recusar a chamada agora. O time tecnico foi notificado.',
    });
  }
}

function isCallAlreadyResolvedError(error: unknown) {
  return error instanceof Error && /call not found or not ringing/i.test(error.message);
}

function NavigationButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: 'call' | 'chat' | 'home' | 'settings';
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

function SettingsView({
  context,
  onSimulateError,
  pushRegistrationStatus,
  pushToken,
  user,
  versionPolicy,
}: {
  context: UserContext;
  onSimulateError: () => void;
  pushRegistrationStatus: 'idle' | 'registering' | 'registered' | 'unavailable' | 'error';
  pushToken: string | null;
  user: AuthenticatedUser;
  versionPolicy: AppVersionPolicy | null;
}) {
  const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.nativeBuildVersion ?? 'preview';

  return (
    <View style={styles.settings}>
      <Text style={styles.settingsEyebrow}>Configuracoes</Text>
      <Text style={styles.settingsTitle}>Conta e recursos</Text>
      <View style={styles.settingPanel}>
        <Text style={styles.settingLabel}>Perfil</Text>
        <Text style={styles.settingValue}>{user.profile === 'gatehouse' ? 'Portaria' : 'Morador'}</Text>
        <Text style={styles.settingLabel}>Recursos do condominio</Text>
        <Text style={styles.settingValue}>{context.features?.INTERCOM !== false ? 'Interfone habilitado' : 'Interfone indisponivel'}</Text>
        <Text style={styles.settingLabel}>Versao instalada</Text>
        <Text style={styles.settingValue}>
          {version} ({build})
        </Text>
        <Text style={styles.settingLabel}>Notificacoes</Text>
        <Text style={styles.settingValue}>{formatPushRegistrationStatus(pushRegistrationStatus, pushToken)}</Text>
        <Text style={styles.settingLabel}>Atualizacoes</Text>
        <Text style={styles.settingValue}>{formatVersionPolicyStatus(versionPolicy)}</Text>
      </View>
      {env.enableErrorTest ? (
        <View style={styles.dangerPanel}>
          <Text style={styles.dangerPanelTitle}>Teste tecnico</Text>
          <Text style={styles.dangerPanelText}>Simula uma excecao para validar o reporte automatico ao time tecnico.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.simulateButton} testID="settings-simulate-error" onPress={onSimulateError}>
            <Text style={styles.simulateButtonText}>Gerar erro de teste</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function UpdateRequiredView({ policy }: { policy: Extract<AppVersionPolicy, { status: 'update_required' }> }) {
  return (
    <View style={styles.updateRequiredScreen}>
      <View style={styles.updateRequiredPanel}>
        <Text style={styles.updateBrand}>Confia</Text>
        <Text style={styles.updateTitle}>Atualizacao necessaria</Text>
        <Text style={styles.updateText}>{policy.message}</Text>
        <Text style={styles.updateDetails}>
          Versao instalada: {policy.currentVersion} ({policy.currentBuild || 'preview'})
        </Text>
        <Text style={styles.updateDetails}>
          Versao minima: {policy.minimumVersion} ({policy.minimumBuild})
        </Text>
        <TouchableOpacity accessibilityRole="button" style={styles.updateButton} onPress={() => void openAppUpdateUrl(policy.updateUrl)}>
          <Text style={styles.updateButtonText}>{policy.updateUrl ? 'Atualizar aplicativo' : 'Fale com o suporte'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatVersionPolicyStatus(policy: AppVersionPolicy | null) {
  if (!policy) {
    return 'Validando versao instalada...';
  }

  if (policy.status === 'ok') {
    return `Versao permitida. Ultima versao: ${policy.latestVersion ?? 'nao informada'} (${policy.latestBuild ?? 'sem build'}).`;
  }

  if (policy.status === 'update_required') {
    return `Atualizacao obrigatoria para ${policy.minimumVersion} (${policy.minimumBuild}).`;
  }

  return 'Nao foi possivel validar a politica de atualizacao; uso liberado para evitar bloqueio indevido.';
}

function formatPushRegistrationStatus(status: 'idle' | 'registering' | 'registered' | 'unavailable' | 'error', token: string | null) {
  if (status === 'registered' && token) {
    return `Token registrado (${token.slice(0, 18)}...)`;
  }

  if (status === 'registering') {
    return 'Registrando notificacoes...';
  }

  if (status === 'error') {
    return 'Erro ao registrar notificacoes. Ver diagnosticos.';
  }

  if (status === 'unavailable') {
    return 'Indisponivel neste aparelho/build.';
  }

  return 'Aguardando login.';
}

function buildUnitLabelMap(context: UserContext, units: UnitDirectoryItem[]) {
  const labels = new Map<string, string>();

  for (const unit of units) {
    labels.set(unit.id, unit.label);
  }

  for (const member of context.unit_members) {
    labels.set(member.unit_id, formatUnitLabel(member.unit));
  }

  return labels;
}

function formatUnitLabel(unit: UserContext['unit_members'][number]['unit']) {
  return [unit.block, unit.number].filter(Boolean).join(' - ');
}

async function loadGlobalCallState(user: AuthenticatedUser, context: UserContext, unitLabels: Map<string, string>): Promise<GlobalCallState> {
  const [pendingCalls, history] = await Promise.all([getMyPendingCalls(), getMyCallHistory()]);
  const incomingCall = user.profile === 'gatehouse' ? pendingCalls.portaria_calls?.[0] : pendingCalls.unit_calls?.[0];
  const calls = history
    .map((call) => mapBackendCall(call, unitLabels))
    .filter((call) => (user.profile === 'gatehouse' ? isCallRelevantToGatehouse(call, context) : isCallRelevantToResident(call, context)));
  const activeCall = calls.find((call) => call.status === 'ANSWERED' && !call.endedAt);
  const outgoingCall = calls.find(
    (call) =>
      call.status === 'RINGING' &&
      !call.endedAt &&
      (user.profile === 'gatehouse' ? isOutgoingGatehouseCall(call, context) : isOutgoingResidentCall(call, context)),
  );

  if (incomingCall) {
    return { status: 'incoming', call: incomingCall };
  }

  if (activeCall) {
    return { status: 'active', call: activeCall };
  }

  if (outgoingCall) {
    return { status: 'outgoing', call: outgoingCall };
  }

  return { status: 'idle' };
}

async function refreshGlobalCallState(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setGlobalCallState: (state: GlobalCallState) => void,
) {
  try {
    setGlobalCallState(await loadGlobalCallState(user, context, unitLabels));
  } catch (error) {
    setGlobalCallState({
      status: 'idle',
      feedback: `Nao foi possivel atualizar chamadas: ${error instanceof Error ? error.message : 'Tente novamente.'}`,
    });
  }
}

async function handleGlobalAnswer(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setGlobalCallState: (state: GlobalCallState) => void,
  call: PendingUnitCall | PendingPortariaCall,
) {
  try {
    if (user.profile === 'gatehouse') {
      await answerGatehouseCall(call.call_id);
    } else {
      await answerResidentCall(call.call_id, user.id);
    }

    await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
  } catch (error) {
    setGlobalCallState({
      status: 'incoming',
      call,
      feedback: `Nao foi possivel atender: ${error instanceof Error ? error.message : 'Tente novamente.'}`,
    });
  }
}

async function handleGlobalCancel(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setGlobalCallState: (state: GlobalCallState) => void,
  callId: string,
) {
  try {
    await cancelCall(callId);
    await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
  } catch (error) {
    setGlobalCallState({
      status: 'idle',
      feedback: `Nao foi possivel cancelar: ${error instanceof Error ? error.message : 'Tente novamente.'}`,
    });
  }
}

async function handleGlobalEnd(
  user: AuthenticatedUser,
  context: UserContext,
  unitLabels: Map<string, string>,
  setGlobalCallState: (state: GlobalCallState) => void,
  callId: string,
) {
  try {
    await endCall(callId);
    await refreshGlobalCallState(user, context, unitLabels, setGlobalCallState);
  } catch (error) {
    setGlobalCallState({
      status: 'idle',
      feedback: `Nao foi possivel encerrar: ${error instanceof Error ? error.message : 'Tente novamente.'}`,
    });
  }
}

function mapBackendCall(call: BackendCallRecord, unitLabels: Map<string, string>): CallRecord {
  const targetUnit = unitLabels.get(call.unit_id) ?? 'Unidade';
  const originUnit = call.origin_unit_id ? unitLabels.get(call.origin_unit_id) ?? 'Unidade' : 'Unidade';

  return {
    id: call.id,
    direction:
      call.origin_type === 'PORTARIA'
        ? 'gatehouse_to_unit'
        : call.target_type === 'PORTARIA'
          ? 'resident_to_gatehouse'
          : 'resident_to_unit',
    endedAt: call.ended_at,
    fromLabel: call.origin_type === 'PORTARIA' ? 'Portaria' : originUnit,
    originPortariaDeviceId: call.origin_portaria_device_id,
    originType: call.origin_type,
    originUnitId: call.origin_unit_id,
    toLabel: call.target_type === 'PORTARIA' ? 'Portaria' : targetUnit,
    status: call.status,
    startedAt: formatDateTime(call.started_at),
    targetPortariaDeviceId: call.target_portaria_device_id,
    targetType: call.target_type,
    unitId: call.unit_id,
  };
}

function pendingCallTitle(call: PendingUnitCall | PendingPortariaCall, unitLabels: Map<string, string>, profile: AuthenticatedUser['profile']) {
  if (profile === 'gatehouse') {
    return `${unitLabels.get(call.origin_unit_id ?? call.unit_id) ?? 'Unidade'} para Portaria`;
  }

  if (call.origin_type === 'PORTARIA') {
    return `Portaria para ${unitLabels.get(call.unit_id) ?? 'sua unidade'}`;
  }

  return `${call.origin_unit_id ? unitLabels.get(call.origin_unit_id) ?? 'Unidade' : 'Unidade'} para ${
    unitLabels.get(call.unit_id) ?? 'sua unidade'
  }`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function ErrorSimulationTrigger(): never {
  throw new Error('Confia simulated app error for reporting validation');
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
    paddingBottom: Platform.OS === 'android' ? 104 : theme.spacing.xxl,
  },
  messageContent: {
    flex: 1,
    paddingBottom: theme.spacing.md,
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
    paddingBottom: Platform.OS === 'android' ? 24 : theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  navigationButton: {
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
    minHeight: 52,
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
  monitorFeedback: {
    backgroundColor: '#eef5ff',
    borderColor: '#cfe1f8',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  monitorFeedbackText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
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
  dangerPanel: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  dangerPanelTitle: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: '900',
  },
  dangerPanelText: {
    color: '#7f1d1d',
    fontSize: 14,
    lineHeight: 20,
  },
  simulateButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  simulateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  updateRequiredScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  updateRequiredPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  updateBrand: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  updateTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  updateText: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  updateDetails: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  updateButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
