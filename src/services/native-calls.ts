import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const NATIVE_CALL_BACKGROUND_TASK = 'CONFIA_NATIVE_CALL_BACKGROUND_TASK';
const CALLKEEP_FOREGROUND_CHANNEL_ID = 'confia-native-calls';

type NativeCallPayload = {
  body?: string;
  call_id?: string;
  caller_name?: string;
  kind?: string;
  target_type?: string;
  title?: string;
};

type CallKeepModule = typeof import('react-native-callkeep').default;

let setupPromise: Promise<void> | null = null;
let foregroundCallback: (() => void) | null = null;

TaskManager.defineTask<Notifications.NotificationTaskPayload>(NATIVE_CALL_BACKGROUND_TASK, ({ data, error }) => {
  if (error) {
    return Promise.resolve();
  }

  const payload = extractNativeCallPayload(data);

  if (!payload) {
    return Promise.resolve();
  }

  void displayNativeIncomingCall(payload);
  return Promise.resolve();
});

export async function registerNativeCallBackgroundTask() {
  if (Platform.OS !== 'android') {
    return;
  }

  const registered = await TaskManager.isTaskRegisteredAsync(NATIVE_CALL_BACKGROUND_TASK).catch(() => false);

  if (!registered) {
    await Notifications.registerTaskAsync(NATIVE_CALL_BACKGROUND_TASK);
  }
}

export async function initializeNativeCallIntegration(onOpenIntercom?: () => void) {
  if (Platform.OS !== 'android') {
    return;
  }

  foregroundCallback = onOpenIntercom ?? null;
  await setupCallKeep();
  await registerNativeCallBackgroundTask();
}

export async function displayNativeIncomingCall(payload: NativeCallPayload) {
  if (Platform.OS !== 'android' || payload.kind !== 'incoming_call' || !payload.call_id) {
    return;
  }

  const RNCallKeep = await setupCallKeep();
  const callerName = payload.caller_name ?? payload.title ?? 'Chamada Confia';
  const handle = payload.target_type === 'PORTARIA' ? 'Portaria' : 'Unidade';

  RNCallKeep.displayIncomingCall(payload.call_id, handle, callerName, 'generic', false, {
    callId: payload.call_id,
    kind: payload.kind,
  });
}

async function setupCallKeep(): Promise<CallKeepModule> {
  const RNCallKeep = getCallKeep();

  if (!setupPromise) {
    setupPromise = RNCallKeep.setup({
      ios: {
        appName: 'Confia Interfone',
        includesCallsInRecents: false,
        supportsVideo: false,
      },
      android: {
        alertDescription: 'Permita que o Confia exiba chamadas recebidas do interfone.',
        alertTitle: 'Permissao para chamadas',
        cancelButton: 'Cancelar',
        foregroundService: {
          channelId: CALLKEEP_FOREGROUND_CHANNEL_ID,
          channelName: 'Chamadas Confia',
          notificationIcon: 'ic_launcher',
          notificationTitle: 'Chamada Confia em andamento',
        },
        imageName: 'ic_launcher',
        okButton: 'Permitir',
        selfManaged: true,
        additionalPermissions: [],
      },
    })
      .then(() => {
        RNCallKeep.setAvailable(true);
        RNCallKeep.canMakeMultipleCalls(false);
        RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
          RNCallKeep.answerIncomingCall(callUUID);
          RNCallKeep.backToForeground();
          foregroundCallback?.();
        });
        RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
          RNCallKeep.endCall(callUUID);
        });
        RNCallKeep.addEventListener('showIncomingCallUi', ({ callUUID, handle, name }) => {
          RNCallKeep.backToForeground();
          foregroundCallback?.();
          RNCallKeep.updateDisplay(callUUID, name ?? 'Chamada Confia', handle ?? 'Confia');
        });
      })
      .catch((error) => {
        setupPromise = null;
        throw error;
      });
  }

  await setupPromise;
  return RNCallKeep;
}

function getCallKeep(): CallKeepModule {
  // Native module is not available on web and Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const imported = require('react-native-callkeep') as { default: CallKeepModule };
  return imported.default;
}

function extractNativeCallPayload(data: Notifications.NotificationTaskPayload): NativeCallPayload | null {
  const payload = isNotificationResponse(data)
    ? data.notification.request.content.data
    : parseNotificationTaskData(data.data);

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybePayload = payload as Record<string, unknown>;
  const kind = getString(maybePayload.kind);
  const callId = getString(maybePayload.call_id) ?? getString(maybePayload.callId);

  if (kind !== 'incoming_call' || !callId) {
    return null;
  }

  return {
    body: getString(maybePayload.body) ?? undefined,
    call_id: callId,
    caller_name: getString(maybePayload.caller_name) ?? getString(maybePayload.callerName) ?? undefined,
    kind,
    target_type: getString(maybePayload.target_type) ?? getString(maybePayload.targetType) ?? undefined,
    title: getString(maybePayload.title) ?? undefined,
  };
}

function isNotificationResponse(data: Notifications.NotificationTaskPayload): data is Notifications.NotificationResponse {
  return typeof data === 'object' && data !== null && 'actionIdentifier' in data;
}

function parseNotificationTaskData(data: { dataString?: string; [key: string]: unknown }) {
  if (typeof data.dataString === 'string' && data.dataString.trim()) {
    try {
      return JSON.parse(data.dataString) as Record<string, unknown>;
    } catch {
      return data;
    }
  }

  return data;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
