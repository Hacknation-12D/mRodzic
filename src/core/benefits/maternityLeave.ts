/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES URLOPU MACIERZYŃSKIEGO (urodzenie dziecka).
 * Wymiar zależy od liczby dzieci urodzonych przy jednym porodzie: 20 / 31 / 33 / 35 / 37 tygodni.
 * Wysokość: 100% podstawy (81,5% przy wniosku o macierzyński + rodzicielski w ciągu 21 dni – patrz maternityBenefitAmount).
 */
import { addDays } from 'date-fns';

import { DEFAULT_LEGAL_PARAMETERS as D, maternityWeeksFor } from '../legal/parameters';
import { assertIntInRange, benefitRates, endOfPeriod, parseIsoDate, toIsoDate } from './common';

/** Liczba tygodni urlopu wg liczby dzieci (5 = 5 i więcej). */
/** Wartości domyślne (2026). Kalkulator używa aktywnego zestawu parametrów. */
export const MATERNITY_LEAVE_WEEKS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: D.maternityWeeks[0], 2: D.maternityWeeks[1], 3: D.maternityWeeks[2], 4: D.maternityWeeks[3], 5: D.maternityWeeks[4] };

/** Wymiar urlopu macierzyńskiego (i na warunkach macierzyńskiego) w tygodniach. */
export function maternityLeaveWeeks(childrenCount: number): number {
  assertIntInRange(childrenCount, 1, 50, 'childrenCount');
  return maternityWeeksFor(childrenCount);
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
  const result: MaternityLeaveResult = { weeks, days, benefitRate: benefitRates().full };
  if (input.startDate) {
    const start = parseIsoDate(input.startDate, 'startDate');
    const end = endOfPeriod(start, days);
    result.startDate = toIsoDate(start);
    result.endDate = toIsoDate(end);
    result.nextDayAfter = toIsoDate(addDays(end, 1));
  }
  return result;
}
