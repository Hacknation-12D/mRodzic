import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateContent, type RawContent } from './validateContent';

const SEED_DIR = path.resolve(__dirname, '../../../content/seed');
const read = (name: string): unknown => JSON.parse(readFileSync(path.join(SEED_DIR, `${name}.json`), 'utf8'));

function loadSeed(): RawContent {
  return { documents: read('documents'), tips: read('tips'), todos: read('todos'), prompts: read('prompts'), meta: read('meta') };
}

describe('seed content', () => {
  it('has no validation issues', () => {
    const { issues } = validateContent(loadSeed());
    expect(issues).toEqual([]);
  });

  it('marks every document as needsReview with asOf 2026-11', () => {
    const { bundle } = validateContent(loadSeed());
    for (const doc of bundle.documents) {
      expect(doc.needsReview).toBe(true);
      expect(doc.source.asOf).toBe('2026-11');
    }
  });
});

describe('validateContent catches content errors', () => {
  const base = loadSeed();
  const docs = base.documents as Record<string, unknown>[];

  it('detects fact-key typos in rules', () => {
    const broken = structuredClone(docs);
    broken[0].visibleWhen = { fact: 'child.premture', op: 'eq', value: true };
    const { issues, bundle } = validateContent({ ...base, documents: broken });
    expect(issues.some((i) => i.id === broken[0].id && i.path.startsWith('visibleWhen'))).toBe(true);
    expect(bundle.documents).toHaveLength(docs.length - 1);
  });

  it('detects duplicate ids, bad URLs and bad asOf', () => {
    const broken = structuredClone(docs);
    broken[1].id = broken[0].id;
    broken[2].links = [{ label: 'x', url: 'not a url', kind: 'apply' }];
    broken[3].source = { name: 'x', asOf: '2026-13' };
    const { issues } = validateContent({ ...base, documents: broken });
    expect(issues.some((i) => i.message === 'Zduplikowane id')).toBe(true);
    expect(issues.some((i) => i.path.startsWith('links'))).toBe(true);
    expect(issues.some((i) => i.path === 'source.asOf')).toBe(true);
  });

  it('detects missing relatedDocumentId targets', () => {
    const todos = structuredClone(base.todos as Record<string, unknown>[]);
    todos[0].relatedDocumentId = 'nie-istnieje';
    const { issues } = validateContent({ ...base, todos });
    expect(issues.some((i) => i.path === 'relatedDocumentId')).toBe(true);
  });
});
