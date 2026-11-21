/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES URLOPU RODZICIELSKIEGO.
 *
 *  - 41 tyg. (1 dziecko), 43 tyg. (2+ dzieci z jednego porodu),
 *  - z zaświadczeniem „Za życiem”: 65 / 67 tyg.,
 *  - w tym 9 tygodni niezbywalnych dla każdego rodzica (nie można ich przenieść),
 *    więc jeden rodzic może wykorzystać maksymalnie (wymiar − 9) tygodni.
 *  - Wysokość: 70% podstawy (81,5% przy wniosku w ciągu 21 dni – patrz maternityBenefitAmount).
 */
import { assertIntInRange, assertNonNegative, BENEFIT_RATES } from './common';

export const PARENTAL_LEAVE_WEEKS = { single: 41, multiple: 43, singleZaZyciem: 65, multipleZaZyciem: 67 } as const;
export const PARENTAL_NON_TRANSFERABLE_WEEKS = 9;

export type ParentalLeaveInput = {
  /** Liczba dzieci urodzonych przy jednym porodzie (lub przyjętych jednocześnie). */
  childrenCount: number;
  /** Czy dziecko ma zaświadczenie „Za życiem”. */
  zaZyciem: boolean;
  /** Opcjonalnie: planowany podział między rodziców (tygodnie) – do walidacji. */
  plan?: { firstParentWeeks: number; secondParentWeeks: number };
};

export type ParentalLeaveResult = {
  totalWeeks: number;
  totalDays: number;
  nonTransferableWeeksPerParent: number;
  maxWeeksForOneParent: number;
  benefitRate: number;
  upfrontBenefitRate: number;
  plan?: {
    valid: boolean;
    issues: string[];
    usedWeeks: number;
    unusedWeeks: number;
  };
};

/** Wymiar urlopu rodzicielskiego w tygodniach. */
export function parentalLeaveWeeks(childrenCount: number, zaZyciem: boolean): number {
  assertIntInRange(childrenCount, 1, 50, 'childrenCount');
  const multiple = childrenCount > 1;
  if (zaZyciem) return multiple ? PARENTAL_LEAVE_WEEKS.multipleZaZyciem : PARENTAL_LEAVE_WEEKS.singleZaZyciem;
  return multiple ? PARENTAL_LEAVE_WEEKS.multiple : PARENTAL_LEAVE_WEEKS.single;
}

export function calculateParentalLeave(input: ParentalLeaveInput): ParentalLeaveResult {
  const totalWeeks = parentalLeaveWeeks(input.childrenCount, Boolean(input.zaZyciem));
  const maxWeeksForOneParent = totalWeeks - PARENTAL_NON_TRANSFERABLE_WEEKS;
  const result: ParentalLeaveResult = {
    totalWeeks,
    totalDays: totalWeeks * 7,
    nonTransferableWeeksPerParent: PARENTAL_NON_TRANSFERABLE_WEEKS,
    maxWeeksForOneParent,
    benefitRate: BENEFIT_RATES.parental,
    upfrontBenefitRate: BENEFIT_RATES.upfront,
  };

  if (input.plan) {
    const { firstParentWeeks: a, secondParentWeeks: b } = input.plan;
    assertNonNegative(a, 'plan.firstParentWeeks');
    assertNonNegative(b, 'plan.secondParentWeeks');
    const issues: string[] = [];
    if (a > maxWeeksForOneParent) {
      issues.push(`Pierwszy rodzic: ${a} tyg. > maks. ${maxWeeksForOneParent} tyg. (9 tyg. należy wyłącznie do drugiego rodzica).`);
    }
    if (b > maxWeeksForOneParent) {
      issues.push(`Drugi rodzic: ${b} tyg. > maks. ${maxWeeksForOneParent} tyg. (9 tyg. należy wyłącznie do pierwszego rodzica).`);
    }
    if (a + b > totalWeeks) issues.push(`Suma ${a + b} tyg. przekracza wymiar ${totalWeeks} tyg.`);
    result.plan = {
      valid: issues.length === 0,
      issues,
      usedWeeks: a + b,
      unusedWeeks: Math.max(0, totalWeeks - a - b),
    };
  }
  return result;
}
