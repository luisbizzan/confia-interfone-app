import { supabase } from './supabase';
import type { BackendCallRecord, PendingCalls } from '../types/domain';

export type StartCallResult = {
  id: string;
  status: string;
};

export async function startGatehouseToUnitCall(unitId: string): Promise<StartCallResult> {
  return callRpc('start_portaria_call', { p_unit_id: unitId });
}

export async function startResidentToGatehouseCall(unitId: string): Promise<StartCallResult> {
  return callRpc('start_unit_to_portaria_call', { p_unit_id: unitId });
}

export async function startResidentToUnitCall(originUnitId: string, targetUnitId: string): Promise<StartCallResult> {
  return callRpc('start_unit_to_unit_call', {
    p_origin_unit_id: originUnitId,
    p_target_unit_id: targetUnitId,
  });
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
