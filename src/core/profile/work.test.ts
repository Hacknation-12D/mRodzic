import { describe, expect, it } from 'vitest';

import type { Work } from '../types';
import { averageGross, benefitPayerFor, contributionBreakdown, daysInYear, maskNip, maternityLeaveProgress, vacationDaysLeft } from './work';

const leave: NonNullable<Work['maternityLeave']> = { startDate: '2026-10-08', endDate: '2027-02-24', weeks: 20 };

describe('work helpers', () => {
  it('płatnik zasiłku zależy od liczby ubezpieczonych', () => {
    expect(benefitPayerFor(8)).toBe('zus');
    expect(benefitPayerFor(20)).toBe('zus');
    expect(benefitPayerFor(21)).toBe('employer');
  });

  it('średnia i urlop', () => {
    expect(averageGross({ earnings: [{ month: '2026-01', gross: 6000 }, { month: '2026-02', gross: 7000 }] })).toBe(6500);
    expect(averageGross({ earnings: [] })).toBeUndefined();
    expect(vacationDaysLeft({ vacation: { entitlementDays: 26, usedDays: 6 } })).toBe(20);
  });

  it('postęp macierzyńskiego: w trakcie, przed i po', () => {
    expect(maternityLeaveProgress(leave, new Date(2026, 10, 21))).toEqual({ totalDays: 140, elapsedDays: 45, daysLeft: 95, status: 'ongoing' });
    expect(maternityLeaveProgress(leave, new Date(2026, 9, 1)).status).toBe('upcoming');
    expect(maternityLeaveProgress(leave, new Date(2027, 1, 24)).status).toBe('ongoing');
    expect(maternityLeaveProgress(leave, new Date(2027, 1, 25))).toMatchObject({ daysLeft: 0, status: 'finished' });
  });

  it('składki od podstawy 6800 zł', () => {
    expect(contributionBreakdown(6800)).toEqual({ pension: 663.68, disability: 102, sickness: 166.6, health: 528.09, healthBase: 5867.72 });
  });

  it('maskuje NIP i sumuje dni w roku', () => {
    expect(maskNip('5271043182')).toBe('527••••• 82');
    expect(daysInYear([{ from: '2025-07-14', days: 10 }, { from: '2025-12-24', days: 4 }, { from: '2024-08-05', days: 10 }], 2025)).toBe(14);
  });
});
