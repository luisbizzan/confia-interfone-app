const clean = (value) => {
  if (!value || value.startsWith('$')) {
    return undefined;
  }

  return value;
};

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    enableErrorTest: clean(process.env.EXPO_PUBLIC_ENABLE_ERROR_TEST) ?? config.extra?.enableErrorTest,
    supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL) ?? config.extra?.supabaseUrl,
    supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ?? config.extra?.supabaseAnonKey,
  },
});
