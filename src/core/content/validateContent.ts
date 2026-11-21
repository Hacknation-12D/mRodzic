import { CONTENT_KINDS, CONTENT_SCHEMAS, ContentMetaSchema, type ContentKind } from '../schemas/content';
import type { ContentBundle } from '../types';

export type ContentIssue = { file: string; id: string; path: string; message: string };

export type RawContent = Record<ContentKind, unknown> & { meta: unknown };

export type ValidationReport = {
  issues: ContentIssue[];
  /** Poprawny bundle (tylko rekordy, które przeszły walidację). */
  bundle: ContentBundle;
};

function recordId(raw: unknown, index: number): string {
  if (raw && typeof raw === 'object' && 'id' in raw && typeof (raw as { id: unknown }).id === 'string') {
    return (raw as { id: string }).id;
  }
  return `#${index}`;
}

/**
 * Waliduje surową treść (JSON z seeda, CSV po parsowaniu, rekordy z Supabase)
 * tymi samymi schematami zod co aplikacja + reguły między rekordami:
 * unikalne id, poprawne relatedDocumentId (knownDocumentIds – dokumenty już istniejące, np. w bazie).
 */
export function validateContent(raw: RawContent, options: { knownDocumentIds?: Iterable<string> } = {}): ValidationReport {
  const issues: ContentIssue[] = [];
  const valid: Partial<Record<ContentKind, unknown[]>> = {};

  for (const kind of CONTENT_KINDS) {
    const file = `${kind}.json`;
    const list = raw[kind];
    if (!Array.isArray(list)) {
      issues.push({ file, id: '-', path: '', message: 'Oczekiwano tablicy rekordów' });
      valid[kind] = [];
      continue;
    }
    const seen = new Set<string>();
    const ok: unknown[] = [];
    list.forEach((item, index) => {
      const id = recordId(item, index);
      const parsed = CONTENT_SCHEMAS[kind].safeParse(item);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          issues.push({ file, id, path: issue.path.join('.'), message: issue.message });
        }
        return;
      }
      if (seen.has(id)) {
        issues.push({ file, id, path: 'id', message: 'Zduplikowane id' });
        return;
      }
      seen.add(id);
      ok.push(parsed.data);
    });
    valid[kind] = ok;
  }

  const meta = ContentMetaSchema.safeParse(raw.meta);
  if (!meta.success) {
    for (const issue of meta.error.issues) issues.push({ file: 'meta.json', id: '-', path: issue.path.join('.'), message: issue.message });
  }

  const bundle = {
    version: meta.success ? meta.data.version : 0,
    updatedAt: meta.success ? meta.data.updatedAt : new Date(0).toISOString(),
    documents: (valid.documents ?? []) as ContentBundle['documents'],
    tips: (valid.tips ?? []) as ContentBundle['tips'],
    todos: (valid.todos ?? []) as ContentBundle['todos'],
    prompts: (valid.prompts ?? []) as ContentBundle['prompts'],
  } satisfies ContentBundle;

  const docIds = new Set([...bundle.documents.map((d) => d.id), ...(options.knownDocumentIds ?? [])]);
  for (const todo of bundle.todos) {
    if (todo.relatedDocumentId && !docIds.has(todo.relatedDocumentId)) {
      issues.push({
        file: 'todos.json',
        id: todo.id,
        path: 'relatedDocumentId',
        message: `Nie ma dokumentu o id "${todo.relatedDocumentId}"`,
      });
    }
  }
  for (const doc of bundle.documents) {
    const reqIds = new Set<string>();
    for (const req of doc.requirements) {
      if (reqIds.has(req.id)) issues.push({ file: 'documents.json', id: doc.id, path: `requirements.${req.id}`, message: 'Zduplikowane id wymagania' });
      reqIds.add(req.id);
    }
    if (doc.timing.showTo !== undefined && doc.timing.showTo < doc.timing.showFrom) {
      issues.push({ file: 'documents.json', id: doc.id, path: 'timing', message: 'showTo < showFrom' });
    }
  }

  return { issues, bundle };
}

export function formatIssues(issues: ContentIssue[]): string {
  return issues.map((i) => `  ✗ ${i.file} [${i.id}] ${i.path || '(rekord)'}: ${i.message}`).join('\n');
}
