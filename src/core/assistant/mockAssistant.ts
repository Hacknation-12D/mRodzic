import { pl } from '../../shared/i18n/pl';
import type { ContentBundle, DocumentDef, Source, TipDef } from '../types';
import { AssistantError, type AssistantContext, type AssistantReply, type AssistantService, type ChatMessage } from './AssistantService';

/** Małe litery, bez polskich znaków i interpunkcji. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'jak', 'czy', 'co', 'to', 'jest', 'mi', 'mnie', 'sie', 'dla', 'na', 'do', 'od', 'po', 'przy', 'jaki', 'jakie', 'jaka',
  'kiedy', 'gdzie', 'ile', 'moge', 'mam', 'nam', 'nas', 'oraz', 'albo', 'lub', 'ktory', 'ktora', 'ktore', 'czym', 'tego',
  'ten', 'ta', 'te', 'jej', 'jego', 'moj', 'moja', 'moje', 'naszego', 'naszej', 'przysluguje', 'wniosek', 'zlozyc', 'dziecka', 'dziecko',
]);

/** Dopasowanie z uwzględnieniem polskiej fleksji: wspólny prefiks ≥ 4 znaki i różnica końcówki ≤ 2. */
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  let p = 0;
  while (p < n && a[p] === b[p]) p++;
  return p >= 4 && p >= n - 2;
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => (w.length >= 3 || /\d/.test(w)) && !STOPWORDS.has(w));
}

function scoreFields(queryWords: string[], strong: string[], weak: string): number {
  const strongWords = strong.flatMap((s) => tokens(s));
  const weakWords = tokens(weak);
  let score = 0;
  for (const q of queryWords) {
    if (strongWords.some((w) => wordsMatch(q, w))) score += 3;
    else if (weakWords.some((w) => wordsMatch(q, w))) score += 1;
  }
  return score;
}

export type MockDeps = {
  getBundle: () => ContentBundle;
  /** Tekst terminu dokumentu w bieżącym kontekście, np. „za 4 dni (Dziecko 1)”. */
  getDeadlineText?: (docId: string) => string | undefined;
  delayMs?: () => number;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AssistantError('aborted', 'aborted'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new AssistantError('aborted', 'aborted'));
    });
  });
}

export function answerFromContent(question: string, ctx: AssistantContext, deps: MockDeps): AssistantReply {
  const bundle = deps.getBundle();
  const q = tokens(question);

  const docScores = bundle.documents
    .map((d) => {
      let score = scoreFields(q, [d.title, ...d.tags], `${d.summary} ${d.assistantPrompts.join(' ')}`);
      if (score > 0 && ctx.relevantDocumentIds.includes(d.id)) score += 1;
      if (score > 0 && ctx.focusDocumentId === d.id) score += 2;
      return { d, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.d.priority - a.d.priority);

  const tipScores = bundle.tips
    .map((t) => ({ t, score: scoreFields(q, [t.title, ...t.tags], t.summaryMd) }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.t.priority - a.t.priority);
  const bestTip: TipDef | undefined = tipScores[0] && tipScores[0].score > (docScores[0]?.score ?? 0) ? tipScores[0].t : undefined;

  // Brak trafienia, ale rozmowa dotyczy konkretnego dokumentu → odpowiedz o nim.
  const focus = ctx.focusDocumentId ? bundle.documents.find((d) => d.id === ctx.focusDocumentId) : undefined;
  const best: DocumentDef | undefined = bestTip ? undefined : (docScores[0]?.d ?? (q.length > 0 && !tipScores[0] ? focus : undefined));

  if (best) {
    const lines: string[] = [pl.assistant.mockIntro(best.title), best.summary];
    if (best.amountLabel) lines.push(best.amountLabel);
    const deadline = deps.getDeadlineText?.(best.id);
    if (deadline) lines.push(pl.assistant.mockDeadline(deadline));
    else if (best.timing.deadlineNote) lines.push(pl.assistant.mockDeadline(best.timing.deadlineNote));
    if (best.checklist?.length) lines.push(`${pl.assistant.mockSteps}\n${best.checklist.slice(0, 3).map((s) => `- ${s}`).join('\n')}`);
    lines.push(pl.assistant.mockMore);
    const related = docScores.slice(1, 3).map((x) => x.d.title);
    if (related.length) lines.push(`${pl.assistant.mockAlsoRelated} ${related.join(', ')}.`);
    const sources: Source[] = [best.source, ...docScores.slice(1, 3).map((x) => x.d.source)];
    return { text: lines.join('\n\n'), sources: dedupeSources(sources) };
  }

  const tip = bestTip ?? tipScores[0]?.t;

  if (tip) {
    return {
      text: [pl.assistant.mockIntro(tip.title), tip.bodyMd ?? tip.summaryMd].join('\n\n'),
      sources: tip.source ? [tip.source] : [],
    };
  }

  return { text: pl.assistant.mockNoMatch, sources: [], suggestHuman: true };
}

function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = `${s.name}|${s.url ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Asystent offline: dopasowanie słów kluczowych do treści aplikacji. */
export function createMockAssistant(deps: MockDeps): AssistantService {
  return {
    async ask(history: ChatMessage[], ctx: AssistantContext, signal?: AbortSignal) {
      const lastUser = [...history].reverse().find((m) => m.role === 'user');
      await sleep(deps.delayMs?.() ?? 600 + Math.random() * 300, signal);
      return answerFromContent(lastUser?.text ?? '', ctx, deps);
    },
  };
}
