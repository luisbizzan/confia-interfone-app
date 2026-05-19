export type AppProfile = 'resident' | 'gatehouse';

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
