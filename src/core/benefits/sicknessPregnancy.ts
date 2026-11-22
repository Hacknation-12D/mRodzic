/**
 * Kalkulator: WYNAGRODZENIE / ZASIŁEK CHOROBOWY W OKRESIE CIĄŻY.
 *
 *  - Wynagrodzenie chorobowe (pracodawca, tylko pracownik w trakcie ubezpieczenia):
 *    33 dni w roku kalendarzowym; 14 dni od roku następującego po roku, w którym pracownik skończył 50 lat.
 *  - Potem zasiłek chorobowy z ZUS. Okres zasiłkowy w ciąży: do 270 dni (także po ustaniu ubezpieczenia).
 *  - Okres zasiłkowy: sumuje się nieprzerwane niezdolności oraz poprzednie, jeśli przerwa ≤ 60 dni.
 *    Wyjątek: gdy po przerwie nowa niezdolność przypada w ciąży, wcześniejszych okresów się nie wlicza.
 *  - Dni opłacone przez pracodawcę wliczają się do okresu zasiłkowego.
 *  - Wysokość w ciąży: 100% podstawy (u pracodawcy i z ZUS).
 *
 * Okresy niezwiązane z ciążą można podać (wpływają na sumowanie okresu zasiłkowego) – liczone są
 * wg zasad ogólnych spoza PDF: 80% podstawy, limit 182 dni (91 dni po ustaniu ubezpieczenia).
 * Kalkulator nie sprawdza okresu wyczekiwania (30/90 dni ubezpieczenia).
 */
import { addDays, getYear } from 'date-fns';

import { DEFAULT_LEGAL_PARAMETERS } from '../legal/parameters';

import {
  assertIntInRange,
  assertNonNegative,
  assertPositive,
  benefitRates,
  BenefitInputError,
  dailyBenefitAmount,
  daysInclusive,
  legal,
  parseIsoDate,
  roundMoney,
  toIsoDate,
} from './common';

export const EMPLOYER_SICK_PAY_DAYS = DEFAULT_LEGAL_PARAMETERS.employerSickPayDays;
export const EMPLOYER_SICK_PAY_DAYS_OVER_50 = DEFAULT_LEGAL_PARAMETERS.employerSickPayDaysOver50;
export const PREGNANCY_BENEFIT_PERIOD_DAYS = DEFAULT_LEGAL_PARAMETERS.pregnancySicknessPeriodDays;
export const GENERAL_BENEFIT_PERIOD_DAYS = DEFAULT_LEGAL_PARAMETERS.generalSicknessPeriodDays;
export const GENERAL_BENEFIT_PERIOD_AFTER_INSURANCE_DAYS = 91;
export const MAX_GAP_DAYS_FOR_SAME_PERIOD = 60;

export type IncapacityPeriod = {
  /** Pierwszy dzień niezdolności (RRRR-MM-DD). */
  from: string;
  /** Ostatni dzień niezdolności (RRRR-MM-DD). */
  to: string;
  /** Czy niezdolność przypada w okresie ciąży. */
  pregnancy: boolean;
};

export type SicknessPregnancyInput = {
  /** Miesięczna podstawa wymiaru (np. z calculateBenefitBase). */
  benefitBase: number;
  /** 'insured' – w trakcie ubezpieczenia; 'after_insurance_ended' – zasiłek po ustaniu ubezpieczenia. */
  insuranceStatus: 'insured' | 'after_insurance_ended';
  /** Tylko pracownik dostaje wynagrodzenie chorobowe od pracodawcy. */
  insuredType: 'employee' | 'non_employee';
  /** Rok urodzenia – wymagany dla pracownika w trakcie ubezpieczenia (limit 33/14 dni). */
  birthYear?: number;
  /** Dni wynagrodzenia chorobowego wykorzystane w roku pierwszego podanego okresu, przed tym okresem. */
  employerDaysUsedBefore?: number;
  /** Okresy niezdolności chronologicznie, bez nakładania się. */
  periods: IncapacityPeriod[];
};

export type Payer = 'employer' | 'zus' | 'none';

export type SicknessSegment = {
  from: string;
  to: string;
  days: number;
  payer: Payer;
  /** Ułamek podstawy (1 = 100%). 0 dla dni niepłatnych. */
  rate: number;
  dailyAmount: number;
  amount: number;
  /** Indeks okresu z wejścia. */
  periodIndex: number;
  /** Indeks okresu zasiłkowego. */
  benefitPeriodIndex: number;
};

