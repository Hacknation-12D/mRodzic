/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES UZUPEŁNIAJĄCEGO URLOPU MACIERZYŃSKIEGO.
 *
 * 1 tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu. Pobyty sumuje się,
 * niepełny tydzień zaokrągla w górę, wynik obcina do limitu:
 *  1. poród przed 28. tyg. ciąży                          → max 15 tyg.
 *  2. masa urodzeniowa ≤ 1000 g                           → max 15 tyg.
 *  3. przed 28. tyg. i masa ≤ 1000 g                      → max 15 tyg.
 *  4. poród w 28.–36. tyg., masa > 1000 g                 → max 8 tyg.
 *  5. poród od 37. tyg. i hospitalizacja min. 2 kolejne dni
 *     między 5. a 28. dniem po porodzie                   → max 8 tyg., liczone od 5. dnia po porodzie
 *  6. więcej niż jedno dziecko → decyduje najniższa masa i najdłuższa hospitalizacja.
 *
 * „N-ty dzień po porodzie” = data porodu + N dni. Wysokość: 100% podstawy.
 */
import { addDays, differenceInCalendarDays } from 'date-fns';

import {
  assertIntInRange,
  assertPositive,
  BENEFIT_RATES,
  BenefitInputError,
  endOfPeriod,
  parseIsoDate,
  toIsoDate,
} from './common';

export type Hospitalization = { from: string; to: string };

export type SupplementaryChild = {
  birthWeightGrams: number;
  hospitalizations: Hospitalization[];
};

export type SupplementaryMaternityLeaveInput = {
  /** Data porodu (RRRR-MM-DD). */
  birthDate: string;
  /** Tydzień ciąży, w którym nastąpił poród (np. 27 = przed 28. tygodniem). */
  gestationalWeek: number;
  /** Dzieci z porodu (przy ciąży mnogiej – wszystkie). */
  children: SupplementaryChild[];
  /** Opcjonalnie: ostatni dzień urlopu macierzyńskiego – urlop uzupełniający startuje dzień później. */
  maternityLeaveEndDate?: string;
};

export type SupplementaryCase = 1 | 2 | 3 | 4 | 5;

export type SupplementaryMaternityLeaveResult = {
  eligible: boolean;
  caseNumber: SupplementaryCase;
  caseLabel: string;
  multipleBirth: boolean;
  maxWeeks: number;
  /** Dni hospitalizacji wzięte do obliczeń (dziecko z najdłuższą hospitalizacją). */
  hospitalDaysCounted: number;
  /** Indeks dziecka, którego hospitalizacja zdecydowała o wymiarze. */
  decisiveChildIndex: number;
  lowestBirthWeightGrams: number;
  weeks: number;
  days: number;
  startDate?: string;
  endDate?: string;
  benefitRate: number;
  notes: string[];
};

const CASE_LABELS: Record<SupplementaryCase, string> = {
  1: 'Urodzenie przed 28. tygodniem ciąży',
  2: 'Masa urodzeniowa ≤ 1000 g',
  3: 'Urodzenie przed 28. tygodniem ciąży i masa ≤ 1000 g',
  4: 'Urodzenie w 28.–36. tygodniu ciąży, masa > 1000 g',
  5: 'Urodzenie od 37. tygodnia ciąży i hospitalizacja min. 2 kolejne dni między 5. a 28. dniem po porodzie',
};

function determineCase(week: number, lowestWeight: number): { caseNumber: SupplementaryCase; maxWeeks: number } {
  const early = week < 28;
  const light = lowestWeight <= 1000;
  if (early && light) return { caseNumber: 3, maxWeeks: 15 };
  if (early) return { caseNumber: 1, maxWeeks: 15 };
  if (light) return { caseNumber: 2, maxWeeks: 15 };
  if (week < 37) return { caseNumber: 4, maxWeeks: 8 };
  return { caseNumber: 5, maxWeeks: 8 };
}

