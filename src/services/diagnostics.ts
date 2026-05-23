import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { AuthenticatedUser } from '../types/domain';

type DiagnosticResult = 'STARTED' | 'SUCCESS' | 'ERROR';

type CallDiagnosticInput = {
  action: string;
  callId?: string | null;
  durationMs?: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  result: DiagnosticResult;
  targetUnitId?: string | null;
  unitId?: string | null;
  user: AuthenticatedUser;
};

export async function logCallDiagnostic({
  action,
  callId,
  durationMs,
  errorMessage,
  metadata,
  result,
  targetUnitId,
  unitId,
  user,
}: CallDiagnosticInput) {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from('app_call_diagnostics').insert({
      action,
      call_id: callId ?? null,
      condominium_id: user.condominiumId,
      duration_ms: durationMs ?? null,
      error_message: errorMessage ?? null,
      metadata: {
        ...(metadata ?? {}),
        app_platform: Platform.OS,
        user_email: user.email,
      },
      profile: user.profile,
      result,
      target_unit_id: targetUnitId ?? null,
      unit_id: unitId ?? null,
      user_id: user.id,
    });
  } catch {
    // Diagnostics cannot interfere with the call flow.
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Tente novamente.';
}
