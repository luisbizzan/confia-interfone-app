import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import type { AppProfile, AuthenticatedUser, UnitDirectoryItem, UserContext } from '../types/domain';

export type LoadedAuthState =
  | {
      status: 'authenticated';
      session: Session;
      user: AuthenticatedUser;
      context: UserContext;
      units: UnitDirectoryItem[];
    }
  | {
      status: 'unauthenticated';
    };

export async function signInWithEmail(email: string, password: string): Promise<LoadedAuthState> {
  if (!supabase) {
    throw new Error('Supabase nao configurado. Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error('Sessao nao retornada pelo Supabase.');
  }

  return loadAuthenticatedState(data.session);
}

export async function loadCurrentAuthState(): Promise<LoadedAuthState> {
  if (!supabase) {
    return { status: 'unauthenticated' };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return { status: 'unauthenticated' };
  }

  return loadAuthenticatedState(data.session);
}

export async function signOut() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

async function loadAuthenticatedState(session: Session): Promise<LoadedAuthState> {
  if (!supabase) {
    return { status: 'unauthenticated' };
  }

  const { data, error } = await supabase.rpc('get_current_user_context');

  if (error) {
    throw new Error(error.message);
  }

  const context = data as UserContext;
  const profile = resolveAppProfile(context);

  if (!profile) {
    throw new Error('Usuario sem perfil operacional ativo no app.');
  }

  const [condominiumName, units] = await Promise.all([
    loadCondominiumName(context.profile.condominium_id),
    loadDirectoryUnits(),
  ]);

  return {
    status: 'authenticated',
    session,
    context,
    units,
    user: {
      id: session.user.id,
      name: session.user.user_metadata?.name ?? session.user.email ?? 'Usuario Confia',
      email: session.user.email ?? '',
      condominiumId: context.profile.condominium_id,
      condominiumName,
      profile,
    },
  };
}

function resolveAppProfile(context: UserContext): AppProfile | null {
  if (context.profile.role === 'PORTARIA' && context.portaria_devices.some((device) => device.is_active)) {
    return 'gatehouse';
  }

  if (context.profile.role === 'MORADOR' && context.unit_members.some((member) => member.active_for_calls)) {
    return 'resident';
  }

  return null;
}

async function loadCondominiumName(condominiumId: string) {
  if (!supabase) {
    return 'Condominio vinculado';
  }

  const { data } = await supabase.from('condominiums').select('name').eq('id', condominiumId).maybeSingle();
  return data?.name ?? 'Condominio vinculado';
}

async function loadDirectoryUnits(): Promise<UnitDirectoryItem[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('units')
    .select('id,type,block,number,unit_members(id,member_type,active_for_calls,can_receive_calls,can_make_calls)')
    .order('block', { ascending: true, nullsFirst: true })
    .order('number', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((unit) => {
    const members = Array.isArray(unit.unit_members) ? unit.unit_members : [];
    const activeReceivers = members.filter((member) => member.active_for_calls && member.can_receive_calls);
    const activeCallers = members.filter((member) => member.active_for_calls && member.can_make_calls);

    return {
      activeResidentsCount: activeReceivers.length,
      id: unit.id,
      isBusy: false,
      label: [unit.block, unit.number].filter(Boolean).join(' - '),
      type: unit.type === 'HOUSE' ? 'Casa' : 'Apartamento',
      residents: [activeReceivers.length > 0 ? `${activeReceivers.length} morador(es) ativo(s)` : 'Sem morador ativo para chamadas'],
      canReceiveCalls: activeReceivers.length > 0,
      canMakeCalls: activeCallers.length > 0,
    };
  });
}
