import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_COLUMNS, CONTENT_TABLES, recordToRow } from '../src/core/content/mapping';
import { formatIssues, validateContent } from '../src/core/content/validateContent';
import { CONTENT_KINDS } from '../src/core/schemas/content';
import { readSeedFolder, ROOT, SEED_DIR } from './lib/contentFiles';

const { bundle, issues } = validateContent(readSeedFolder(SEED_DIR));
if (issues.length > 0) {
  console.error(formatIssues(issues));
  process.exit(1);
}

const statements = [
  '-- Plik generowany poleceniem npm run content:seed-sql z content/seed/*.json.',
  '-- Uruchom po migracjach. Istniejące rekordy treści zachowują swoje wartości.',
  'begin;',
  'set local standard_conforming_strings = on;',
  'insert into public.content_meta (id, version) values (1, 0) on conflict (id) do nothing;',
];

for (const kind of CONTENT_KINDS) {
  const table = `public.${CONTENT_TABLES[kind]}`;
  const columns = CONTENT_COLUMNS[kind].join(', ');
  const rows = bundle[kind].map((record) => recordToRow(record, CONTENT_COLUMNS[kind]));
  if (rows.length === 0) continue;
  const json = JSON.stringify(rows, null, 2).replaceAll("'", "''");
  statements.push(`
insert into ${table} (${columns})
select ${columns}
from jsonb_populate_recordset(null::${table}, '${json}'::jsonb)
on conflict (id) do nothing;`);
}

statements.push('commit;', '');
writeFileSync(path.join(ROOT, 'supabase/seed.sql'), statements.join('\n'), 'utf8');
