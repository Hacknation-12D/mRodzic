import { describe, expect, it } from 'vitest';

import type { ContentBundle, DocumentDef, Profile, StatusMap, TipDef } from '../types';
import {
  getDocumentInstance,
  getDocumentInstances,
  getRelevantDocumentIds,
  getSuggestedPrompts,
  isInWindow,
  overdueCountByChild,
} from './selectors';
import { getSeedBundle } from './seedRepository';

const today = new Date('2026-11-21T00:00:00');

const doc = (over: Partial<DocumentDef> & Pick<DocumentDef, 'id'>): DocumentDef => ({
  scope: 'child',
  category: 'benefit',
  title: over.id,
  summary: 's',
  bodyMd: 'b',
  timing: { showFrom: -30 },
  requirements: [],
  links: [],
  assistantPrompts: [`Pytanie o ${over.id}`],
  tags: [],
  source: { name: 'src', asOf: '2026-11' },
  needsReview: true,
  priority: 3,
  ...over,
});

const tip = (id: string, showFrom: number, showTo: number, priority = 3): TipDef => ({
  id,
  title: id,
  summaryMd: id,
  timing: { showFrom, showTo },
  tags: [],
  priority,
});

const bundle: ContentBundle = {
  version: 1,
  updatedAt: '2026-11-01',
  documents: [
    doc({ id: 'pesel', timing: { showFrom: -14, showTo: 60, deadline: 21 }, priority: 5 }),
    doc({ id: 'bec', timing: { showFrom: -60, deadline: 365 }, requirements: [{ id: 'inc', label: 'dochód', who: 'household', rule: { fact: 'household.incomePerPersonNet', op: 'lte', value: 1922 } }] }),
    doc({ id: 'preem', timing: { showFrom: 0, showTo: 180 }, visibleWhen: { fact: 'child.premature', op: 'eq', value: true } }),
    doc({ id: 'kdr', scope: 'household', timing: { showFrom: -200 }, visibleWhen: { fact: 'household.childrenCount', op: 'gte', value: 3 }, requirements: [{ id: 'three', label: '3 dzieci', who: 'household', rule: { fact: 'household.childrenUnder18Count', op: 'gte', value: 3 } }] }),
    doc({ id: 'preschool', timing: { showFrom: 820, showTo: 2190 } }),
  ],
  tips: [tip('t-preg', -100, -1, 5), tip('t-preg2', -100, -1, 4), tip('t-baby', 0, 200, 5), tip('t-baby2', 0, 200, 2), tip('t-all', -300, 3000, 1)],
  todos: [
    { id: 'pediatra', title: 'Pediatra', timing: { showFrom: -56, showTo: 30 }, category: 'health', priority: 5 },
    { id: 'zlobek', title: 'Żłobek', timing: { showFrom: 90, showTo: 540, deadline: 100 }, category: 'education', priority: 4 },
  ],
  prompts: [
    { id: 'p-preg', text: 'Ciąża?', timing: { showFrom: -280, showTo: -1 } },
    { id: 'p-baby', text: 'Niemowlę?', timing: { showFrom: 0, showTo: 365 } },
  ],
};

const twoKids: Profile = {
  schemaVersion: 1,
  me: { id: 'me', firstName: 'Anna', gender: 'female', employment: 'employment_contract' },
  children: [
    // urodzona 10 dni temu → termin PESEL za 11 dni
    { id: 'zosia', name: 'Zosia', status: 'born', birthDate: '2026-11-11', colorKey: 'coral' },
    // termin porodu za 30 dni
    { id: 'malu', name: 'Maluszek', status: 'expected', dueDate: '2026-12-21', colorKey: 'teal' },
  ],
  household: {},
  createdAt: '',
  updatedAt: '',
};

