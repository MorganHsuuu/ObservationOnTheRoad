export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少環境變數 ${name}`);
  }
  return value;
}
