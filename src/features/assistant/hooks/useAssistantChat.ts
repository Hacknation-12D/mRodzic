import { useMemo, useRef, useState } from 'react';

import { nowIso } from '@/core/clock/clock';
import {
  AssistantError,
  buildAssistantContext,
  getAssistantService,
  humanSupport,
  isAbortError,
  mockAssistant,
  type AssistantContext,
  type ChatMessage,
} from '@/core/assistant';
import { getDocumentById } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';
import { deanonymize } from '@/core/profile/anonymize';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { createId } from '@/shared/lib/id';

import { useChatStore } from '../chat.store';
import { MAX_INPUT_CHARS } from '../limits';
import { askLlm, isLlmConfigured } from '../llm/llmAssistant';
import { getCachedAnswer } from '../suggestions/answerCache';

const EMPTY: ChatMessage[] = [];

/** Okno czasowe dokumentu względem porodu (dni → tygodnie/miesiące), dla modelu. */
function dayLabel(days: number): string {
  if (days < 0) return `${40 - Math.round(-days / 7)}. tydzień ciąży`;
  if (days < 60) return `${Math.round(days / 7)}. tydzień życia dziecka`;
  return `${Math.round(days / 30.4)}. miesiąc życia dziecka`;
}
function timingWindow(t: { showFrom: number; showTo?: number; deadline?: number }): string {
  const parts = [`od: ${dayLabel(t.showFrom)}`];
  if (t.showTo !== undefined) parts.push(`do: ${dayLabel(t.showTo)}`);
  if (t.deadline !== undefined) parts.push(`ostateczny termin: ${dayLabel(t.deadline)}`);
  return parts.join(', ');
}

/** `handoffEmail` ustawiony → rozmowa przekazana człowiekowi: AI nie odpowiada, wiadomości trafiają do zespołu. */
export function useAssistantChat(childId: string | null, docId: string | null, handoffEmail: string | null = null) {
  const { bundle, profile, statuses, today } = useContentData();
  const demoProfileId = useProfileStore((s) => s.demoProfileId);
  const threadKey = demoProfileId ? `demo:${demoProfileId}:${childId ?? 'all'}` : childId ?? 'all';
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

  /** Wiedza dla modelu: dokumenty najbliższe terminem (+ ten, od którego użytkownik wszedł). */
  const knowledge = useMemo(() => {
    if (!context) return '';
    // Dokument, od którego użytkownik wszedł, opisujemy osobno (pełniej) w `focusKnowledge`.
    const ids = [...new Set(context.relevantDocumentIds)].filter((id) => id !== focusDoc?.id);
    return ids
      .map((id) => getDocumentById(bundle, id))
      .filter((d) => d !== undefined)
      .map((d) => `- ${d.title}: ${d.summary}${d.amountLabel ? ` (${d.amountLabel})` : ''}${d.timing.deadlineNote ? ` Termin: ${d.timing.deadlineNote}.` : ''} Okno: ${timingWindow(d.timing)}.`)
      .join('\n');
  }, [bundle, context, focusDoc?.id]);

  /** Pełny opis dokumentu, o który pyta użytkownik („Pytasz o: …”). */
  const focusKnowledge = useMemo(() => {
    if (!focusDoc) return '';
    return [
      `Tytuł: ${focusDoc.title}`,
      `Streszczenie: ${focusDoc.summary}`,
      focusDoc.amountLabel ? `Kwota: ${focusDoc.amountLabel}` : '',
      focusDoc.timing.deadlineNote ? `Termin: ${focusDoc.timing.deadlineNote}` : '',
      `Okno: ${timingWindow(focusDoc.timing)}`,
      focusDoc.checklist?.length ? `Lista kroków:\n${focusDoc.checklist.map((x) => `- ${x}`).join('\n')}` : '',
      `Opis:\n${focusDoc.bodyMd.slice(0, 4000)}`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [focusDoc]);

  const ask = async (history: ChatMessage[]) => {
    if (!context) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    const { service, mode } = getAssistantService();
    try {
      let reply;
      const useLlm = isLlmConfigured();
      try {
        reply = useLlm ? await askLlm(history, context, knowledge, controller.signal, focusKnowledge) : await service.ask(history, context, controller.signal);
      } catch (e) {
        // Fallback: model/remote nie odpowiada → mock (z informacją w bańce).
        if ((useLlm || mode === 'remote') && !isAbortError(e)) {
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
    const message: ChatMessage = { id: createId('m_'), role: 'user', text: trimmed.slice(0, MAX_INPUT_CHARS), createdAt: nowIso() };
    append(threadKey, message);
    if (handoffEmail) {
      if (context) void humanSupport.submit({ question: message.text, contact: handoffEmail, context });
      return;
    }
    void ask([...stored, message]);
  };

  /** Podpowiedź z cache: odpowiedź jest gotowa, więc pokazujemy ją od razu (bez wywołania modelu). */
  const sendCached = async (question: string) => {
    if (!context || pending || handoffEmail) return;
    append(threadKey, { id: createId('m_'), role: 'user', text: question.slice(0, MAX_INPUT_CHARS), createdAt: nowIso() });
    setError(null);
    setPending(true);
    try {
      const reply = await getCachedAnswer(question, context);
      append(threadKey, { id: createId('m_'), role: 'assistant', text: reply.text, createdAt: nowIso(), sources: reply.sources, suggestHuman: reply.suggestHuman });
    } catch {
      setError(pl.assistant.networkError);
    } finally {
      setPending(false);
    }
  };

  /** Ponawia ostatnie pytanie (po błędzie sieci). */
  const retry = () => {
    if (handoffEmail || pending || stored.length === 0 || stored[stored.length - 1].role !== 'user') return;
    void ask(stored);
  };

  /** Przekazuje rozmowę zespołowi (ostatnie wiadomości jako treść zgłoszenia). */
  const handOff = async (email: string) => {
    if (!context) throw new Error('no context');
    const transcript = stored
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Użytkownik' : 'Asystent AI'}: ${m.text}`)
      .join('\n\n');
    await humanSupport.submit({ question: transcript || 'Prośba o kontakt z człowiekiem', contact: email, context });
  };

  return {
    handOff,
    messages,
    sendCached,
    pending,
    error,
    focusDoc,
    send,
    retry,
    canRetry: !handoffEmail && !pending && stored.length > 0 && stored[stored.length - 1].role === 'user',
    stop: () => abortRef.current?.abort(),
    newChat: () => {
      abortRef.current?.abort();
      setError(null);
      clearThread(threadKey);
    },
    context,
  };
}
