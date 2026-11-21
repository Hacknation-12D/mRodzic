/**
 * npm run content:import -- --from content/import --format csv [--dry-run]
 * npm run content:import -- --from content/seed --format json [--dry-run]
 *
 * CSV/JSON → walidacja (te same schematy zod co aplikacja) → upsert do Supabase (klucz service role).
 * Przy jakimkolwiek błędzie walidacji nic nie jest wgrywane.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_COLUMNS, CONTENT_TABLES, recordToRow } from '../src/core/content/mapping';
import { formatIssues, validateContent, type RawContent } from '../src/core/content/validateContent';
import { CONTENT_KINDS, type ContentKind } from '../src/core/schemas/content';
import { parseArgs, readSeedFolder, ROOT, SEED_DIR } from './lib/contentFiles';
import { parseCsvRecords } from './lib/csv';
import { createAdminClient, hasAdminConfig } from './lib/supabaseAdmin';

function readCsvFolder(dir: string): { raw: RawContent; errors: string[] } {
  const raw: Record<string, unknown> = { meta: { version: 0, updatedAt: new Date().toISOString() } };
  const errors: string[] = [];
  for (const kind of CONTENT_KINDS) {
    const file = path.join(dir, `${kind}.csv`);
    if (!existsSync(file)) {
      raw[kind] = [];
      continue;
    }
    const { records, errors: cellErrors } = parseCsvRecords(readFileSync(file, 'utf8'));
    raw[kind] = records;
    for (const e of cellErrors) errors.push(`  ✗ ${kind}.csv wiersz ${e.row}, kolumna ${e.column}: ${e.message}`);
  }
  return { raw: raw as RawContent, errors };
}

async function existingDocumentIds(): Promise<string[]> {
  // relatedDocumentId może wskazywać dokument już opublikowany (w bazie) albo z seeda.
  const seedIds = (readSeedFolder(SEED_DIR).documents as { id: string }[]).map((d) => d.id);
  if (!hasAdminConfig()) return seedIds;
  const { data } = await createAdminClient().from(CONTENT_TABLES.documents).select('id');
  return [...seedIds, ...((data ?? []) as { id: string }[]).map((d) => d.id)];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const format = args.format === 'json' ? 'json' : 'csv';
  const from = path.resolve(ROOT, typeof args.from === 'string' ? args.from : format === 'json' ? 'content/seed' : 'content/import');
  const dryRun = args['dry-run'] === true;

  console.log(`Import treści: ${from} (format: ${format}${dryRun ? ', dry-run' : ''})`);

  const { raw, errors: parseErrors } = format === 'json' ? { raw: readSeedFolder(from), errors: [] as string[] } : readCsvFolder(from);
  const { issues, bundle } = validateContent(raw, { knownDocumentIds: await existingDocumentIds() });

  if (parseErrors.length > 0 || issues.length > 0) {
    console.error(`\n✗ Błędy (${parseErrors.length + issues.length}) – nic nie zostało wgrane:`);
    if (parseErrors.length) console.error(parseErrors.join('\n'));
    if (issues.length) console.error(formatIssues(issues));
    process.exit(1);
  }

  const counts = CONTENT_KINDS.map((k) => `${k}: ${bundle[k].length}`).join(', ');
  console.log(`✓ Walidacja OK (${counts})`);
  if (dryRun) {
    console.log('Dry-run: pomijam zapis do Supabase.');
    return;
  }

  const client = createAdminClient();
  // Kolejność: dokumenty przed todo (klucz obcy related_document_id).
  const order: ContentKind[] = ['documents', 'tips', 'todos', 'prompts'];
  for (const kind of order) {
    const records = bundle[kind] as unknown as Record<string, unknown>[];
    if (records.length === 0) continue;
    const rows = records.map((r) => ({ ...recordToRow(r, CONTENT_COLUMNS[kind]), published: true }));
    const { error } = await client.from(CONTENT_TABLES[kind]).upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error(`✗ ${kind}: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ↑ ${kind}: ${rows.length}`);
  }
  const { data: meta } = await client.from('content_meta').select('version').eq('id', 1).maybeSingle();
  console.log(`✓ Zaimportowano. Wersja treści w bazie: ${(meta as { version?: number } | null)?.version ?? '?'} – aplikacja pobierze ją przy następnej synchronizacji.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
