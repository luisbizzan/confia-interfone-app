import { supabase } from './supabase';

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
