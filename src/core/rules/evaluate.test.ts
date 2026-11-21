import { describe, expect, it } from 'vitest';

import type { Child, Profile, Rule } from '../types';
import { buildFacts, UNKNOWN_ITEM, type Facts } from './buildFacts';
import { combineAll, combineAny, evaluate, negate } from './evaluate';

const today = new Date('2026-11-21T12:00:00');

const baseProfile = (over: Partial<Profile> = {}): Profile => ({
  schemaVersion: 1,
  me: { id: 'me', firstName: 'Anna', gender: 'female', employment: 'employment_contract' },
  partner: { id: 'p', firstName: 'Tomek', gender: 'male', employment: 'self_employed' },
  children: [
    { id: 'c1', name: 'Zosia', status: 'born', birthDate: '2026-08-21', colorKey: 'coral' },
    { id: 'c2', name: 'Maluszek', status: 'expected', dueDate: '2027-03-01', colorKey: 'teal' },
  ],
  household: {},
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...over,
});

describe('three-valued combinators', () => {
  it('all: unmet wins, then unknown, then met', () => {
    expect(combineAll(['met', 'unknown', 'unmet'])).toBe('unmet');
    expect(combineAll(['met', 'unknown'])).toBe('unknown');
    expect(combineAll(['met', 'met'])).toBe('met');
    expect(combineAll([])).toBe('met');
  });
  it('any: met wins, then unknown, then unmet', () => {
    expect(combineAny(['unmet', 'unknown', 'met'])).toBe('met');
    expect(combineAny(['unmet', 'unknown'])).toBe('unknown');
    expect(combineAny(['unmet'])).toBe('unmet');
    expect(combineAny([])).toBe('unmet');
  });
  it('not swaps met/unmet and keeps unknown', () => {
    expect(negate('met')).toBe('unmet');
    expect(negate('unmet')).toBe('met');
    expect(negate('unknown')).toBe('unknown');
  });
});

describe('evaluate leaf operators', () => {
  const facts: Facts = {
    'me.gender': 'female',
    'household.size': 4,
    'household.incomePerPersonNet': 1500,
    'child.premature': true,
    'anyParent.employment': ['employment_contract', 'self_employed'],
  };
  const cases: [Rule, string][] = [
    [{ fact: 'me.gender', op: 'eq', value: 'female' }, 'met'],
    [{ fact: 'me.gender', op: 'neq', value: 'female' }, 'unmet'],
    [{ fact: 'me.gender', op: 'in', value: ['male', 'female'] }, 'met'],
    [{ fact: 'me.gender', op: 'notIn', value: ['male'] }, 'met'],
    [{ fact: 'household.size', op: 'lt', value: 4 }, 'unmet'],
    [{ fact: 'household.size', op: 'lte', value: 4 }, 'met'],
    [{ fact: 'household.size', op: 'gt', value: 3 }, 'met'],
    [{ fact: 'household.size', op: 'gte', value: 5 }, 'unmet'],
    [{ fact: 'household.incomePerPersonNet', op: 'lte', value: 1922 }, 'met'],
    [{ fact: 'child.premature', op: 'eq', value: true }, 'met'],
    [{ fact: 'child.disability', op: 'eq', value: true }, 'unknown'],
    [{ fact: 'child.disability', op: 'exists' }, 'unmet'],
    [{ fact: 'child.disability', op: 'notExists' }, 'met'],
    [{ fact: 'household.size', op: 'exists' }, 'met'],
    [{ fact: 'me.gender', op: 'lt', value: 3 }, 'unknown'],
  ];
  it.each(cases)('%j → %s', (rule, expected) => {
    expect(evaluate(rule, facts)).toBe(expected);
  });

  it('lists: eq/in = any element matches, neq/notIn = none matches', () => {
    expect(evaluate({ fact: 'anyParent.employment', op: 'eq', value: 'self_employed' }, facts)).toBe('met');
    expect(evaluate({ fact: 'anyParent.employment', op: 'in', value: ['unemployed', 'self_employed'] }, facts)).toBe('met');
    expect(evaluate({ fact: 'anyParent.employment', op: 'in', value: ['unemployed'] }, facts)).toBe('unmet');
    expect(evaluate({ fact: 'anyParent.employment', op: 'neq', value: 'unemployed' }, facts)).toBe('met');
    expect(evaluate({ fact: 'anyParent.employment', op: 'notIn', value: ['self_employed'] }, facts)).toBe('unmet');
  });

  it('lists with partially unknown items are unknown unless a known item decides', () => {
    const partial: Facts = { 'anyParent.employment': ['employment_contract', UNKNOWN_ITEM] };
    expect(evaluate({ fact: 'anyParent.employment', op: 'in', value: ['employment_contract'] }, partial)).toBe('met');
    expect(evaluate({ fact: 'anyParent.employment', op: 'in', value: ['unemployed'] }, partial)).toBe('unknown');
    expect(evaluate({ fact: 'anyParent.employment', op: 'notIn', value: ['employment_contract'] }, partial)).toBe('unmet');
    expect(evaluate({ fact: 'anyParent.employment', op: 'notIn', value: ['unemployed'] }, partial)).toBe('unknown');
  });
});

