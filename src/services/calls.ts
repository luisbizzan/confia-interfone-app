import { supabase } from './supabase';
import { getErrorMessage, logCallDiagnostic } from './diagnostics';
import { sendCallNotification } from './push-notifications';
import type { AuthenticatedUser, BackendCallRecord, PendingCalls } from '../types/domain';

export type StartCallResult = {
  id: string;
  status: string;
};

export async function startGatehouseToUnitCall(unitId: string, user?: AuthenticatedUser): Promise<StartCallResult> {
  return startCallRpc('start_portaria_call', { p_unit_id: unitId }, user, { action: 'push_dispatch_client', targetUnitId: unitId });
}

export async function startResidentToGatehouseCall(unitId: string, user?: AuthenticatedUser): Promise<StartCallResult> {
  return startCallRpc('start_unit_to_portaria_call', { p_unit_id: unitId }, user, { action: 'push_dispatch_client', unitId });
}

export async function startResidentToUnitCall(originUnitId: string, targetUnitId: string, user?: AuthenticatedUser): Promise<StartCallResult> {
  return startCallRpc('start_unit_to_unit_call', {
    p_origin_unit_id: originUnitId,
    p_target_unit_id: targetUnitId,
  }, user, { action: 'push_dispatch_client', targetUnitId, unitId: originUnitId });
}

export async function getMyCallHistory(limit = 25): Promise<BackendCallRecord[]> {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc('get_my_call_history', { p_limit: limit });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BackendCallRecord[];
}

export async function getMyPendingCalls(): Promise<PendingCalls> {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc('get_my_pending_calls');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? { unit_calls: [], portaria_calls: [] }) as PendingCalls;
}

export async function answerResidentCall(callId: string, userId: string): Promise<StartCallResult> {
  return callRpc('answer_call', { p_call_id: callId, p_user_id: userId });
}

export async function answerGatehouseCall(callId: string): Promise<StartCallResult> {
  return callRpc('answer_portaria_call', { p_call_id: callId });
}

export async function cancelCall(callId: string, reason = 'cancelled_by_app'): Promise<StartCallResult> {
  return callRpc('cancel_call', { p_call_id: callId, p_reason: reason });
}

export async function declineCall(callId: string, user?: AuthenticatedUser): Promise<StartCallResult> {
  const call = await callRpc('decline_call', { p_call_id: callId });

  if (call.status === 'RINGING') {
    void dispatchPushNotification(call.id, user, { action: 'push_dispatch_after_decline' });
  }

  return call;
}

export async function endCall(callId: string, reason = 'ended_by_app'): Promise<StartCallResult> {
  return callRpc('end_call', { p_call_id: callId, p_reason: reason });
}

async function callRpc(functionName: string, params: Record<string, string>): Promise<StartCallResult> {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc(functionName, params);

  if (error) {
    throw new Error(error.message);
  }

  return data as StartCallResult;
}

async function startCallRpc(
  functionName: string,
  params: Record<string, string>,
  user?: AuthenticatedUser,
  diagnostic?: { action: string; targetUnitId?: string | null; unitId?: string | null },
): Promise<StartCallResult> {
  const call = await callRpc(functionName, params);

  void dispatchPushNotification(call.id, user, diagnostic);

  return call;
}

async function dispatchPushNotification(
  callId: string,
  user?: AuthenticatedUser,
  diagnostic?: { action: string; targetUnitId?: string | null; unitId?: string | null },
) {
  const startedAt = Date.now();

  if (user && diagnostic) {
    void logCallDiagnostic({
      action: diagnostic.action,
      callId,
      result: 'STARTED',
      targetUnitId: diagnostic.targetUnitId,
      unitId: diagnostic.unitId,
      user,
    });
  }

  try {
    await sendCallNotification(callId);

    if (user && diagnostic) {
      void logCallDiagnostic({
        action: diagnostic.action,
        callId,
        durationMs: Date.now() - startedAt,
        result: 'SUCCESS',
        targetUnitId: diagnostic.targetUnitId,
        unitId: diagnostic.unitId,
        user,
      });
    }
  } catch (error) {
    if (user && diagnostic) {
      void logCallDiagnostic({
        action: diagnostic.action,
        callId,
        durationMs: Date.now() - startedAt,
        errorMessage: getErrorMessage(error),
        result: 'ERROR',
        targetUnitId: diagnostic.targetUnitId,
        unitId: diagnostic.unitId,
        user,
      });
    }
  }
}
