export type AppProfile = 'resident' | 'gatehouse';

export type BackendRole = 'ADMIN' | 'MANAGER' | 'MORADOR' | 'PORTARIA' | string;

export type CallStatus = 'RINGING' | 'ANSWERED' | 'MISSED' | 'CANCELLED' | 'ringing' | 'answered' | 'missed' | 'ended';

export type CallDirection = 'resident_to_gatehouse' | 'gatehouse_to_unit' | 'resident_to_unit';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  condominiumId: string;
  condominiumName: string;
  profile: AppProfile;
};

export type UserContextProfile = {
  user_id: string;
  condominium_id: string;
  role: BackendRole;
};

export type UserContextUnit = {
  id: string;
  unit_id: string;
  member_type: string;
  active_for_calls: boolean;
  can_receive_calls: boolean;
  can_make_calls: boolean;
  call_order: number;
  unit: {
    id: string;
    type: string;
    block: string | null;
    number: string;
  };
};

export type UserContextPortariaDevice = {
  id: string;
  name: string;
  is_active: boolean;
  can_receive_calls: boolean;
  can_make_calls: boolean;
  priority_order: number;
};

export type UserContext = {
  profile: UserContextProfile;
  features: Record<string, boolean>;
  unit_members: UserContextUnit[];
  portaria_devices: UserContextPortariaDevice[];
};

export type UnitDirectoryItem = {
  activeResidentsCount?: number;
  id: string;
  label: string;
  type: string;
  residents: string[];
  canReceiveCalls: boolean;
  canMakeCalls: boolean;
};

export type CallRecord = {
  id: string;
  direction: CallDirection;
  endedAt: string | null;
  fromLabel: string;
  originPortariaDeviceId: string | null;
  originType: 'PORTARIA' | 'UNIT';
  originUnitId: string | null;
  toLabel: string;
  status: CallStatus;
  startedAt: string;
  targetPortariaDeviceId: string | null;
  targetType: 'PORTARIA' | 'UNIT';
  unitId: string;
};

export type BackendCallRecord = {
  id: string;
  unit_id: string;
  origin_type: 'PORTARIA' | 'UNIT';
  origin_unit_id: string | null;
  origin_portaria_device_id: string | null;
  target_type: 'PORTARIA' | 'UNIT';
  target_portaria_device_id: string | null;
  status: 'RINGING' | 'ANSWERED' | 'MISSED' | 'CANCELLED';
  answered_by: string | null;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type PendingUnitCall = {
  call_id: string;
  attempt_id: string;
  unit_id: string;
  origin_type: 'PORTARIA' | 'UNIT';
  origin_unit_id: string | null;
  origin_portaria_device_id: string | null;
  target_type: 'UNIT';
  status: 'RINGING';
  started_at: string;
  attempt_started_at: string;
};

export type PendingPortariaCall = {
  call_id: string;
  unit_id: string;
  origin_type: 'UNIT';
  origin_unit_id: string | null;
  target_type: 'PORTARIA';
  target_portaria_device_id: string;
  status: 'RINGING';
  started_at: string;
};

export type PendingCalls = {
  unit_calls: PendingUnitCall[];
  portaria_calls: PendingPortariaCall[];
};