export type BenefitPeriodSummary = {
  index: number;
  from: string;
  to: string;
  /** Dni wliczone do okresu zasiłkowego. */
  countedDays: number;
  limitDays: number;
  pregnancy: boolean;
  remainingDays: number;
  /** Dlaczego okres zaczął się od nowa. */
  startReason: 'first' | 'gap_over_60_days' | 'pregnancy_after_break' | 'continued';
};

export type SicknessPregnancyResult = {
  segments: SicknessSegment[];
  benefitPeriods: BenefitPeriodSummary[];
  employerDaysByYear: Record<number, { used: number; limit: number }>;
  totals: {
    employerDays: number;
    employerAmount: number;
    zusDays: number;
    zusAmount: number;
    unpaidDays: number;
    totalAmount: number;
  };
  notes: string[];
};

type ParsedPeriod = { from: Date; to: Date; pregnancy: boolean; index: number };

/** Limit dni wynagrodzenia chorobowego w danym roku kalendarzowym. */
export function employerSickPayLimit(year: number, birthYear: number): number {
  return year > birthYear + 50 ? legal().employerSickPayDaysOver50 : legal().employerSickPayDays;
}

function parsePeriods(periods: IncapacityPeriod[]): ParsedPeriod[] {
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new BenefitInputError('Podaj co najmniej jeden okres niezdolności do pracy.', 'periods');
  }
  const parsed = periods.map((p, index) => {
    const from = parseIsoDate(p.from, `periods[${index}].from`);
    const to = parseIsoDate(p.to, `periods[${index}].to`);
    if (to < from) throw new BenefitInputError(`periods[${index}]: data „to” jest wcześniejsza niż „from”.`, `periods[${index}].to`);
    return { from, to, pregnancy: Boolean(p.pregnancy), index };
  });
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].from <= parsed[i - 1].to) {
      throw new BenefitInputError(`periods[${i}] nachodzi na poprzedni okres lub jest nieposortowany.`, `periods[${i}].from`);
    }
  }
  return parsed;
}

/** Grupuje okresy niezdolności w okresy zasiłkowe. */
function groupIntoBenefitPeriods(periods: ParsedPeriod[]) {
  const groups: { periods: ParsedPeriod[]; startReason: BenefitPeriodSummary['startReason'] }[] = [];
  periods.forEach((p, i) => {
    if (i === 0) {
      groups.push({ periods: [p], startReason: 'first' });
      return;
    }
    const gapDays = daysInclusive(periods[i - 1].to, p.from) - 2; // dni wolne od niezdolności pomiędzy
    const current = groups[groups.length - 1];
    if (gapDays === 0) current.periods.push(p);
    else if (p.pregnancy) groups.push({ periods: [p], startReason: 'pregnancy_after_break' });
    else if (gapDays > MAX_GAP_DAYS_FOR_SAME_PERIOD) groups.push({ periods: [p], startReason: 'gap_over_60_days' });
    else current.periods.push(p);
  });
  return groups;
}

