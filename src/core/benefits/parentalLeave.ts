/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES URLOPU RODZICIELSKIEGO.
 *
 *  - 41 tyg. (1 dziecko), 43 tyg. (2+ dzieci z jednego porodu),
 *  - z zaświadczeniem „Za życiem”: 65 / 67 tyg.,
 *  - w tym 9 tygodni niezbywalnych dla każdego rodzica (nie można ich przenieść),
 *    więc jeden rodzic może wykorzystać maksymalnie (wymiar − 9) tygodni.
 *  - Wysokość: 70% podstawy (81,5% przy wniosku w ciągu 21 dni – patrz maternityBenefitAmount).
 */
import { DEFAULT_LEGAL_PARAMETERS as D, legal, parentalPoolWeeks } from '../legal/parameters';
import { assertIntInRange, assertNonNegative, benefitRates } from './common';

/** Wartości domyślne (2026). Kalkulator używa aktywnego zestawu parametrów. */
export const PARENTAL_LEAVE_WEEKS = D.parentalWeeks;
export const PARENTAL_NON_TRANSFERABLE_WEEKS = D.parentalNonTransferableWeeks;

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
  return parentalPoolWeeks(childrenCount, zaZyciem);
}

export function calculateParentalLeave(input: ParentalLeaveInput): ParentalLeaveResult {
  const totalWeeks = parentalLeaveWeeks(input.childrenCount, Boolean(input.zaZyciem));
  const reserved = legal().parentalNonTransferableWeeks;
  const maxWeeksForOneParent = totalWeeks - reserved;
  const result: ParentalLeaveResult = {
    totalWeeks,
    totalDays: totalWeeks * 7,
    nonTransferableWeeksPerParent: reserved,
    maxWeeksForOneParent,
    benefitRate: benefitRates().parental,
    upfrontBenefitRate: benefitRates().upfront,
  };

  if (input.plan) {
    const { firstParentWeeks: a, secondParentWeeks: b } = input.plan;
    assertNonNegative(a, 'plan.firstParentWeeks');
    assertNonNegative(b, 'plan.secondParentWeeks');
    const issues: string[] = [];
    if (a > maxWeeksForOneParent) {
      issues.push(`Pierwszy rodzic: ${a} tyg. > maks. ${maxWeeksForOneParent} tyg. (${reserved} tyg. należy wyłącznie do drugiego rodzica).`);
    }
    if (b > maxWeeksForOneParent) {
      issues.push(`Drugi rodzic: ${b} tyg. > maks. ${maxWeeksForOneParent} tyg. (${reserved} tyg. należy wyłącznie do pierwszego rodzica).`);
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
