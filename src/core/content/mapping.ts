import type { ContentKind } from '../schemas/content';

/** Nazwy tabel Supabase dla typów treści. */
export const CONTENT_TABLES: Record<ContentKind, string> = {
  documents: 'content_documents',
  tips: 'content_tips',
  todos: 'content_todos',
  prompts: 'content_prompts',
};

/** Kolumny techniczne, których nie ma w schematach zod. */
const TECHNICAL_COLUMNS = new Set(['published', 'updated_at', 'created_at']);

export const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Wiersz z bazy (snake_case, null) → rekord treści (camelCase, brak pola zamiast null). Tylko klucze najwyższego poziomu. */
export function rowToRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (TECHNICAL_COLUMNS.has(key) || value === null) continue;
    out[toCamel(key)] = value;
  }
  return out;
}

/** Rekord treści → wiersz do upsertu (snake_case; brakujące pola opcjonalne → null). */
export function recordToRow(record: Record<string, unknown>, columns: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of columns) {
    const value = record[toCamel(col)];
    out[col] = value === undefined ? null : value;
  }
  return out;
}

/** Kolumny treści (bez technicznych) – kolejność jak w migracji. */
export const CONTENT_COLUMNS: Record<ContentKind, readonly string[]> = {
  documents: [
    'id', 'scope', 'category', 'title', 'summary', 'body_md', 'timing', 'visible_when', 'requirements', 'links',
    'checklist', 'assistant_prompts', 'amount_label', 'tags', 'source', 'needs_review', 'priority',
  ],
  tips: ['id', 'title', 'summary_md', 'body_md', 'timing', 'visible_when', 'tags', 'source', 'priority'],
  todos: ['id', 'title', 'description_md', 'timing', 'visible_when', 'category', 'related_document_id', 'source', 'priority'],
  prompts: ['id', 'text', 'timing', 'visible_when'],
};
