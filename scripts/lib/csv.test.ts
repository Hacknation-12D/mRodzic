import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { CONTENT_COLUMNS, recordToRow, rowToRecord } from '../../src/core/content/mapping';
import { validateContent, type RawContent } from '../../src/core/content/validateContent';
import { CONTENT_KINDS } from '../../src/core/schemas/content';
import { readSeedFolder } from './contentFiles';
import { parseCsvRecords } from './csv';

const IMPORT_DIR = path.resolve(__dirname, '../../content/import');

describe('CSV import format', () => {
  it('parses JSON cells, numbers, booleans and empty cells', () => {
    const { records, errors } = parseCsvRecords('id,priority,needsReview,timing,visibleWhen\nx,3,true,"{""showFrom"": -14}",\n');
    expect(errors).toEqual([]);
    expect(records).toEqual([{ id: 'x', priority: 3, needsReview: true, timing: { showFrom: -14 } }]);
  });

  it('reports broken JSON and numbers with row/column', () => {
    const { errors } = parseCsvRecords('id,priority,timing\nx,abc,"{broken"\n');
    expect(errors.map((e) => `${e.row}:${e.column}`)).toEqual(['2:priority', '2:timing']);
  });

  it('example CSV files in content/import are valid', () => {
    const raw: Record<string, unknown> = { meta: { version: 0, updatedAt: '2026-11-21' } };
    for (const kind of CONTENT_KINDS) {
      const { records, errors } = parseCsvRecords(readFileSync(path.join(IMPORT_DIR, `${kind}.csv`), 'utf8'));
      expect(errors).toEqual([]);
      expect(records).toHaveLength(2);
      raw[kind] = records;
    }
    const seedDocIds = (readSeedFolder().documents as { id: string }[]).map((d) => d.id);
    const { issues } = validateContent(raw as RawContent, { knownDocumentIds: seedDocIds });
    expect(issues).toEqual([]);
  });
});

describe('snake_case ↔ camelCase mapping', () => {
  it('round-trips seed records through DB rows', () => {
    const seed = readSeedFolder();
    for (const kind of CONTENT_KINDS) {
      for (const record of seed[kind] as Record<string, unknown>[]) {
        const row = { ...recordToRow(record, CONTENT_COLUMNS[kind]), published: true, updated_at: 'x' };
        expect(rowToRecord(row)).toEqual(record);
      }
    }
  });
});