/** Zbiór dni hospitalizacji jako przesunięć względem porodu (0 = dzień porodu). */
function hospitalDayOffsets(birth: Date, child: SupplementaryChild, childIndex: number): Set<number> {
  const offsets = new Set<number>();
  (child.hospitalizations ?? []).forEach((h, i) => {
    const field = `children[${childIndex}].hospitalizations[${i}]`;
    const from = parseIsoDate(h.from, `${field}.from`);
    const to = parseIsoDate(h.to, `${field}.to`);
    if (to < from) throw new BenefitInputError(`${field}: „to” przed „from”.`, `${field}.to`);
    const a = Math.max(0, differenceInCalendarDays(from, birth));
    const b = differenceInCalendarDays(to, birth);
    for (let d = a; d <= b; d++) offsets.add(d);
  });
  return offsets;
}

export function calculateSupplementaryMaternityLeave(
  input: SupplementaryMaternityLeaveInput,
): SupplementaryMaternityLeaveResult {
  const birth = parseIsoDate(input.birthDate, 'birthDate');
  assertIntInRange(input.gestationalWeek, 20, 45, 'gestationalWeek');
  if (!Array.isArray(input.children) || input.children.length === 0) {
    throw new BenefitInputError('Podaj co najmniej jedno dziecko.', 'children');
  }
  input.children.forEach((c, i) => assertPositive(c.birthWeightGrams, `children[${i}].birthWeightGrams`));

  const notes: string[] = [];
  const multipleBirth = input.children.length > 1;
  const lowestWeight = Math.min(...input.children.map((c) => c.birthWeightGrams));
  const { caseNumber, maxWeeks } = determineCase(input.gestationalWeek, lowestWeight);
  const countFromDay = caseNumber === 5 ? 5 : 0;

  const perChild = input.children.map((c, i) => {
    const offsets = hospitalDayOffsets(birth, c, i);
    const counted = [...offsets].filter((d) => d >= countFromDay).length;
    let qualifiesCase5 = false;
    for (let d = 5; d < 28; d++) {
      if (offsets.has(d) && offsets.has(d + 1)) {
        qualifiesCase5 = true;
        break;
      }
    }
    return { counted, qualifiesCase5 };
  });

  let decisiveChildIndex = 0;
  perChild.forEach((c, i) => {
    if (c.counted > perChild[decisiveChildIndex].counted) decisiveChildIndex = i;
  });
  const hospitalDaysCounted = perChild[decisiveChildIndex].counted;

  let eligible = hospitalDaysCounted > 0;
  if (caseNumber === 5 && !perChild.some((c) => c.qualifiesCase5)) {
    eligible = false;
    notes.push('Brak hospitalizacji trwającej min. 2 kolejne dni między 5. a 28. dniem po porodzie – urlop nie przysługuje.');
  }
  if (hospitalDaysCounted === 0) notes.push('Brak dni hospitalizacji, które można uwzględnić.');
  if (multipleBirth) notes.push('Poród mnogi – wymiar ustalono wg najniższej masy urodzeniowej i najdłuższej hospitalizacji.');

  const rawWeeks = Math.ceil(hospitalDaysCounted / 7);
  const weeks = eligible ? Math.min(rawWeeks, maxWeeks) : 0;
  if (eligible && rawWeeks > maxWeeks) notes.push(`Wymiar obcięto do limitu ${maxWeeks} tygodni.`);

  const result: SupplementaryMaternityLeaveResult = {
    eligible,
    caseNumber,
    caseLabel: CASE_LABELS[caseNumber],
    multipleBirth,
    maxWeeks,
    hospitalDaysCounted,
    decisiveChildIndex,
    lowestBirthWeightGrams: lowestWeight,
    weeks,
    days: weeks * 7,
    benefitRate: BENEFIT_RATES.full,
    notes,
  };

  if (input.maternityLeaveEndDate && weeks > 0) {
    const start = addDays(parseIsoDate(input.maternityLeaveEndDate, 'maternityLeaveEndDate'), 1);
    result.startDate = toIsoDate(start);
    result.endDate = toIsoDate(endOfPeriod(start, weeks * 7));
  }
  return result;
}
