/**
 * Kalkulator: WYSOKOŚĆ ZASIŁKU MACIERZYŃSKIEGO.
 *
 * Stawki (ułamek podstawy wymiaru):
 *  - urlop macierzyński / na warunkach macierzyńskiego   100%  (81,5% przy wniosku w 21 dni)
 *  - uzupełniający urlop macierzyński                    100%
 *  - urlop ojcowski                                       100%
 *  - urlop rodzicielski                                   70%   (81,5% przy wniosku w 21 dni)
 *  - 9 tyg. rodzicielskiego wyłącznie dla drugiego rodzica 70% (zawsze)
 *
 * Kalkulator liczy świadczenie jednej osoby z jej podstawy wymiaru. Drugi rodzic ma własną podstawę –
 * jego część liczy się osobnym wywołaniem.
 * Kwota dzienna = podstawa × stawka / 30; kwota za okres = kwota dzienna × liczba dni.
 */
import { assertNonNegative, assertPositive, BENEFIT_RATES, BenefitInputError, dailyBenefitAmount, roundMoney } from './common';

export type LeaveKind =
  | 'maternity'
  | 'adoption_maternity'
  | 'supplementary_maternity'
  | 'paternity'
  | 'parental'
  | 'parental_other_parent';

export const LEAVE_KIND_LABELS: Record<LeaveKind, string> = {
  maternity: 'Urlop macierzyński',
  adoption_maternity: 'Urlop na warunkach urlopu macierzyńskiego',
  supplementary_maternity: 'Uzupełniający urlop macierzyński',
  paternity: 'Urlop ojcowski',
  parental: 'Urlop rodzicielski',
  parental_other_parent: 'Urlop rodzicielski – część drugiego rodzica (9 tyg.)',
};

export type LeaveSegment = { leave: LeaveKind; weeks: number };

export type MaternityBenefitAmountInput = {
  /** Miesięczna podstawa wymiaru zasiłku. */
  benefitBase: number;
  /** Okresy urlopów, za które liczony jest zasiłek. */
  segments: LeaveSegment[];
  /** Wniosek o urlop macierzyński + cały rodzicielski złożony w ciągu 21 dni po porodzie → 81,5%. */
  upfrontApplication: boolean;
};

export type BenefitSegmentResult = {
  leave: LeaveKind;
  label: string;
  weeks: number;
  days: number;
  rate: number;
  dailyAmount: number;
  /** Kwota za 30 dni (orientacyjnie „miesięcznie”). */
  monthlyAmount: number;
  amount: number;
};

export type MaternityBenefitAmountResult = {
  segments: BenefitSegmentResult[];
  totalDays: number;
  totalAmount: number;
  /** Porównanie wariantów: wniosek w 21 dni (81,5%) vs osobne wnioski (100% + 70%). */
  variantComparison: { upfrontTotal: number; separateTotal: number; difference: number };
};

/** Stawka zasiłku dla danego urlopu. */
export function maternityBenefitRate(leave: LeaveKind, upfrontApplication: boolean): number {
  switch (leave) {
    case 'maternity':
    case 'adoption_maternity':
      return upfrontApplication ? BENEFIT_RATES.upfront : BENEFIT_RATES.full;
    case 'supplementary_maternity':
    case 'paternity':
      return BENEFIT_RATES.full;
    case 'parental':
      return upfrontApplication ? BENEFIT_RATES.upfront : BENEFIT_RATES.parental;
    case 'parental_other_parent':
      return BENEFIT_RATES.parental;
    default:
      throw new BenefitInputError(`Nieznany rodzaj urlopu: ${String(leave)}.`, 'segments.leave');
  }
}

function computeSegments(base: number, segments: LeaveSegment[], upfront: boolean): BenefitSegmentResult[] {
  return segments.map((s) => {
    const rate = maternityBenefitRate(s.leave, upfront);
    const days = Math.round(s.weeks * 7);
    const dailyAmount = dailyBenefitAmount(base, rate);
    return {
      leave: s.leave,
      label: LEAVE_KIND_LABELS[s.leave],
      weeks: s.weeks,
      days,
      rate,
      dailyAmount,
      monthlyAmount: roundMoney(dailyAmount * 30),
      amount: roundMoney(dailyAmount * days),
    };
  });
}

const total = (segments: BenefitSegmentResult[]) => roundMoney(segments.reduce((acc, s) => acc + s.amount, 0));

export function calculateMaternityBenefitAmount(input: MaternityBenefitAmountInput): MaternityBenefitAmountResult {
  assertPositive(input.benefitBase, 'benefitBase');
  if (!Array.isArray(input.segments) || input.segments.length === 0) {
    throw new BenefitInputError('Podaj co najmniej jeden okres urlopu.', 'segments');
  }
  input.segments.forEach((s, i) => assertNonNegative(s.weeks, `segments[${i}].weeks`));

  const upfront = Boolean(input.upfrontApplication);
  const segments = computeSegments(input.benefitBase, input.segments, upfront);
  const upfrontTotal = upfront ? total(segments) : total(computeSegments(input.benefitBase, input.segments, true));
  const separateTotal = upfront ? total(computeSegments(input.benefitBase, input.segments, false)) : total(segments);

  return {
    segments,
    totalDays: segments.reduce((acc, s) => acc + s.days, 0),
    totalAmount: total(segments),
    variantComparison: { upfrontTotal, separateTotal, difference: roundMoney(upfrontTotal - separateTotal) },
  };
}
