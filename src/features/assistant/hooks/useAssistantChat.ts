import { useMemo, useRef, useState } from 'react';

import { nowIso } from '@/core/clock/clock';
import {
  AssistantError,
  buildAssistantContext,
  getAssistantService,
  isAbortError,
  mockAssistant,
  type AssistantContext,
  type ChatMessage,
} from '@/core/assistant';
import { getDocumentById, getSuggestedPrompts } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';
import { deanonymize } from '@/core/profile/anonymize';
import { pl } from '@/shared/i18n/pl';
import { createId } from '@/shared/lib/id';

import { useChatStore } from '../chat.store';

const EMPTY: ChatMessage[] = [];

export function useAssistantChat(childId: string | null, docId: string | null) {
  const { bundle, profile, statuses, today } = useContentData();
  const threadKey = childId ?? 'all';
  const stored = useChatStore((s) => s.threads[threadKey]) ?? EMPTY;
  const append = useChatStore((s) => s.append);
  const clearThread = useChatStore((s) => s.clearThread);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const focusDoc = docId ? getDocumentById(bundle, docId) : undefined;

  const context: AssistantContext | null = useMemo(
    () => (profile ? buildAssistantContext({ bundle, profile, statuses, today, childId, focusDocumentId: focusDoc?.id }) : null),
    [bundle, profile, statuses, today, childId, focusDoc?.id],
  );

  // Wiadomości zapisane są z aliasami („Dziecko 1”) – imiona podstawiamy tylko do wyświetlenia.
  const messages = useMemo(
    () => (profile ? stored.map((m) => (m.role === 'assistant' ? { ...m, text: deanonymize(m.text, profile) } : m)) : stored),
    [stored, profile],
  );

  const suggestions = useMemo(() => {
    if (!profile) return [];
    const base = getSuggestedPrompts(bundle, profile, statuses, today, childId, 6);
    const fromDoc = focusDoc?.assistantPrompts ?? [];
    return [...new Set([...fromDoc, ...base])].slice(0, 6);
  }, [bundle, profile, statuses, today, childId, focusDoc]);

  const ask = async (history: ChatMessage[]) => {
    if (!context) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    const { service, mode } = getAssistantService();
    try {
      let reply;
      try {
        reply = await service.ask(history, context, controller.signal);
      } catch (e) {
        // Fallback: remote nie odpowiada → mock (z informacją w bańce).
        if (mode === 'remote' && !isAbortError(e)) {
          reply = { ...(await mockAssistant.ask(history, context, controller.signal)), usedFallback: true };
        } else throw e;
      }
      append(threadKey, {
        id: createId('m_'),
        role: 'assistant',
        text: reply.text,
        createdAt: nowIso(),
        sources: reply.sources,
        usedFallback: reply.usedFallback,
        suggestHuman: reply.suggestHuman,
      });
    } catch (e) {
      if (isAbortError(e)) setError(pl.assistant.stopped);
      else setError(e instanceof AssistantError ? `${pl.assistant.networkError} (${e.kind})` : pl.assistant.networkError);
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const message: ChatMessage = { id: createId('m_'), role: 'user', text: trimmed.slice(0, 2000), createdAt: nowIso() };
    append(threadKey, message);
    void ask([...stored, message]);
  };

  /** Ponawia ostatnie pytanie (po błędzie sieci). */
  const retry = () => {
    if (pending || stored.length === 0 || stored[stored.length - 1].role !== 'user') return;
    void ask(stored);
  };

  return {
    messages,
    suggestions,
    pending,
    error,
    focusDoc,
    send,
    retry,
    canRetry: !pending && stored.length > 0 && stored[stored.length - 1].role === 'user',
    stop: () => abortRef.current?.abort(),
    newChat: () => {
      abortRef.current?.abort();
      setError(null);
      clearThread(threadKey);
    },
    context,
  };
}