describe('isInWindow', () => {
  it('handles showTo, deadline grace and open end', () => {
    expect(isInWindow(-31, { showFrom: -30 })).toBe(false);
    expect(isInWindow(5000, { showFrom: -30 })).toBe(true);
    expect(isInWindow(50, { showFrom: 0, deadline: 21 })).toBe(true);
    expect(isInWindow(52, { showFrom: 0, deadline: 21 })).toBe(false);
    expect(isInWindow(61, { showFrom: 0, showTo: 60, deadline: 21 })).toBe(false);
  });
});

describe('getDocumentInstances – two children in different stages', () => {
  const list = getDocumentInstances(bundle, twoKids, {}, today, 'all');

  it('creates one instance per matching child', () => {
    expect(list.map((d) => d.key).sort()).toEqual(['bec:malu', 'bec:zosia', 'pesel:zosia'].sort());
  });

  it('computes deadline, urgency and sorts by urgency', () => {
    expect(list[0].key).toBe('pesel:zosia');
    expect(list[0].daysLeft).toBe(11);
    expect(list[0].urgency).toBe('soon');
    const becMalu = list.find((d) => d.key === 'bec:malu');
    expect(becMalu?.urgency).toBe('later');
  });

  it('evaluates eligibility three-valued (no income → unknown)', () => {
    expect(list.find((d) => d.key === 'bec:zosia')?.eligibility).toBe('unknown');
    const withIncome = getDocumentInstances(bundle, { ...twoKids, household: { incomePerPersonNet: 3000 } }, {}, today, 'all');
    expect(withIncome.find((d) => d.key === 'bec:zosia')?.eligibility).toBe('unmet');
    expect(withIncome.find((d) => d.key === 'pesel:zosia')?.eligibility).toBe('met');
  });

  it('respects the child filter', () => {
    const onlyMalu = getDocumentInstances(bundle, twoKids, {}, today, 'malu');
    expect(onlyMalu.map((d) => d.key)).toEqual(['bec:malu']);
  });
});

describe('statuses done/hidden', () => {
  it('keeps done/hidden instances even outside their window', () => {
    const statuses: StatusMap = {
      'pesel:zosia': { status: 'done', updatedAt: '2026-11-15T10:00:00Z' },
      'preschool:zosia': { status: 'hidden', updatedAt: '2026-11-15T10:00:00Z' },
    };
    const list = getDocumentInstances(bundle, twoKids, statuses, today, 'all');
    expect(list.find((d) => d.key === 'pesel:zosia')?.status).toBe('done');
    expect(list.find((d) => d.key === 'preschool:zosia')?.status).toBe('hidden');
    expect(list.find((d) => d.key === 'bec:zosia')?.status).toBe('todo');
  });
});

describe('twins', () => {
  const twins: Profile = {
    ...twoKids,
    children: [
      { id: 'jas', name: 'Jaś', status: 'born', birthDate: '2026-10-17', premature: true, multipleBirthGroupId: 'g1', colorKey: 'coral' },
      { id: 'stas', name: 'Staś', status: 'born', birthDate: '2026-10-17', premature: true, multipleBirthGroupId: 'g1', colorKey: 'teal' },
    ],
  };
  it('creates separate instances for each twin with the same deadline', () => {
    const list = getDocumentInstances(bundle, twins, {}, today, 'all');
    const pesel = list.filter((d) => d.id === 'pesel');
    expect(pesel.map((d) => d.childId).sort()).toEqual(['jas', 'stas']);
    expect(pesel[0].urgency).toBe('overdue');
    expect(list.filter((d) => d.id === 'preem')).toHaveLength(2);
  });
});

