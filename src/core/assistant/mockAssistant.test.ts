import { describe, expect, it } from 'vitest';

import { getSeedBundle } from '../content/seedRepository';
import type { AssistantContext } from './AssistantService';
import { answerFromContent, normalize } from './mockAssistant';

const ctx: AssistantContext = { profileSummary: '', relevantDocumentIds: [], contentVersion: 1 };
const deps = { getBundle: getSeedBundle, getDeadlineText: (id: string) => (id === 'becikowe' ? 'za 4 dni (Dziecko 1)' : undefined) };

describe('mockAssistant', () => {
  it('normalizes Polish characters', () => {
    expect(normalize('Świadczenie ŁÓDŹ, żółć!')).toBe('swiadczenie lodz zolc');
  });

  it('answers about becikowe with deadline, checklist and source', () => {
    const reply = answerFromContent('Czy przysługuje mi becikowe?', ctx, deps);
    expect(reply.text).toContain('Becikowe');
    expect(reply.text).toContain('za 4 dni (Dziecko 1)');
    expect(reply.text).toContain('Co przygotować');
    expect(reply.sources[0]?.asOf).toBe('2026-11');
    expect(reply.suggestHuman).toBeUndefined();
  });

  it('matches 800+ and inflected words', () => {
    expect(answerFromContent('Jak złożyć wniosek o 800+?', ctx, deps).text).toContain('Rodzina 800+');
    expect(answerFromContent('urlopu ojcowskiego', ctx, deps).text).toContain('Urlop ojcowski');
  });

  it('falls back to tips', () => {
    expect(answerFromContent('co spakować do torby do szpitala', ctx, deps).text).toContain('Torba do szpitala');
  });

  it('uses the focus document when nothing matches', () => {
    const reply = answerFromContent('a co z terminem?', { ...ctx, focusDocumentId: 'rodzina-800-plus' }, deps);
    expect(reply.text).toContain('Rodzina 800+');
  });

  it('honestly says it does not know', () => {
    const reply = answerFromContent('Jaka jest pogoda na Marsie?', ctx, deps);
    expect(reply.suggestHuman).toBe(true);
    expect(reply.sources).toEqual([]);
  });
});
