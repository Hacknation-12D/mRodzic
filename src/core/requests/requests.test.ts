import { describe, expect, it } from 'vitest';

import { checkCivilCopy, checkLeaveRequest, civilCopyFee, contributionStatement, leaveRequestText, type LeaveRequestInput } from './requests';

const base: LeaveRequestInput = {
  kind: 'parental',
  applicant: { firstName: 'Anna', lastName: 'Kowalska' },
  employer: { name: 'Firma Demo sp. z o.o.', city: 'Warszawa' },
  child: { name: 'Zosia', birthDate: '2026-09-03' },
  start: '2027-01-21',
  end: '2027-08-25',
  part: 1,
  submittedOn: '2026-12-20',
};

describe('wnioski urlopowe do pracodawcy', () => {
  it('rodzicielski: termin 21 dni przed rozpoczęciem', () => {
    expect(checkLeaveRequest(base)).toMatchObject({ errors: [], warnings: [], latestSubmission: '2026-12-31' });
    expect(checkLeaveRequest({ ...base, submittedOn: '2027-01-10' }).warnings[0]).toContain('21 dni');
  });

  it('ojcowski: pełne tygodnie, najwyżej 2', () => {
    const r = checkLeaveRequest({ ...base, kind: 'paternity', start: '2026-10-01', end: '2026-10-10', submittedOn: '2026-09-20' });
    expect(r.errors[0]).toContain('pełne tygodnie');
    expect(checkLeaveRequest({ ...base, kind: 'paternity', start: '2026-10-01', end: '2026-10-14', submittedOn: '2026-09-20' }).errors).toEqual([]);
  });

  it('łączenie z pracą: wymiar do ½ etatu', () => {
    expect(checkLeaveRequest({ ...base, kind: 'parental_work', workFraction: 0.75 }).errors[0]).toContain('etatu');
    expect(checkLeaveRequest({ ...base, kind: 'parental_work', workFraction: 0.5 }).errors).toEqual([]);
  });

  it('macierzyński najwcześniej 6 tygodni przed porodem', () => {
    const r = checkLeaveRequest({ ...base, kind: 'maternity', child: { name: 'Zosia', dueDate: '2027-03-01' }, start: '2027-01-01', end: '2027-07-01' });
    expect(r.errors[0]).toContain('6 tygodni');
  });

  it('treść wniosku zawiera podstawę prawną, okres i załączniki', () => {
    const text = leaveRequestText(base).sections.flat().join('\n');
    expect(text).toContain('art. 182¹a');
    expect(text).toContain('21.01.2027');
    expect(text).toContain('Załączniki');
  });
});

describe('odpis aktu urodzenia i zaświadczenie o rozliczeniach', () => {
  it('opłata zależy od rodzaju i liczby odpisów', () => {
    expect(civilCopyFee({ kind: 'full', copies: 2 })).toBe(66);
    const r = checkCivilCopy({ kind: 'full', copies: 1, delivery: 'online', child: { name: 'Zosia', birthDate: '2026-09-03' }, applicant: { firstName: 'Anna', lastName: 'K', relation: 'parent' }, purpose: 'do ZUS', submittedOn: '2026-11-22' });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(' ')).toContain('skrócony');
  });

  it('JDG: zadłużenie ponad próg wstrzymuje zasiłek', () => {
    expect(contributionStatement({ person: 'Marta', payer: 'Marta JDG', asOf: '2026-11-21', arrears: 725, selfEmployed: true }).blocksBenefit).toBe(true);
    expect(contributionStatement({ person: 'Marta', payer: 'Marta JDG', asOf: '2026-11-21', arrears: 40, selfEmployed: true }).blocksBenefit).toBe(false);
  });
});
