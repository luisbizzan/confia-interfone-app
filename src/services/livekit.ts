import { supabase } from './supabase';

export type LiveKitJoinInfo = {
  expiresInSeconds: number;
  identity: string;
  roomName: string;
  serverUrl: string;
  token: string;
};

export async function getLiveKitJoinInfo(callId: string): Promise<LiveKitJoinInfo> {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      call_id: callId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.serverUrl || !data?.token || !data?.roomName) {
    throw new Error('Token de voz nao retornado pelo backend.');
  }

  return data as LiveKitJoinInfo;
}
