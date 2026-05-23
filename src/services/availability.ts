import { supabase } from './supabase';
import type { BackendCallRecord } from '../types/domain';

export async function getActiveCondominiumCalls(condominiumId: string): Promise<BackendCallRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('calls')
    .select(
      'id,unit_id,origin_type,origin_unit_id,origin_portaria_device_id,target_type,target_portaria_device_id,status,answered_by,started_at,answered_at,ended_at,created_at',
    )
    .eq('condominium_id', condominiumId)
    .in('status', ['RINGING', 'ANSWERED'])
    .is('ended_at', null)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as BackendCallRecord[];
}

export function buildBusyUnitIds(calls: BackendCallRecord[]) {
  const busyUnitIds = new Set<string>();

  calls.forEach((call) => {
    busyUnitIds.add(call.unit_id);

    if (call.origin_unit_id) {
      busyUnitIds.add(call.origin_unit_id);
    }
  });

  return busyUnitIds;
}
