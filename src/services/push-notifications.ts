import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

const INCOMING_CALLS_CHANNEL_ID = 'incoming-calls';

export async function registerForPushNotifications(user: AuthenticatedUser) {
  if (!supabase || Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  await configureAndroidNotificationChannel();

  const permission = await ensureNotificationPermission();

  if (!permission) {
    return null;
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    throw new Error('Expo projectId nao configurado para push notifications.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const appVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const appBuild = Constants.nativeBuildVersion ?? 'preview';

  const { error } = await supabase.rpc('register_app_push_token', {
    p_app_build: appBuild,
    p_app_version: appVersion,
    p_device_id: Constants.sessionId ?? null,
    p_device_name: Device.deviceName ?? `${Platform.OS} device`,
    p_expo_push_token: token.data,
    p_platform: Platform.OS,
    p_profile: user.profile,
  });

  if (error) {
    throw new Error(error.message);
  }

  return token.data;
}

export async function unregisterPushToken(token: string | null) {
  if (!supabase || !token) {
    return;
  }

  await supabase.rpc('unregister_app_push_token', {
    p_expo_push_token: token,
  });
}

export function addNotificationResponseListener(onIncomingCall: () => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const kind = response.notification.request.content.data?.kind;

    if (kind === 'incoming_call') {
      onIncomingCall();
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

async function configureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(INCOMING_CALLS_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.MAX,
    lightColor: '#0f8f7f',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    name: 'Chamadas recebidas',
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500],
  });
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
