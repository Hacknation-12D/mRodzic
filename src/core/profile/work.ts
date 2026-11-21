import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

import type { Work } from '../types';

/** Pracodawca z więcej niż 20 ubezpieczonymi sam wypłaca zasiłki; przy mniejszym płaci ZUS. */
export const BENEFIT_PAYER_THRESHOLD = 20; // TODO(verify): próg i sposób liczenia na dany rok

export function benefitPayerFor(employerInsuredCount: number): Work['benefitPayer'] {
  return employerInsuredCount > BENEFIT_PAYER_THRESHOLD ? 'employer' : 'zus';
}

/** Średnia z zapisanych miesięcy (brutto) – punkt wyjścia do kalkulatora zasiłku. */
export function averageGross(work: Pick<Work, 'earnings'>): number | undefined {
  if (work.earnings.length === 0) return undefined;
  const sum = work.earnings.reduce((acc, m) => acc + m.gross, 0);
  return Math.round((sum / work.earnings.length) * 100) / 100;
}

export function vacationDaysLeft(work: Pick<Work, 'vacation'>): number {
  return Math.max(0, work.vacation.entitlementDays - work.vacation.usedDays);
}

export type MaternityLeaveProgress = {
  totalDays: number;
  /** Dni od początku urlopu do dziś włącznie (0 przed startem, max totalDays). */
  elapsedDays: number;
  /** Dni do końca urlopu (0 po zakończeniu). */
  daysLeft: number;
  status: 'upcoming' | 'ongoing' | 'finished';
};

export function maternityLeaveProgress(
  leave: NonNullable<Work['maternityLeave']>,
  today: Date,
): MaternityLeaveProgress {
  const day = startOfDay(today);
  const start = parseISO(leave.startDate);
  const end = parseISO(leave.endDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  if (differenceInCalendarDays(day, start) < 0) return { totalDays, elapsedDays: 0, daysLeft: totalDays, status: 'upcoming' };
  const elapsedDays = Math.min(totalDays, differenceInCalendarDays(day, start) + 1);
  const daysLeft = Math.max(0, differenceInCalendarDays(end, day));
  return { totalDays, elapsedDays, daysLeft, status: differenceInCalendarDays(day, end) > 0 ? 'finished' : 'ongoing' };
}
