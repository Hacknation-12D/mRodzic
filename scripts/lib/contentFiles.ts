import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { RawContent } from '../../src/core/content/validateContent';
import { CONTENT_KINDS } from '../../src/core/schemas/content';

export const ROOT = path.resolve(__dirname, '../..');
export const SEED_DIR = path.join(ROOT, 'content/seed');

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function readSeedFolder(dir = SEED_DIR): RawContent {
  const raw: Record<string, unknown> = {};
  for (const kind of CONTENT_KINDS) raw[kind] = readJson(path.join(dir, `${kind}.json`));
  raw.meta = readJson(path.join(dir, 'meta.json'));
  return raw as RawContent;
}

export function writeJson(file: string, data: unknown) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/** Prosty parser argumentów: --from x --format csv --dry-run */
export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}
