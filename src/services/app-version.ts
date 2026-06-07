import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import { supabase } from './supabase';

type AppVersionPolicyRow = {
  is_required: boolean;
  latest_build: number | null;
  latest_version: string | null;
  message: string;
  minimum_build: number;
  minimum_version: string;
  platform: 'android' | 'ios' | 'web';
  update_url: string | null;
};

export type AppVersionPolicy =
  | { status: 'ok'; currentBuild: number; currentVersion: string; latestBuild: number | null; latestVersion: string | null }
  | {
      status: 'update_required';
      currentBuild: number;
      currentVersion: string;
      message: string;
      minimumBuild: number;
      minimumVersion: string;
      updateUrl: string | null;
    }
  | { status: 'unavailable'; reason: string };

export async function checkAppVersionPolicy(): Promise<AppVersionPolicy> {
  const currentBuild = getCurrentBuildNumber();
  const currentVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.0.0';

  if (!supabase) {
    return { status: 'unavailable', reason: 'Supabase nao configurado.' };
  }

  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const { data, error } = await supabase
    .from('app_version_policies')
    .select('platform,minimum_version,minimum_build,latest_version,latest_build,update_url,message,is_required')
    .eq('platform', platform)
    .maybeSingle<AppVersionPolicyRow>();

  if (error || !data) {
    return { status: 'unavailable', reason: error?.message ?? 'Politica de versao ausente.' };
  }

  if (data.is_required && currentBuild > 0 && currentBuild < data.minimum_build) {
    return {
      status: 'update_required',
      currentBuild,
      currentVersion,
      message: data.message,
      minimumBuild: data.minimum_build,
      minimumVersion: data.minimum_version,
      updateUrl: data.update_url,
    };
  }

  return {
    status: 'ok',
    currentBuild,
    currentVersion,
    latestBuild: data.latest_build,
    latestVersion: data.latest_version,
  };
}

export async function openAppUpdateUrl(updateUrl: string | null) {
  if (!updateUrl) {
    return;
  }

  const canOpen = await Linking.canOpenURL(updateUrl);

  if (canOpen) {
    await Linking.openURL(updateUrl);
  }
}

function getCurrentBuildNumber() {
  const build = Constants.nativeBuildVersion ?? '0';
  const parsed = Number.parseInt(build, 10);

  return Number.isFinite(parsed) ? parsed : 0;
}
