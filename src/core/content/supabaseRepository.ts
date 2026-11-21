import type { SupabaseClient } from '@supabase/supabase-js';

import { CONTENT_KINDS, CONTENT_SCHEMAS, type ContentKind } from '../schemas/content';
import type { ContentBundle } from '../types';
import type { ContentRepository } from './ContentRepository';
import { CONTENT_TABLES, rowToRecord } from './mapping';

/**
 * Pobiera opublikowane treści z Supabase. Każdy rekord jest walidowany zod-em;
 * niepoprawny rekord jest pomijany (console.warn z id), a nie wywraca aplikacji.
 */
export function createSupabaseRepository(client: SupabaseClient): ContentRepository {
  return {
    async getRemoteVersion() {
      try {
        const { data, error } = await client.from('content_meta').select('version').eq('id', 1).maybeSingle();
        if (error || !data) return null;
        const v = Number((data as { version: unknown }).version);
        return Number.isFinite(v) ? v : null;
      } catch {
        return null;
      }
    },

    async fetchBundle() {
      const [meta, ...lists] = await Promise.all([
        client.from('content_meta').select('version, updated_at').eq('id', 1).maybeSingle(),
        ...CONTENT_KINDS.map((kind) => client.from(CONTENT_TABLES[kind]).select('*').eq('published', true)),
      ]);
      if (meta.error) throw new Error(meta.error.message);
      const out: Partial<Record<ContentKind, unknown[]>> = {};
      CONTENT_KINDS.forEach((kind, i) => {
        const res = lists[i];
        if (res.error) throw new Error(`${kind}: ${res.error.message}`);
        out[kind] = ((res.data ?? []) as Record<string, unknown>[]).flatMap((row) => {
          const parsed = CONTENT_SCHEMAS[kind].safeParse(rowToRecord(row));
          if (parsed.success) return [parsed.data];
          console.warn(`[content] Pomijam niepoprawny rekord ${kind}/${String(row.id)}`, parsed.error.issues.slice(0, 3));
          return [];
        });
      });
      const metaRow = meta.data as { version?: number; updated_at?: string } | null;
      return {
        version: Number(metaRow?.version ?? 0),
        updatedAt: metaRow?.updated_at ?? new Date(0).toISOString(),
        documents: out.documents ?? [],
        tips: out.tips ?? [],
        todos: out.todos ?? [],
        prompts: out.prompts ?? [],
      } as ContentBundle;
    },
  };
}
