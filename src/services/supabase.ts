import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { env } from '../config/env';

const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
};

const authStorage = Platform.OS === 'web' ? secureStorage : secureStorage;

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: authStorage,
      },
    })
  : null;
