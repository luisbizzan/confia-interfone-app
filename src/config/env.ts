import Constants from 'expo-constants';

declare const process: {
  env?: Record<string, string | undefined>;
};

type ExtraConfig = {
  enableErrorTest?: string;
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
  enableErrorTest: (clean(extra.enableErrorTest) || clean(process.env?.EXPO_PUBLIC_ENABLE_ERROR_TEST)) === 'true',
  supabaseUrl: clean(extra.supabaseUrl) || clean(process.env?.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(extra.supabaseAnonKey) || clean(process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY),
};
