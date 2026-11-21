import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '../config/env';

let client: SupabaseClient | null | undefined;
let familyClient: SupabaseClient | null | undefined;

/**
 * Klient Supabase (klucz anon) albo null, jeśli brak konfiguracji.
 * Nie używamy auth – sesja nie jest zapisywana.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    env.supabaseUrl && env.supabaseAnonKey
      ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        })
      : null;
  return client;
}

/** Osobna sesja konta rodziny. Klient katalogu i asystenta działa niezależnie. */
export function getFamilySupabase(): SupabaseClient | null {
  if (familyClient === undefined) {
    familyClient = env.supabaseUrl && env.supabaseAnonKey
      ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
          auth: { storageKey: 'mrodzic-family-auth', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        })
      : null;
  }
  return familyClient;
}

export function clearFamilySession() {
  const previous = familyClient;
  familyClient = undefined;
  if (previous) void previous.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

export function isFamilyPasswordLoginEnabled() {
  if (process.env.EXPO_PUBLIC_ENABLE_TEST_LOGIN === 'true') return true;
  if (!env.supabaseUrl) return false;
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.supabaseUrl).hostname);
  } catch {
    return false;
  }
}
