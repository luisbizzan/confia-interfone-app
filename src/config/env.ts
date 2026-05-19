import Constants from 'expo-constants';

declare const process: {
  env?: Record<string, string | undefined>;
};

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

function clean(value?: string) {
  if (!value || value.startsWith('$')) {
    return '';
  }

  return value;
}

export const env = {
  supabaseUrl: clean(process.env?.EXPO_PUBLIC_SUPABASE_URL) || clean(extra.supabaseUrl),
  supabaseAnonKey: clean(process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) || clean(extra.supabaseAnonKey),
};