describe('evaluate composite rules', () => {
  const facts: Facts = { 'household.childrenCount': 3, 'me.gender': 'female' };
  it('all with unknown member → unknown', () => {
    expect(
      evaluate({ all: [{ fact: 'household.childrenCount', op: 'gte', value: 3 }, { fact: 'household.incomePerPersonNet', op: 'lte', value: 1922 }] }, facts),
    ).toBe('unknown');
  });
  it('all with unmet member → unmet even if another is unknown', () => {
    expect(
      evaluate({ all: [{ fact: 'household.childrenCount', op: 'gte', value: 4 }, { fact: 'household.incomePerPersonNet', op: 'lte', value: 1922 }] }, facts),
    ).toBe('unmet');
  });
  it('any with met member → met even if another is unknown', () => {
    expect(evaluate({ any: [{ fact: 'household.incomePerPersonNet', op: 'lte', value: 1 }, { fact: 'me.gender', op: 'eq', value: 'female' }] }, facts)).toBe('met');
  });
  it('nested not', () => {
    expect(evaluate({ not: { any: [{ fact: 'me.gender', op: 'eq', value: 'male' }] } }, facts)).toBe('met');
    expect(evaluate({ not: { fact: 'household.city', op: 'eq', value: 'Kraków' } }, facts)).toBe('unknown');
  });
});

describe('buildFacts', () => {
  it('builds child and household facts', () => {
    const profile = baseProfile();
    const zosia = profile.children[0] as Child;
    const f = buildFacts(profile, zosia, today);
    expect(f['child.status']).toBe('born');
    expect(f['child.dayOffset']).toBe(92);
    expect(f['child.ageMonths']).toBe(3);
    expect(f['child.isMultipleBirth']).toBe(false);
    expect(f['partner.exists']).toBe(true);
    expect(f['anyParent.employment']).toEqual(['employment_contract', 'self_employed']);
    expect(f['household.size']).toBe(3); // 2 rodziców + 1 urodzone
    expect(f['household.singleParent']).toBe(false);
    expect(f['household.childrenCount']).toBe(2);
    expect(f['household.childrenUnder18Count']).toBe(1);
    expect(f['household.incomePerPersonNet']).toBeUndefined();
    expect(f['child.premature']).toBe(false);
  });
  it('expected child has no ageMonths and negative offset', () => {
    const profile = baseProfile();
    const f = buildFacts(profile, profile.children[1] as Child, today);
    expect(f['child.status']).toBe('expected');
    expect(f['child.ageMonths']).toBeUndefined();
    expect(f['child.dayOffset']).toBeLessThan(0);
  });
  it('detects multiple birth and single parent', () => {
    const profile = baseProfile({
      partner: undefined,
      children: [
        { id: 'a', name: 'Jaś', status: 'born', birthDate: '2026-10-17', multipleBirthGroupId: 'g', premature: true, colorKey: 'coral' },
        { id: 'b', name: 'Staś', status: 'born', birthDate: '2026-10-17', multipleBirthGroupId: 'g', premature: true, colorKey: 'teal' },
      ],
      household: { incomePerPersonNet: 1500 },
    });
    const f = buildFacts(profile, profile.children[0] as Child, today);
    expect(f['child.isMultipleBirth']).toBe(true);
    expect(f['household.singleParent']).toBe(true);
    expect(f['partner.exists']).toBe(false);
    expect(f['partner.gender']).toBeUndefined();
    expect(f['household.size']).toBe(3);
  });
  it('household overrides win over computed values', () => {
    const profile = baseProfile({ household: { size: 6, singleParent: true, city: ' Gdańsk ' } });
    const f = buildFacts(profile, null, today);
    expect(f['household.size']).toBe(6);
    expect(f['household.singleParent']).toBe(true);
    expect(f['household.city']).toBe('Gdańsk');
    expect(f['child.status']).toBeUndefined();
  });
  it('anyParent.employment unknown when nobody declared employment', () => {
    const profile = baseProfile({
      me: { id: 'me', firstName: 'A', gender: 'female' },
      partner: { id: 'p', firstName: 'B', gender: 'male' },
    });
    expect(buildFacts(profile, null, today)['anyParent.employment']).toBeUndefined();
  });
});
