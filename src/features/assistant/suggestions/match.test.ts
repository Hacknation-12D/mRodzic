import { describe, expect, it } from 'vitest';

import { matchScore, rankMatches } from './match';

const entries = [{ question: 'Jak złożyć wniosek o 800+?' }, { question: 'Kiedy przysługuje becikowe?' }, { question: 'Ile trwa urlop rodzicielski?' }];

describe('suggestions match', () => {
  it('dopasowuje przedrostek', () => expect(rankMatches('jak zlo', entries)[0]).toBe(entries[0]));
  it('toleruje literówki (≥70%)', () => expect(rankMatches('kidy przysluje becikowe', entries)).toContain(entries[1]));
  it('odrzuca niezwiązany tekst', () => expect(rankMatches('pogoda w Krakowie', entries)).toEqual([]));
  it('ignoruje bardzo krótki wpis', () => expect(matchScore('j', entries[0].question)).toBe(0));
});
