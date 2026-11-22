/**
 * Zapisany zestaw parametrów prawnych + historia zmian (panel administracyjny `/admin`).
 *
 * Kolejność źródeł: zapis lokalny (panel) → najnowszy opublikowany zestaw z Supabase (`legal_parameters`)
 * → wartości domyślne z kodu. Każda zmiana przechodzi walidację zod i reguły spójności.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

import { persistStorage, STORAGE_PREFIX } from '../storage/storage';
import { getSupabase } from '../supabase/client';
import { DEFAULT_LEGAL_PARAMETERS, LegalParametersSchema, resetLegalParameters, setLegalParameters, type LegalParameters } from './parameters';

const HistoryEntry = z.object({ at: z.string(), version: z.string(), note: z.string(), source: z.enum(['admin', 'server', 'reset', 'import']) });
export type LegalHistoryEntry = z.infer<typeof HistoryEntry>;

type State = {
  /** Zestaw ustawiony w panelu; null = domyślny (lub z serwera). */
  active: LegalParameters | null;
  history: LegalHistoryEntry[];
  /** Licznik zmian – do odświeżania obliczeń w ekranach. */
  revision: number;
  save: (params: unknown, source?: LegalHistoryEntry['source']) => string[];
  reset: () => void;
};

const now = () => new Date().toISOString();

export const useLegalStore = create<State>()(
  persist(
    (set, get) => ({
      active: null,
      history: [],
      revision: 0,
      save: (params, source = 'admin') => {
        const errors = setLegalParameters(params);
        if (errors.length) return errors;
        const p = LegalParametersSchema.parse(params);
        set({
          active: p,
          revision: get().revision + 1,
          history: [{ at: now(), version: p.version, note: p.note, source }, ...get().history].slice(0, 50),
        });
        return [];
      },
      reset: () => {
        resetLegalParameters();
        set({
          active: null,
          revision: get().revision + 1,
          history: [{ at: now(), version: DEFAULT_LEGAL_PARAMETERS.version, note: 'Przywrócono wartości domyślne.', source: 'reset' as const }, ...get().history].slice(0, 50),
        });
      },
    }),
    {
      name: `${STORAGE_PREFIX}legal-v1`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ active: s.active, history: s.history }),
      merge: (saved, current) => {
        const parsed = z.object({ active: LegalParametersSchema.nullable(), history: z.array(HistoryEntry) }).safeParse(saved);
        if (!parsed.success) return current;
        // Zapis niezgodny z aktualnymi regułami spójności jest pomijany – zostają wartości domyślne.
        const active = parsed.data.active && setLegalParameters(parsed.data.active).length === 0 ? parsed.data.active : null;
        return { ...current, active, history: parsed.data.history };
      },
    },
  ),
);

/** Pobiera najnowszy opublikowany zestaw z Supabase, jeśli w panelu nie ustawiono lokalnego. */
export async function syncLegalParameters(): Promise<void> {
  const client = getSupabase();
  if (!client || useLegalStore.getState().active) return;
  try {
    const { data, error } = await client
      .from('legal_parameters')
      .select('params')
      .eq('published', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    const parsed = LegalParametersSchema.safeParse(data.params);
    if (parsed.success && setLegalParameters(parsed.data).length === 0) {
      useLegalStore.setState((s) => ({ revision: s.revision + 1 }));
    }
  } catch {
    // Brak sieci – zostają wartości domyślne.
  }
}

/** Hook do zależności `useMemo` w ekranach liczących – zmienia się po każdej zmianie parametrów. */
export function useLegalRevision(): number {
  return useLegalStore((s) => s.revision);
}
