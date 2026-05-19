export type AppProfile = 'resident' | 'gatehouse';

export type BackendRole = 'ADMIN' | 'MANAGER' | 'MORADOR' | 'PORTARIA' | string;

export type CallStatus = 'ringing' | 'answered' | 'missed' | 'ended';

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
  unit_members: UserContextUnit[];
  portaria_devices: UserContextPortariaDevice[];
};

export type UnitDirectoryItem = {
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
  fromLabel: string;
  toLabel: string;
  status: CallStatus;
  startedAt: string;
};