export function calculateSicknessPregnancy(input: SicknessPregnancyInput): SicknessPregnancyResult {
  assertPositive(input.benefitBase, 'benefitBase');
  if (input.insuranceStatus !== 'insured' && input.insuranceStatus !== 'after_insurance_ended') {
    throw new BenefitInputError('insuranceStatus musi być „insured” albo „after_insurance_ended”.', 'insuranceStatus');
  }
  const periods = parsePeriods(input.periods);
  const employerPays = input.insuredType === 'employee' && input.insuranceStatus === 'insured';
  const notes: string[] = [];

  let birthYear = 0;
  if (employerPays) {
    if (input.birthYear === undefined) {
      throw new BenefitInputError('Dla pracownika podaj birthYear (limit 33/14 dni wynagrodzenia chorobowego).', 'birthYear');
    }
    assertIntInRange(input.birthYear, 1900, 2100, 'birthYear');
    birthYear = input.birthYear;
  }
  const usedBefore = input.employerDaysUsedBefore ?? 0;
  assertNonNegative(usedBefore, 'employerDaysUsedBefore');

  const employerDaysByYear: Record<number, { used: number; limit: number }> = {};
  if (employerPays) {
    const firstYear = getYear(periods[0].from);
    const limit = employerSickPayLimit(firstYear, birthYear);
    employerDaysByYear[firstYear] = { used: Math.min(usedBefore, limit), limit };
  }

  const segments: SicknessSegment[] = [];
  const benefitPeriods: BenefitPeriodSummary[] = [];
  const push = (seg: Omit<SicknessSegment, 'from' | 'to' | 'days' | 'amount'> & { day: Date }) => {
    const last = segments[segments.length - 1];
    const iso = toIsoDate(seg.day);
    if (
      last &&
      last.periodIndex === seg.periodIndex &&
      last.payer === seg.payer &&
      last.rate === seg.rate &&
      toIsoDate(addDays(parseIsoDate(last.to, 'to'), 1)) === iso
    ) {
      last.to = iso;
      last.days += 1;
      return;
    }
    segments.push({
      from: iso,
      to: iso,
      days: 1,
      payer: seg.payer,
      rate: seg.rate,
      dailyAmount: seg.dailyAmount,
      amount: 0,
      periodIndex: seg.periodIndex,
      benefitPeriodIndex: seg.benefitPeriodIndex,
    });
  };

  groupIntoBenefitPeriods(periods).forEach((group, groupIndex) => {
    const pregnancy = group.periods.some((p) => p.pregnancy);
    const limitDays = pregnancy
      ? legal().pregnancySicknessPeriodDays
      : input.insuranceStatus === 'insured'
        ? legal().generalSicknessPeriodDays
        : GENERAL_BENEFIT_PERIOD_AFTER_INSURANCE_DAYS;
    let counted = 0;

    for (const p of group.periods) {
      const rate = p.pregnancy ? benefitRates().full : benefitRates().sicknessGeneral;
      const daily = dailyBenefitAmount(input.benefitBase, rate);
      for (let day = p.from; day <= p.to; day = addDays(day, 1)) {
        counted += 1;
        const base = { day, periodIndex: p.index, benefitPeriodIndex: groupIndex };
        if (counted > limitDays) {
          push({ ...base, payer: 'none', rate: 0, dailyAmount: 0 });
          continue;
        }
        if (employerPays) {
          const year = getYear(day);
          const entry = (employerDaysByYear[year] ??= { used: 0, limit: employerSickPayLimit(year, birthYear) });
          if (entry.used < entry.limit) {
            entry.used += 1;
            push({ ...base, payer: 'employer', rate, dailyAmount: daily });
            continue;
          }
        }
        push({ ...base, payer: 'zus', rate, dailyAmount: daily });
      }
    }

    benefitPeriods.push({
      index: groupIndex,
      from: toIsoDate(group.periods[0].from),
      to: toIsoDate(group.periods[group.periods.length - 1].to),
      countedDays: counted,
      limitDays,
      pregnancy,
      remainingDays: Math.max(0, limitDays - counted),
      startReason: group.startReason,
    });
    if (counted > limitDays) {
      notes.push(`Okres zasiłkowy #${groupIndex + 1}: przekroczono limit ${limitDays} dni o ${counted - limitDays} dni (bez świadczenia).`);
    }
  });

  for (const seg of segments) seg.amount = roundMoney(seg.dailyAmount * seg.days);

  const totalsOf = (payer: Payer) => {
    const list = segments.filter((s) => s.payer === payer);
    return { days: sum(list.map((s) => s.days)), amount: roundMoney(sum(list.map((s) => s.amount))) };
  };
  const employer = totalsOf('employer');
  const zus = totalsOf('zus');
  const none = totalsOf('none');

  if (periods.some((p) => !p.pregnancy)) {
    notes.push('Okresy poza ciążą policzono wg zasad ogólnych: 80% podstawy, okres zasiłkowy 182 dni (91 po ustaniu ubezpieczenia).');
  }
  if (!employerPays) {
    notes.push('Brak wynagrodzenia chorobowego od pracodawcy – świadczenie od 1. dnia wypłaca ZUS.');
  }

  return {
    segments,
    benefitPeriods,
    employerDaysByYear,
    totals: {
      employerDays: employer.days,
      employerAmount: employer.amount,
      zusDays: zus.days,
      zusAmount: zus.amount,
      unpaidDays: none.days,
      totalAmount: roundMoney(employer.amount + zus.amount),
    },
    notes,
  };
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
