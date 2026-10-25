import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { usernameToInternalEmail, normalizeUsername } from './auth-logic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-supabase-anon-key'
);

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Disable magic-link / URL token sign-in per Section 2
      },
    });
  }
  return clientInstance;
}

/**
 * Authenticates with Supabase Auth using ONLY username + password.
 * Maps the unique username internally to `<username>@auth.aegis-vanguard.internal`
 * so email is never exposed or required at sign-in.
 */
export async function signInWithSupabaseUsername(
  username: string,
  password: string
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { configured: false as const };
  }
  const internalEmail = usernameToInternalEmail(normalizeUsername(username));
  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });
  return {
    configured: true as const,
    data,
    error,
  };
}
