import type { CallRecord, UnitDirectoryItem } from '../types/domain';

export const demoUnits: UnitDirectoryItem[] = [
  {
    id: 'unit-102',
    label: 'R - 102',
    type: 'Apartamento',
    residents: ['Usuario 6a0ba005'],
    canReceiveCalls: true,
    canMakeCalls: true,
  },
  {
    id: 'unit-201',
    label: 'R - 201',
    type: 'Apartamento',
    residents: ['Familia Andrade'],
    canReceiveCalls: true,
    canMakeCalls: true,
  },
  {
    id: 'unit-305',
    label: 'Casa 305',
    type: 'Casa',
    residents: ['Marina Costa'],
    canReceiveCalls: false,
    canMakeCalls: true,
  },
];

export const demoCalls: CallRecord[] = [
  {
    id: 'call-1',
    direction: 'resident_to_gatehouse',
    endedAt: 'Hoje, 09:43',
    fromLabel: 'R - 102',
    toLabel: 'Portaria',
    status: 'answered',
    startedAt: 'Hoje, 09:42',
  },
  {
    id: 'call-2',
    direction: 'resident_to_unit',
    endedAt: 'Hoje, 08:18',
    fromLabel: 'R - 102',
    toLabel: 'R - 201',
    status: 'missed',
    startedAt: 'Hoje, 08:17',
  },
  {
    id: 'call-3',
    direction: 'gatehouse_to_unit',
    endedAt: null,
    fromLabel: 'Portaria',
    toLabel: 'Casa 305',
    status: 'ringing',
    startedAt: 'Agora',
  },
];
