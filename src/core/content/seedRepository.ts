import documents from '@content/seed/documents.json';
import meta from '@content/seed/meta.json';
import prompts from '@content/seed/prompts.json';
import tips from '@content/seed/tips.json';
import todos from '@content/seed/todos.json';

import type { ContentBundle } from '../types';
import type { ContentRepository } from './ContentRepository';
import { validateContent } from './validateContent';

let cached: ContentBundle | null = null;

/** Wbudowana treść z /content/seed, zwalidowana zod-em (niepoprawne rekordy są pomijane). */
export function getSeedBundle(): ContentBundle {
  if (cached) return cached;
  const { bundle, issues } = validateContent({ documents, tips, todos, prompts, meta });
  if (issues.length > 0) console.warn(`Seed: ${issues.length} problemów walidacji`, issues.slice(0, 5));
  cached = bundle;
  return bundle;
}

export const seedRepository: ContentRepository = {
  getRemoteVersion: async () => getSeedBundle().version,
  fetchBundle: async () => getSeedBundle(),
};
