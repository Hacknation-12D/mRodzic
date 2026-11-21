import { useEffect, useMemo } from 'react';

import type { AssistantContext } from '@/core/assistant';
import { getSuggestedPrompts } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';

import { prefetchAnswers } from './answerCache';
import { rankMatches } from './match';

export type SuggestionEntry = { question: string };

const POOL_SIZE = 12;

/**
 * Pula zalecanych pytań: dokumenty z najbliższym terminem + pytania pasujące do etapu/wieku dziecka
 * (oraz pytania z dokumentu, od którego użytkownik wszedł).
 * Brak wpisu → 3 najlepsze zalecenia; wpis ≥ 70% zgodności → najbliższe zalecenia.
 */
export function useSuggestions(childId: string | null, focusDocId: string | undefined, input: string, context: AssistantContext | null, exclude: Set<string>) {
  const { bundle, profile, statuses, today } = useContentData();

  const pool = useMemo<SuggestionEntry[]>(() => {
    if (!profile) return [];
    const fromDoc = focusDocId ? (bundle.documents.find((d) => d.id === focusDocId)?.assistantPrompts ?? []) : [];
    const base = getSuggestedPrompts(bundle, profile, statuses, today, childId, POOL_SIZE);
    return [...new Set([...fromDoc, ...base])].map((question) => ({ question }));
  }, [bundle, profile, statuses, today, childId, focusDocId]);

  const available = useMemo(() => pool.filter((e) => !exclude.has(e.question)), [pool, exclude]);

  const items = useMemo(() => {
    const q = input.trim();
    return (q ? rankMatches(q, available, 3) : available.slice(0, 3)).map((e) => e.question);
  }, [available, input]);

  const itemsKey = items.join('\n');
  useEffect(() => {
    if (context) prefetchAnswers(items, context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, context]);

  return items;
}
