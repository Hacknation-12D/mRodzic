import { describe, expect, it } from 'vitest';

import type { Profile } from '../types';
import { deanonymize, toAnonymousSummary } from './anonymize';

const today = new Date('2026-11-21T12:00:00');

const profile: Profile = {
  schemaVersion: 1,
  me: { id: 'me', firstName: 'Anna', gender: 'female', employment: 'employment_contract' },
  partner: { id: 'p', firstName: 'Tomek', gender: 'male', employment: 'self_employed' },
  children: [
    { id: 'c1', name: 'Zosia', status: 'born', birthDate: '2026-08-21', colorKey: 'coral', premature: true },
    { id: 'c2', name: 'Maluszek', status: 'expected', dueDate: '2027-02-27', colorKey: 'teal' },
  ],
  household: { size: 4, city: 'Wrocław', postalCode: '50-001' },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

describe('toAnonymousSummary', () => {
  const summary = toAnonymousSummary(profile, today);

  it('describes parents, children and household', () => {
    expect(summary).toBe(
      'Rodzic: kobieta, umowa o pracę. Partner: mężczyzna, JDG. Dziecko 1: 4. miesiąc życia, wcześniak. Dziecko 2: 26. tydzień ciąży. Gospodarstwo: 4 osoby, dochód nieznany.',
    );
  });

  it('does not leak names, dates or location', () => {
    for (const secret of ['Anna', 'Tomek', 'Zosia', 'Maluszek', 'Wrocław', '50-001', '2026', '2027', '08-21', '02-27']) {
      expect(summary).not.toContain(secret);
    }
    expect(summary).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(summary).not.toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
  });

  it('includes income when known and single parent flag', () => {
    const s = toAnonymousSummary({ ...profile, partner: undefined, household: { incomePerPersonNet: 1500 } }, today);
    expect(s).toContain('dochód ok. 1500 zł/os. netto');
    expect(s).toContain('samotny rodzic');
    expect(s).not.toContain('Partner:');
  });
});

describe('deanonymize', () => {
  it('replaces aliases with names locally', () => {
    expect(deanonymize('Dziecko 1 i Dziecko 2', profile)).toBe('Zosia i Maluszek');
  });
});
