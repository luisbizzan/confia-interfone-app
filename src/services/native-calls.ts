import { NativeModules, Platform } from 'react-native';

type NativeCallAction = 'answer' | 'decline' | 'open';

export type NativeIncomingCallAction = {
  action: NativeCallAction;
  call_id: string;
  caller_name?: string | null;
  kind?: 'incoming_call';
  target_type?: string | null;
} | {
  action: 'open';
  kind: 'message';
  message_id: string;
  thread_id?: string | null;
};

type ConfiaNativeCallsModule = {
  clearCallAuth: () => Promise<boolean>;
  consumeInitialAction: () => Promise<NativeIncomingCallAction | null>;
  dismissIncomingCall: (callId: string) => Promise<boolean>;
  showIncomingCall: (payload: {
    body?: string;
    call_id: string;
    caller_name?: string;
    target_type?: string;
    title?: string;
  }) => Promise<boolean>;
  syncCallAuth: (payload: {
    access_token: string;
    anon_key: string;
    refresh_token?: string | null;
    supabase_url: string;
  }) => Promise<boolean>;
};

const nativeCalls = NativeModules.ConfiaNativeCalls as ConfiaNativeCallsModule | undefined;

export async function consumeNativeIncomingCallAction() {
  if (Platform.OS !== 'android' || !nativeCalls) {
    return null;
  }

  return nativeCalls.consumeInitialAction();
}

export async function dismissNativeIncomingCall(callId: string) {
  if (Platform.OS !== 'android' || !nativeCalls) {
    return;
  }

  await nativeCalls.dismissIncomingCall(callId);
}

export async function clearNativeCallAuth() {
  if (Platform.OS !== 'android' || !nativeCalls) {
    return;
  }

  await nativeCalls.clearCallAuth();
}

export async function showNativeIncomingCall(payload: {
  body?: string;
  call_id: string;
  caller_name?: string;
  target_type?: string;
  title?: string;
}) {
  if (Platform.OS !== 'android' || !nativeCalls) {
    return false;
  }

  return nativeCalls.showIncomingCall(payload);
}

export async function syncNativeCallAuth(payload: {
  accessToken: string;
  anonKey: string;
  refreshToken?: string | null;
  supabaseUrl: string;
}) {
  if (Platform.OS !== 'android' || !nativeCalls) {
    return;
  }

  await nativeCalls.syncCallAuth({
    access_token: payload.accessToken,
    anon_key: payload.anonKey,
    refresh_token: payload.refreshToken ?? null,
    supabase_url: payload.supabaseUrl,
  });
}
