import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '../config/env';

let client: SupabaseClient | null | undefined;

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
