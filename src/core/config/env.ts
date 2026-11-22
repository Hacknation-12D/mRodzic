/**
 * Odczyt zmiennych EXPO_PUBLIC_*. Brak zmiennej nigdy nie rzuca błędu –
 * aplikacja wtedy działa na wbudowanym seedzie i asystencie mock.
 *
 * Uwaga: Expo podmienia `process.env.EXPO_PUBLIC_X` statycznie przy bundlowaniu,
 * dlatego każdą zmienną odczytujemy literalnie (bez dynamicznych kluczy).
 */
export type AssistantMode = 'mock' | 'remote';
export type PersonaId = 'ania' | 'magda' | 'kasia';

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

const supabaseUrl = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const assistantModeRaw = clean(process.env.EXPO_PUBLIC_ASSISTANT_MODE);
const demoApiUrl = clean(process.env.EXPO_PUBLIC_DEMO_API_URL)?.replace(/\/+$/, '');

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  assistantMode: (assistantModeRaw === 'remote' ? 'remote' : 'mock') as AssistantMode,
  demoApiUrl,
} as const;
