import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { logCallDiagnostic } from './diagnostics';
import { supabase } from './supabase';
import type { AuthenticatedUser } from '../types/domain';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const INCOMING_CALLS_CHANNEL_ID = 'incoming-calls-v2';
export const INCOMING_CALL_CATEGORY_ID = 'incoming_call';
export const INCOMING_CALL_ANSWER_ACTION_ID = 'ANSWER_CALL';
export const INCOMING_CALL_DECLINE_ACTION_ID = 'DECLINE_CALL';
const INCOMING_CALL_SOUND = 'call_ringtone.wav';

export async function configureIncomingCallNotifications() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationCategoryAsync(INCOMING_CALL_CATEGORY_ID, [
    {
      buttonTitle: 'Recusar',
      identifier: INCOMING_CALL_DECLINE_ACTION_ID,
      options: {
        isDestructive: true,
        opensAppToForeground: true,
      },
    },
    {
      buttonTitle: 'Atender',
      identifier: INCOMING_CALL_ANSWER_ACTION_ID,
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  await Notifications.setNotificationChannelAsync(INCOMING_CALLS_CHANNEL_ID, {
    audioAttributes: {
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
    },
    importance: Notifications.AndroidImportance.MAX,
    lightColor: '#0f8f7f',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    name: 'Chamadas recebidas',
    sound: INCOMING_CALL_SOUND,
    vibrationPattern: [0, 700, 350, 700, 350, 700],
  });
}

export async function registerForPushNotifications(user: AuthenticatedUser) {
  try {
    if (!supabase || Platform.OS === 'web') {
      void logCallDiagnostic({
        action: 'push_registration',
        metadata: { reason: !supabase ? 'supabase_not_configured' : 'web_platform' },
        result: 'SUCCESS',
        user,
      });
      return null;
    }

    if (!Device.isDevice) {
      void logCallDiagnostic({
        action: 'push_registration',
        metadata: { reason: 'not_physical_device' },
        result: 'SUCCESS',
        user,
      });
      return null;
    }

    void logCallDiagnostic({
      action: 'push_registration',
      metadata: { platform: Platform.OS },
      result: 'STARTED',
      user,
    });

    await configureIncomingCallNotifications();

    const permission = await ensureNotificationPermission();

    if (!permission) {
      void logCallDiagnostic({
        action: 'push_registration',
        metadata: { permission: 'denied' },
        result: 'ERROR',
        user,
      });
      return null;
    }

    const projectId = getExpoProjectId();

    if (!projectId) {
      void logCallDiagnostic({
        action: 'push_registration',
        errorMessage: 'Expo projectId nao configurado para push notifications.',
        result: 'ERROR',
        user,
      });
      throw new Error('Expo projectId nao configurado para push notifications.');
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const nativeToken = await Notifications.getDevicePushTokenAsync().catch(() => null);
    const appVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0';
    const appBuild = Constants.nativeBuildVersion ?? 'preview';

    const { error } = await supabase.rpc('register_app_push_token', {
      p_app_build: appBuild,
      p_app_version: appVersion,
      p_device_id: Constants.sessionId ?? null,
      p_device_name: Device.deviceName ?? `${Platform.OS} device`,
      p_expo_push_token: token.data,
      p_native_push_provider: nativeToken?.type ?? null,
      p_native_push_token: typeof nativeToken?.data === 'string' ? nativeToken.data : null,
      p_platform: Platform.OS,
      p_profile: user.profile,
    });

    if (error) {
      throw new Error(error.message);
    }

    void logCallDiagnostic({
      action: 'push_registration',
      metadata: {
        app_build: appBuild,
        app_version: appVersion,
        permission: 'granted',
        platform: Platform.OS,
        native_token_length: typeof nativeToken?.data === 'string' ? nativeToken.data.length : null,
        token_length: token.data.length,
        token_prefix: token.data.slice(0, 18),
      },
      result: 'SUCCESS',
      user,
    });

    return token.data;
  } catch (error) {
    void logCallDiagnostic({
      action: 'push_registration',
      errorMessage: getPushErrorMessage(error),
      metadata: {
        platform: Platform.OS,
      },
      result: 'ERROR',
      user,
    });

    throw error;
  }
}

export async function unregisterPushToken(token: string | null) {
  if (!supabase || !token) {
    return;
  }

  await supabase.rpc('unregister_app_push_token', {
    p_expo_push_token: token,
  });
}

export type IncomingCallNotificationAction = 'answer' | 'decline' | 'open';

export type IncomingCallNotificationResponse = {
  action: IncomingCallNotificationAction;
  callId: string | null;
};

export function addNotificationResponseListener(onIncomingCall: (response: IncomingCallNotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const kind = data?.kind;

    if (kind === 'incoming_call') {
      onIncomingCall({
        action: mapNotificationAction(response.actionIdentifier),
        callId: getNotificationCallId(data),
      });
    }
  });
}

export async function sendCallNotification(callId: string) {
  if (!supabase || Platform.OS === 'web') {
    return;
  }

  const { error } = await supabase.functions.invoke('send-call-notification', {
    body: { call_id: callId },
  });

  if (error) {
    throw new Error(error.message);
  }
}

function mapNotificationAction(actionIdentifier: string): IncomingCallNotificationAction {
  if (actionIdentifier === INCOMING_CALL_ANSWER_ACTION_ID) {
    return 'answer';
  }

  if (actionIdentifier === INCOMING_CALL_DECLINE_ACTION_ID) {
    return 'decline';
  }

  return 'open';
}

function getNotificationCallId(data: Record<string, unknown> | undefined) {
  const callId = data?.call_id ?? data?.callId;
  return typeof callId === 'string' && callId.trim() ? callId.trim() : null;
}

async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function getExpoProjectId() {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
  };

  return constants.easConfig?.projectId ?? constants.expoConfig?.extra?.eas?.projectId;
}

function getPushErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro desconhecido ao registrar notificacoes.';
}
