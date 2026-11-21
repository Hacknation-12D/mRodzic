import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'node:path';

import { ROOT } from './contentFiles';

config({ path: path.join(ROOT, '.env'), quiet: true });

/**
 * Klient z kluczem SERVICE ROLE – tylko dla skryptów Node (omija RLS).
 * NIGDY nie używaj tego klucza w aplikacji.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('✗ Brak SUPABASE_URL i/lub SUPABASE_SERVICE_ROLE_KEY w .env (patrz .env.example).');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hasAdminConfig(): boolean {
  return Boolean((process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
