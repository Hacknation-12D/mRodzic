/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES URLOPU OJCOWSKIEGO.
 *
 *  - Łącznie 2 tygodnie, jednorazowo lub w 2 częściach (każda min. 1 tydzień).
 *  - Urodzenie: do ukończenia przez dziecko 12 miesięcy (ostatni dzień = dzień przed 1. urodzinami).
 *  - Przysposobienie: do 12 miesięcy od uprawomocnienia postanowienia, nie dłużej niż do 14. urodzin dziecka.
 *  - Wysokość: 100% podstawy.
 */
import { addDays, addMonths, addYears, min as minDate } from 'date-fns';

import { BENEFIT_RATES, BenefitInputError, endOfPeriod, parseIsoDate, toIsoDate } from './common';

export const PATERNITY_LEAVE_WEEKS = 2;
export const PATERNITY_MAX_PARTS = 2;

export type PaternityLeavePart = {
  /** Pierwszy dzień części (RRRR-MM-DD). */
  start: string;
  /** Długość części w tygodniach (1 lub 2). */
  weeks: number;
};

export type PaternityLeaveInput = {
  mode: 'birth' | 'adoption';
  childBirthDate: string;
  /** Data uprawomocnienia postanowienia o przysposobieniu – wymagana dla mode = 'adoption'. */
  adoptionFinalDate?: string;
  /** Opcjonalnie: planowane części urlopu – do walidacji. */
  parts?: PaternityLeavePart[];
};

export type PaternityLeaveResult = {
  totalWeeks: number;
  totalDays: number;
  earliestStart: string;
  /** Ostatni dzień, w którym urlop może jeszcze trwać. */
  deadline: string;
  benefitRate: number;
  parts?: { start: string; end: string; weeks: number }[];
  valid?: boolean;
  issues?: string[];
  unusedWeeks?: number;
};

export function calculatePaternityLeave(input: PaternityLeaveInput): PaternityLeaveResult {
  const birth = parseIsoDate(input.childBirthDate, 'childBirthDate');
  let earliest: Date;
  let deadline: Date;

  if (input.mode === 'birth') {
    earliest = birth;
    deadline = addDays(addMonths(birth, 12), -1);
  } else if (input.mode === 'adoption') {
    if (!input.adoptionFinalDate) {
      throw new BenefitInputError('Dla przysposobienia podaj adoptionFinalDate.', 'adoptionFinalDate');
    }
    const finalDate = parseIsoDate(input.adoptionFinalDate, 'adoptionFinalDate');
    const age14 = addYears(birth, 14);
    if (finalDate >= age14) {
      throw new BenefitInputError('Dziecko ukończyło 14 lat przed uprawomocnieniem przysposobienia.', 'adoptionFinalDate');
    }
    earliest = finalDate;
    deadline = minDate([addDays(addMonths(finalDate, 12), -1), addDays(age14, -1)]);
  } else {
    throw new BenefitInputError('mode musi być „birth” albo „adoption”.', 'mode');
  }

  const result: PaternityLeaveResult = {
    totalWeeks: PATERNITY_LEAVE_WEEKS,
    totalDays: PATERNITY_LEAVE_WEEKS * 7,
    earliestStart: toIsoDate(earliest),
    deadline: toIsoDate(deadline),
    benefitRate: BENEFIT_RATES.full,
  };

  if (input.parts) {
    const issues: string[] = [];
    if (input.parts.length === 0) issues.push('Podaj co najmniej jedną część urlopu.');
    if (input.parts.length > PATERNITY_MAX_PARTS) issues.push(`Urlop można podzielić maksymalnie na ${PATERNITY_MAX_PARTS} części.`);

    const parts = input.parts.map((p, i) => {
      const start = parseIsoDate(p.start, `parts[${i}].start`);
      if (!Number.isInteger(p.weeks) || p.weeks < 1) {
        issues.push(`Część ${i + 1}: długość musi być całkowitą liczbą tygodni, min. 1.`);
      }
      const weeks = Math.max(1, Math.floor(p.weeks));
      const end = endOfPeriod(start, weeks * 7);
      if (start < earliest) issues.push(`Część ${i + 1} zaczyna się przed ${toIsoDate(earliest)}.`);
      if (end > deadline) issues.push(`Część ${i + 1} kończy się po terminie ${toIsoDate(deadline)}.`);
      return { start, end, weeks };
    });

    const used = parts.reduce((acc, p) => acc + p.weeks, 0);
    if (used > PATERNITY_LEAVE_WEEKS) issues.push(`Łącznie ${used} tyg. – przysługują maksymalnie ${PATERNITY_LEAVE_WEEKS} tygodnie.`);

    const sorted = [...parts].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start <= sorted[i - 1].end) issues.push('Części urlopu nachodzą na siebie.');
    }

    result.parts = parts.map((p) => ({ start: toIsoDate(p.start), end: toIsoDate(p.end), weeks: p.weeks }));
    result.valid = issues.length === 0;
    result.issues = issues;
    result.unusedWeeks = Math.max(0, PATERNITY_LEAVE_WEEKS - used);
  }
  return result;
}
