/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES URLOPU MACIERZYŃSKIEGO (urodzenie dziecka).
 * Wymiar zależy od liczby dzieci urodzonych przy jednym porodzie: 20 / 31 / 33 / 35 / 37 tygodni.
 * Wysokość: 100% podstawy (81,5% przy wniosku o macierzyński + rodzicielski w ciągu 21 dni – patrz maternityBenefitAmount).
 */
import { addDays } from 'date-fns';

import { assertIntInRange, BENEFIT_RATES, endOfPeriod, parseIsoDate, toIsoDate } from './common';

/** Liczba tygodni urlopu wg liczby dzieci (5 = 5 i więcej). */
export const MATERNITY_LEAVE_WEEKS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 20, 2: 31, 3: 33, 4: 35, 5: 37 };

/** Wymiar urlopu macierzyńskiego (i na warunkach macierzyńskiego) w tygodniach. */
export function maternityLeaveWeeks(childrenCount: number): number {
  assertIntInRange(childrenCount, 1, 50, 'childrenCount');
  return MATERNITY_LEAVE_WEEKS[Math.min(childrenCount, 5) as 1 | 2 | 3 | 4 | 5];
}

export type MaternityLeaveInput = {
  /** Liczba dzieci urodzonych przy jednym porodzie. */
  childrenCount: number;
  /** Opcjonalnie: pierwszy dzień urlopu (RRRR-MM-DD) – wtedy wyliczana jest data końca. */
  startDate?: string;
};

export type MaternityLeaveResult = {
  weeks: number;
  days: number;
  startDate?: string;
  endDate?: string;
  /** Pierwszy dzień po zakończeniu urlopu (np. start urlopu rodzicielskiego). */
  nextDayAfter?: string;
  benefitRate: number;
};

export function calculateMaternityLeave(input: MaternityLeaveInput): MaternityLeaveResult {
  const weeks = maternityLeaveWeeks(input.childrenCount);
  const days = weeks * 7;
  const result: MaternityLeaveResult = { weeks, days, benefitRate: BENEFIT_RATES.full };
  if (input.startDate) {
    const start = parseIsoDate(input.startDate, 'startDate');
    const end = endOfPeriod(start, days);
    result.startDate = toIsoDate(start);
    result.endDate = toIsoDate(end);
    result.nextDayAfter = toIsoDate(addDays(end, 1));
  }
  return result;
}