describe('household documents', () => {
  const three: Profile = {
    ...twoKids,
    children: [
      { id: 'a', name: 'A', status: 'born', birthDate: '2022-11-21', colorKey: 'coral' },
      { id: 'b', name: 'B', status: 'born', birthDate: '2025-05-21', colorKey: 'teal' },
      { id: 'c', name: 'C', status: 'expected', dueDate: '2027-03-06', colorKey: 'violet' },
    ],
  };
  it('shows Karta Dużej Rodziny once for 3+ children, anchored to the youngest', () => {
    const list = getDocumentInstances(bundle, three, {}, today, 'all');
    const kdr = list.filter((d) => d.id === 'kdr');
    expect(kdr).toHaveLength(1);
    expect(kdr[0].key).toBe('kdr:household');
    expect(kdr[0].childId).toBeUndefined();
    // tylko dwoje urodzonych → wymaganie niespełnione
    expect(kdr[0].eligibility).toBe('unmet');
  });
  it('is visible regardless of child filter', () => {
    expect(getDocumentInstances(bundle, three, {}, today, 'a').some((d) => d.id === 'kdr')).toBe(true);
  });
  it('is hidden for fewer than 3 children', () => {
    expect(getDocumentInstances(bundle, twoKids, {}, today, 'all').some((d) => d.id === 'kdr')).toBe(false);
  });
  it('getDocumentInstance returns the household instance', () => {
    expect(getDocumentInstance(bundle, three, {}, today, 'kdr')?.key).toBe('kdr:household');
  });
});

describe('getSuggestedPrompts / getRelevantDocumentIds', () => {
  it('starts with prompts of documents with the nearest deadline, then stage prompts', () => {
    const prompts = getSuggestedPrompts(bundle, twoKids, {}, today, null);
    expect(prompts[0]).toBe('Pytanie o pesel');
    expect(prompts).toContain('Niemowlę?');
    expect(prompts).toContain('Ciąża?');
    expect(new Set(prompts).size).toBe(prompts.length);
  });
  it('limits relevant documents', () => {
    expect(getRelevantDocumentIds(bundle, twoKids, {}, today, null, 1)).toEqual(['pesel']);
  });
});

describe('seed bundle', () => {
  const seed = getSeedBundle();
  it('loads and validates', () => {
    expect(seed.documents.length).toBeGreaterThanOrEqual(12);
    expect(seed.tips.length).toBeGreaterThanOrEqual(15);
    expect(seed.todos.length).toBeGreaterThanOrEqual(15);
    expect(seed.prompts.length).toBeGreaterThanOrEqual(15);
  });
  it('persona „kasia” sees Karta Dużej Rodziny, przedszkole and Aktywny rodzic', () => {
    const kasia: Profile = {
      schemaVersion: 1,
      me: { id: 'me', firstName: 'Kasia', gender: 'female', employment: 'unemployed' },
      partner: { id: 'p', firstName: 'Marek', gender: 'male', employment: 'employment_contract' },
      children: [
        { id: 'a', name: 'Ola', status: 'born', birthDate: '2022-11-21', colorKey: 'coral' },
        { id: 'b', name: 'Kuba', status: 'born', birthDate: '2025-05-21', colorKey: 'teal' },
        { id: 'c', name: 'Maluszek', status: 'expected', dueDate: '2027-03-06', colorKey: 'violet' },
      ],
      household: {},
      createdAt: '',
      updatedAt: '',
    };
    const ids = getDocumentInstances(seed, kasia, {}, today, 'all').map((d) => d.id);
    expect(ids).toContain('karta-duzej-rodziny');
    expect(ids).toContain('rekrutacja-przedszkole');
    expect(ids).toContain('aktywny-rodzic');
  });
});

describe('overdueCountByChild', () => {
  // Zosia urodzona 40 dni temu → PESEL (termin: 21 dni) jest 19 dni po terminie.
  const late: Profile = { ...twoKids, children: [{ ...twoKids.children[0], birthDate: '2026-10-12' }, twoKids.children[1]] };

  it('liczy zaległe dokumenty „do zrobienia” osobno dla każdego dziecka', () => {
    expect(overdueCountByChild(bundle, late, {}, today)).toEqual({ zosia: 1 });
  });

  it('pomija dokumenty oznaczone jako wypełnione lub ukryte i dzieci bez zaległości', () => {
    const statuses: StatusMap = { 'pesel:zosia': { status: 'done', updatedAt: '2026-11-01' } };
    expect(overdueCountByChild(bundle, late, statuses, today)).toEqual({});
    expect(overdueCountByChild(bundle, twoKids, {}, today)).toEqual({});
  });
});
