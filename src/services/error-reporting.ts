import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { AuthenticatedUser } from '../types/domain';

type ReportingContext = {
  route?: string;
  user?: AuthenticatedUser;
};

type ReportOptions = {
  componentStack?: string | null;
  metadata?: Record<string, unknown>;
  source: string;
};

type GlobalErrorUtils = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let context: ReportingContext = {};
let globalHandlersRegistered = false;

export function setErrorReportingContext(nextContext: ReportingContext) {
  context = {
    ...context,
    ...nextContext,
  };
}

export function clearErrorReportingContext() {
  context = {};
}

export async function reportAppError(error: unknown, options: ReportOptions) {
  if (!supabase) {
    return;
  }

  const normalized = normalizeError(error);
  const user = context.user;
  const reportPayload = {
    app_version: Constants.expoConfig?.version ?? null,
    call_id: getString(options.metadata?.callId) ?? null,
    component_stack: truncate(options.componentStack, 6000),
    device_model: getDeviceModel(),
    message: truncate(normalized.message, 1200),
    metadata: sanitizeMetadata({
      ...options.metadata,
      route: context.route,
    }),
    os_version: String(Platform.Version ?? ''),
    platform: Platform.OS,
    profile: user?.profile ?? null,
    route: context.route ?? null,
    source: options.source,
    stack: truncate(normalized.stack, 12000),
  };

  try {
    const { error: functionError } = await supabase.functions.invoke('report-app-error', {
      body: reportPayload,
    });

    if (!functionError) {
      return;
    }

    if (user) {
      await supabase.from('app_error_reports').insert({
        ...reportPayload,
        condominium_id: user.condominiumId,
        user_id: user.id,
      });
    }
  } catch {
    // Reporting must never create a second user-facing failure.
  }
}

export function registerGlobalErrorHandlers() {
  if (globalHandlersRegistered) {
    return;
  }

  globalHandlersRegistered = true;

  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler?.();

  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    void reportAppError(error, {
      metadata: { isFatal: Boolean(isFatal) },
      source: 'global-error-handler',
    });
    previousHandler?.(error, isFatal);
  });

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      void reportAppError(event.error ?? event.message, {
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        source: 'window-error',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      void reportAppError(event.reason, {
        source: 'unhandled-promise-rejection',
      });
    });
  }
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || 'Erro inesperado no app.',
      stack: error.stack ?? null,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      stack: null,
    };
  }

  return {
    message: 'Erro inesperado no app.',
    stack: safeJson(error),
  };
}

function sanitizeMetadata(value: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, item]) => {
    if (item === undefined || item === null) {
      return;
    }

    if (/password|token|secret|authorization|apikey|api_key/i.test(key)) {
      safe[key] = '[redacted]';
      return;
    }

    if (typeof item === 'string') {
      safe[key] = redactSecrets(truncate(item, 1000) ?? '');
      return;
    }

    if (typeof item === 'number' || typeof item === 'boolean') {
      safe[key] = item;
      return;
    }

    safe[key] = redactSecrets(truncate(safeJson(item), 2000) ?? '');
  });

  return safe;
}

function redactSecrets(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[jwt-redacted]')
    .replace(/sb_secret_[A-Za-z0-9._-]+/g, 'sb_secret_[redacted]');
}

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getDeviceModel() {
  const constants = Constants as typeof Constants & { deviceName?: string };
  return constants.deviceName ?? null;
}
