import type { CallRecord, UserContext } from '../types/domain';

export function isCallRelevantToResident(call: CallRecord, context: UserContext) {
  const unitIds = new Set(context.unit_members.map((member) => member.unit_id));

  return unitIds.has(call.unitId) || (call.originUnitId ? unitIds.has(call.originUnitId) : false);
}

export function isOutgoingResidentCall(call: CallRecord, context: UserContext) {
  const unitIds = new Set(context.unit_members.map((member) => member.unit_id));

  return call.originType === 'UNIT' && Boolean(call.originUnitId && unitIds.has(call.originUnitId));
}

export function isCallRelevantToGatehouse(call: CallRecord, context: UserContext) {
  const deviceIds = new Set(context.portaria_devices.map((device) => device.id));

  return (
    (call.targetPortariaDeviceId ? deviceIds.has(call.targetPortariaDeviceId) : false) ||
    (call.originPortariaDeviceId ? deviceIds.has(call.originPortariaDeviceId) : false)
  );
}

export function isOutgoingGatehouseCall(call: CallRecord, context: UserContext) {
  const deviceIds = new Set(context.portaria_devices.map((device) => device.id));

  return call.originType === 'PORTARIA' && Boolean(call.originPortariaDeviceId && deviceIds.has(call.originPortariaDeviceId));
}
