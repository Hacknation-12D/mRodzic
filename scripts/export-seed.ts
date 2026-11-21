/**
 * npm run content:export
 * Pobiera OPUBLIKOWANE treści z Supabase i nadpisuje content/seed/*.json
 * (posortowane po id, sformatowane), żeby wbudowany seed był aktualny.
 */
import path from 'node:path';

import { CONTENT_TABLES, rowToRecord } from '../src/core/content/mapping';
import { formatIssues, validateContent, type RawContent } from '../src/core/content/validateContent';
import { CONTENT_KINDS } from '../src/core/schemas/content';
import { readJson, SEED_DIR, writeJson } from './lib/contentFiles';
import { createAdminClient } from './lib/supabaseAdmin';

async function main() {
  const client = createAdminClient();
  const raw: Record<string, unknown> = {};

  for (const kind of CONTENT_KINDS) {
    const { data, error } = await client.from(CONTENT_TABLES[kind]).select('*').eq('published', true).order('id');
    if (error) throw new Error(`${kind}: ${error.message}`);
    raw[kind] = ((data ?? []) as Record<string, unknown>[]).map(rowToRecord);
  }
  const { data: meta, error: metaError } = await client.from('content_meta').select('version, updated_at').eq('id', 1).maybeSingle();
  if (metaError) throw new Error(metaError.message);
  const m = meta as { version: number; updated_at: string } | null;
  raw.meta = { version: Number(m?.version ?? 0), updatedAt: m?.updated_at ?? new Date().toISOString() };

  const { issues, bundle } = validateContent(raw as RawContent);
  if (issues.length > 0) {
    console.warn(`⚠ ${issues.length} rekordów z bazy nie przechodzi walidacji – pomijam je:\n${formatIssues(issues)}`);
  }

  for (const kind of CONTENT_KINDS) {
    const sorted = [...bundle[kind]].sort((a, b) => a.id.localeCompare(b.id));
    writeJson(path.join(SEED_DIR, `${kind}.json`), sorted);
    console.log(`  ↓ ${kind}.json: ${sorted.length}`);
  }
  const metaFile = path.join(SEED_DIR, 'meta.json');
  const prev = readJson(metaFile) as Record<string, unknown>;
  writeJson(metaFile, { ...prev, version: bundle.version, updatedAt: bundle.updatedAt });
  console.log(`✓ Seed zaktualizowany do wersji ${bundle.version}. Uruchom npm run content:validate.`);
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
