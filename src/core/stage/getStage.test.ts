import { describe, expect, it } from 'vitest';

import type { Child } from '../types';
import { dayOffset, getStage, offsetToDate } from './getStage';
import { stageLabel } from './stageLabel';

const d = (iso: string) => new Date(`${iso}T12:00:00`);

const born = (birthDate: string, extra: Partial<Child> = {}): Child => ({
  id: 'c1',
  name: 'Zosia',
  status: 'born',
  birthDate,
  colorKey: 'coral',
  ...extra,
});

const expected = (dueDate: string): Child => ({
  id: 'c2',
  name: 'Maluszek',
  status: 'expected',
  dueDate,
  colorKey: 'teal',
});

describe('dayOffset / offsetToDate', () => {
  it('counts negative days during pregnancy', () => {
    expect(dayOffset(expected('2026-12-31'), d('2026-12-01'))).toBe(-30);
  });
  it('is 0 on the birth day', () => {
    expect(dayOffset(born('2026-05-10'), d('2026-05-10'))).toBe(0);
  });
  it('handles leap year (2028-02-29)', () => {
    expect(dayOffset(born('2028-02-28'), d('2028-03-01'))).toBe(2);
    expect(offsetToDate(born('2028-02-28'), 1).getDate()).toBe(29);
  });
  it('birthDate takes precedence over dueDate (premature birth)', () => {
    const child = born('2026-10-01', { dueDate: '2026-11-15', premature: true });
    expect(dayOffset(child, d('2026-10-11'))).toBe(10);
  });
});

describe('getStage', () => {
  it('pregnancy week and trimester', () => {
    // 12 tygodni przed terminem = 28. tydzień
    const s = getStage(expected('2027-03-01'), d('2026-12-07'));
    expect(s).toEqual({ kind: 'pregnancy', week: 28, trimester: 3, overdue: false });
    expect(stageLabel(s)).toBe('28. tydzień ciąży');
  });
  it('trimester boundaries', () => {
    const due = expected('2027-06-30');
    // tydzień 13 → offset −27 tyg.
    const w13 = getStage(due, offsetToDate(due, (13 - 40) * 7));
    const w14 = getStage(due, offsetToDate(due, (14 - 40) * 7));
    const w27 = getStage(due, offsetToDate(due, (27 - 40) * 7));
    const w28 = getStage(due, offsetToDate(due, (28 - 40) * 7));
    expect(w13).toMatchObject({ week: 13, trimester: 1 });
    expect(w14).toMatchObject({ week: 14, trimester: 2 });
    expect(w27).toMatchObject({ week: 27, trimester: 2 });
    expect(w28).toMatchObject({ week: 28, trimester: 3 });
  });
  it('week is at least 1', () => {
    expect(getStage(expected('2027-12-31'), d('2026-11-01'))).toMatchObject({ week: 1 });
  });
  it('overdue expected child does not crash', () => {
    const s = getStage(expected('2026-11-01'), d('2026-11-10'));
    expect(s).toEqual({ kind: 'pregnancy', week: 41, trimester: 3, overdue: true });
    expect(stageLabel(s)).toContain('po terminie');
  });
  it('newborn below 2 months', () => {
    expect(getStage(born('2026-11-01'), d('2026-11-01'))).toEqual({ kind: 'newborn', weeks: 0 });
    expect(getStage(born('2026-11-01'), d('2026-12-31'))).toEqual({ kind: 'newborn', weeks: 8 });
  });
  it('infant from 2 months', () => {
    const s = getStage(born('2026-08-21'), d('2026-11-21'));
    expect(s).toEqual({ kind: 'infant', months: 3 });
    expect(stageLabel(s)).toBe('4. miesiąc życia');
  });
  it('toddler 12–35 months with label', () => {
    const s = getStage(born('2024-07-21'), d('2026-11-21'));
    expect(s).toEqual({ kind: 'toddler', months: 28 });
    expect(stageLabel(s)).toBe('2 lata i 4 miesiące');
  });
  it('toddler at exactly 12 months', () => {
    expect(getStage(born('2025-11-21'), d('2026-11-21'))).toEqual({ kind: 'toddler', months: 12 });
    expect(stageLabel({ kind: 'toddler', months: 12 })).toBe('1 rok');
  });
  it('preschool 3–6 years and school from 7', () => {
    expect(getStage(born('2022-11-21'), d('2026-11-21'))).toEqual({ kind: 'preschool', years: 4, months: 0 });
    expect(getStage(born('2019-05-21'), d('2026-11-21'))).toEqual({ kind: 'school', years: 7, months: 6 });
  });
  it('leap day birthday (date-fns: 28.02 in a non-leap year completes the month)', () => {
    expect(getStage(born('2024-02-29'), d('2025-02-27'))).toEqual({ kind: 'infant', months: 11 });
    expect(getStage(born('2024-02-29'), d('2025-02-28'))).toEqual({ kind: 'toddler', months: 12 });
  });
});
