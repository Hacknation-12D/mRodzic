import type { AssistantContext, AssistantReply } from '@/core/assistant';
import { mockAssistant } from '@/core/assistant';
import { nowIso } from '@/core/clock/clock';
import { createId } from '@/shared/lib/id';

import { norm } from './match';

/**
 * MOCK: cache gotowych odpowiedzi na proponowane pytania.
 * Docelowo odpowiedzi będą przygotowywane po stronie serwera i pobierane z cache –
 * wystarczy podmienić `produce`.
 */
const cache = new Map<string, Promise<AssistantReply>>();

async function produce(question: string, ctx: AssistantContext): Promise<AssistantReply> {
  return mockAssistant.ask([{ id: createId('m_'), role: 'user', text: question, createdAt: nowIso() }], ctx);
}

export function getCachedAnswer(question: string, ctx: AssistantContext, contentVersion = ctx.contentVersion): Promise<AssistantReply> {
  const key = `${contentVersion}|${ctx.focusDocumentId ?? ''}|${norm(question)}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = produce(question, ctx).catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, hit);
  }
  return hit;
}

/** Rozgrzewa cache dla podanych pytań (wynik niepotrzebny od razu). */
export function prefetchAnswers(questions: string[], ctx: AssistantContext): void {
  for (const q of questions) void getCachedAnswer(q, ctx).catch(() => undefined);
}
