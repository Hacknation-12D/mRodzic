/**
 * Kalkulator: PODSTAWA WYMIARU ZASIŁKU (chorobowego i macierzyńskiego).
 *
 * Pracownik:
 *  - średnia z max. 12 pełnych miesięcy kalendarzowych poprzedzających miesiąc choroby
 *    (przy krótszym zatrudnieniu – z pełnych miesięcy nieprzerwanego ubezpieczenia),
 *  - miesiąc przepracowany w < 1/2 jest pomijany; w ≥ 1/2 – uzupełniany
 *    (stałe: pełna kwota z umowy, zmienne: faktyczna / dni przepracowane × dni robocze),
 *  - składniki nieuzupełniane (nadgodziny, dodatki nocne, prowizje) – w kwocie wypłaconej,
 *  - premie kwartalne: 1/12 sumy z 4 poprzednich kwartałów; roczne: 1/12 kwoty za poprzedni rok,
 *  - choroba w 1. miesiącu pracy: wynagrodzenie z umowy za pełny miesiąc,
 *  - wszystko pomniejszone o 13,71%,
 *  - minimum: 4147,10 zł × wymiar etatu,
 *  - przerwa między zasiłkami < 1 miesiąca → podstawa z poprzedniego zasiłku.
 *
 * Nie-pracownik (przedsiębiorca, zleceniobiorca):
 *  - średni miesięczny przychód (podstawa składki, max 23 550 zł/mies.) z 12 miesięcy − 13,71%,
 *  - limit podstawy 20 321,30 zł.
 *
 * Składników „pomijanych” (np. dodatek stażowy wypłacany za czas zwolnienia, nagrody uznaniowe)
 * nie należy podawać na wejściu.
 */
import { addMonths } from 'date-fns';

import { maxBenefitBaseNonEmployee, minBenefitBase } from '../legal/parameters';

import {
  afterSocialContributions,
  assertNonNegative,
  assertPositive,
  BenefitInputError,
  DAYS_PER_BENEFIT_MONTH,
  legal,
  parseIsoDate,
  roundMoney,
} from './common';

export type MonthlyPay = {
  /** Etykieta miesiąca, np. „2026-03” (tylko do opisu). */
  month?: string;
  /** Składniki stałe wg umowy (wynagrodzenie zasadnicze) – pełna kwota miesięczna, brutto. */
  fixedGross: number;
  /** Składniki zmienne podlegające uzupełnieniu (np. premia regulaminowa) – kwota faktycznie wypłacona. */
  variableGross?: number;
  /** Składniki nieuzupełniane: nadgodziny, dodatki nocne, prowizje – kwota faktycznie wypłacona. */
  nonSupplementedGross?: number;
  /** Obowiązujące dni pracy w miesiącu (wymagane, gdy podano daysWorked). */
  workingDays?: number;
  /** Dni faktycznie przepracowane. Brak = pełny miesiąc. */
  daysWorked?: number;
};

export type PreviousBenefit = {
  /** Podstawa wymiaru poprzedniego zasiłku. */
  base: number;
  /** Ostatni dzień poprzedniego zasiłku (RRRR-MM-DD). */
  previousBenefitEndDate: string;
  /** Pierwszy dzień nowej niezdolności / nowego zasiłku (RRRR-MM-DD). */
  newBenefitStartDate: string;
};

export type EmployeeBenefitBaseInput = {
  insuredType: 'employee';
  /** Pełne miesiące kalendarzowe przed miesiącem choroby, od najstarszego. Liczone jest max 12 ostatnich. */
  months: MonthlyPay[];
  /** Premie/nagrody kwartalne wypłacone za 4 poprzednie kwartały (brutto, max 4 kwoty). */
  quarterlyBonusesGross?: number[];
  /** Trzynastka / nagroda roczna za poprzedni rok (brutto). */
  annualBonusGross?: number;
  /** Wynagrodzenie z umowy za pełny miesiąc – gdy choroba w 1. miesiącu pracy (brak `months`). */
  contractMonthlyGross?: number;
  /** Wymiar etatu, np. 0.5. Domyślnie 1. Wpływa na minimalną podstawę. */
  employmentFraction?: number;
  previousBenefit?: PreviousBenefit;
};

export type NonEmployeeBenefitBaseInput = {
  insuredType: 'non_employee';
  /** Przychód (zadeklarowana podstawa składki chorobowej) za kolejne miesiące, od najstarszego. Max 12 ostatnich. */
  monthlyIncomes: number[];
  /** Zadeklarowana podstawa składki – gdy choroba w 1. miesiącu ubezpieczenia (brak `monthlyIncomes`). */
  declaredMonthlyBase?: number;
  previousBenefit?: PreviousBenefit;
};

export type BenefitBaseInput = EmployeeBenefitBaseInput | NonEmployeeBenefitBaseInput;

export type MonthStatus = 'full' | 'supplemented' | 'excluded';

export type MonthBreakdown = {
  month?: string;
  status: MonthStatus;
  /** Kwota brutto przyjęta do średniej (0 dla miesięcy wyłączonych). */
  countedGross: number;
};

export type BenefitBaseMethod =
  | 'previous_base'
  | 'twelve_months'
  | 'shorter_period'
  | 'all_months_supplemented'
  | 'first_month_contract';

export type BenefitBaseResult = {
  /** Miesięczna podstawa wymiaru zasiłku (po odjęciu 13,71%, z minimum/limitem). */
  base: number;
  /** 1/30 podstawy – stawka dzienna przy 100%. */
  dailyBase: number;
  method: BenefitBaseMethod;
  /** Średnie miesięczne wynagrodzenie/przychód brutto (wraz z 1/12 premii), przed odjęciem składek. */
  averageMonthlyGross: number;
  /** Podstawa przed zastosowaniem minimum/limitu. */
  baseBeforeLimits: number;
  monthsCounted: number;
  months: MonthBreakdown[];
  /** Miesięczna część premii kwartalnych i rocznych (brutto). */
  bonusesMonthlyShare: number;
  minimumApplied: boolean;
  capApplied: boolean;
  notes: string[];
};

const MAX_MONTHS = 12;

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Przerwa krótsza niż 1 miesiąc kalendarzowy → podstawa z poprzedniego zasiłku. */
function shouldReusePreviousBase(prev: PreviousBenefit): boolean {
  const end = parseIsoDate(prev.previousBenefitEndDate, 'previousBenefit.previousBenefitEndDate');
  const start = parseIsoDate(prev.newBenefitStartDate, 'previousBenefit.newBenefitStartDate');
  if (start <= end) {
    throw new BenefitInputError('Nowy zasiłek musi zaczynać się po zakończeniu poprzedniego.', 'previousBenefit.newBenefitStartDate');
  }
  return start <= addMonths(end, 1);
}

function previousBaseResult(prev: PreviousBenefit): BenefitBaseResult {
  assertPositive(prev.base, 'previousBenefit.base');
  return {
    base: roundMoney(prev.base),
    dailyBase: roundMoney(prev.base / DAYS_PER_BENEFIT_MONTH),
    method: 'previous_base',
    averageMonthlyGross: 0,
    baseBeforeLimits: roundMoney(prev.base),
    monthsCounted: 0,
    months: [],
    bonusesMonthlyShare: 0,
    minimumApplied: false,
    capApplied: false,
    notes: ['Przerwa między zasiłkami krótsza niż 1 miesiąc – obowiązuje podstawa poprzedniego zasiłku.'],
  };
}

function evaluateMonth(m: MonthlyPay, index: number, forceSupplement: boolean): MonthBreakdown {
  const f = `months[${index}]`;
  assertNonNegative(m.fixedGross, `${f}.fixedGross`);
  const variable = m.variableGross ?? 0;
  const nonSupplemented = m.nonSupplementedGross ?? 0;
  assertNonNegative(variable, `${f}.variableGross`);
  assertNonNegative(nonSupplemented, `${f}.nonSupplementedGross`);

  if (m.daysWorked === undefined) {
    return { month: m.month, status: 'full', countedGross: m.fixedGross + variable + nonSupplemented };
  }

  if (m.workingDays === undefined) {
    throw new BenefitInputError(`Podano daysWorked bez workingDays w ${f}.`, `${f}.workingDays`);
  }
  assertPositive(m.workingDays, `${f}.workingDays`);
  assertNonNegative(m.daysWorked, `${f}.daysWorked`);
  if (m.daysWorked > m.workingDays) {
    throw new BenefitInputError(`daysWorked nie może przekraczać workingDays w ${f}.`, `${f}.daysWorked`);
  }

  if (m.daysWorked === m.workingDays) {
    return { month: m.month, status: 'full', countedGross: m.fixedGross + variable + nonSupplemented };
  }

  const atLeastHalf = m.daysWorked * 2 >= m.workingDays;
  if (!atLeastHalf && !forceSupplement) {
    return { month: m.month, status: 'excluded', countedGross: 0 };
  }

  const variableSupplemented = m.daysWorked > 0 ? (variable / m.daysWorked) * m.workingDays : variable;
  return {
    month: m.month,
    status: 'supplemented',
    countedGross: m.fixedGross + variableSupplemented + nonSupplemented,
  };
}

function employeeBase(input: EmployeeBenefitBaseInput): BenefitBaseResult {
  const notes: string[] = [];
  const fraction = input.employmentFraction ?? 1;
  if (!(fraction > 0 && fraction <= 1)) {
    throw new BenefitInputError('employmentFraction musi być z zakresu (0, 1].', 'employmentFraction');
  }

  const quarterly = input.quarterlyBonusesGross ?? [];
  if (quarterly.length > 4) {
    throw new BenefitInputError('Podaj premie kwartalne z maksymalnie 4 poprzednich kwartałów.', 'quarterlyBonusesGross');
  }
  quarterly.forEach((q, i) => assertNonNegative(q, `quarterlyBonusesGross[${i}]`));
  const annual = input.annualBonusGross ?? 0;
  assertNonNegative(annual, 'annualBonusGross');
  const bonusesMonthlyShare = (sum(quarterly) + annual) / 12;

  let months = input.months ?? [];
  if (months.length > MAX_MONTHS) {
    notes.push(`Podano ${months.length} miesięcy – uwzględniono 12 ostatnich.`);
    months = months.slice(-MAX_MONTHS);
  }

  let method: BenefitBaseMethod;
  let breakdown: MonthBreakdown[] = [];
  let averageSalary: number;

  if (months.length === 0) {
    if (input.contractMonthlyGross === undefined) {
      throw new BenefitInputError(
        'Brak pełnych miesięcy – podaj contractMonthlyGross (choroba w 1. miesiącu pracy).',
        'contractMonthlyGross',
      );
    }
    assertPositive(input.contractMonthlyGross, 'contractMonthlyGross');
    method = 'first_month_contract';
    averageSalary = input.contractMonthlyGross;
    notes.push('Choroba w pierwszym miesiącu pracy – podstawa z wynagrodzenia umownego za pełny miesiąc.');
  } else {
    breakdown = months.map((m, i) => evaluateMonth(m, i, false));
    let counted = breakdown.filter((b) => b.status !== 'excluded');
    if (counted.length === 0) {
      // Żaden miesiąc nie ma przepracowanej połowy (np. choroba w 2. miesiącu pracy po niepełnym 1. miesiącu)
      // → wynagrodzenie uzupełnia się do pełnego miesiąca.
      breakdown = months.map((m, i) => evaluateMonth(m, i, true));
      counted = breakdown;
      method = 'all_months_supplemented';
      notes.push('We wszystkich miesiącach przepracowano mniej niż połowę – wynagrodzenie uzupełniono do pełnych miesięcy.');
    } else {
      method = months.length >= MAX_MONTHS ? 'twelve_months' : 'shorter_period';
    }
    const excluded = breakdown.length - counted.length;
    if (excluded > 0) notes.push(`Wyłączono ${excluded} mies. (przepracowano mniej niż połowę czasu pracy).`);
    averageSalary = sum(counted.map((b) => b.countedGross)) / counted.length;
  }

  const averageMonthlyGross = roundMoney(averageSalary + bonusesMonthlyShare);
  const baseBeforeLimits = afterSocialContributions(averageSalary + bonusesMonthlyShare);
  const minimum = roundMoney(minBenefitBase() * fraction);
  const minimumApplied = baseBeforeLimits < minimum;
  const base = minimumApplied ? minimum : baseBeforeLimits;
  if (minimumApplied) {
    notes.push(`Zastosowano minimalną podstawę ${minimum.toFixed(2)} zł (płaca minimalna − 13,71%, × etat ${fraction}).`);
  }

  return {
    base,
    dailyBase: roundMoney(base / DAYS_PER_BENEFIT_MONTH),
    method,
    averageMonthlyGross,
    baseBeforeLimits,
    monthsCounted: method === 'first_month_contract' ? 0 : breakdown.filter((b) => b.status !== 'excluded').length,
    months: breakdown,
    bonusesMonthlyShare: roundMoney(bonusesMonthlyShare),
    minimumApplied,
    capApplied: false,
    notes,
  };
}

function nonEmployeeBase(input: NonEmployeeBenefitBaseInput): BenefitBaseResult {
  const notes: string[] = [];
  let incomes = input.monthlyIncomes ?? [];
  if (incomes.length > MAX_MONTHS) {
    notes.push(`Podano ${incomes.length} miesięcy – uwzględniono 12 ostatnich.`);
    incomes = incomes.slice(-MAX_MONTHS);
  }
  incomes.forEach((v, i) => assertNonNegative(v, `monthlyIncomes[${i}]`));

  let method: BenefitBaseMethod;
  let values: number[];
  if (incomes.length === 0) {
    if (input.declaredMonthlyBase === undefined) {
      throw new BenefitInputError('Brak miesięcy – podaj declaredMonthlyBase (1. miesiąc ubezpieczenia).', 'declaredMonthlyBase');
    }
    assertPositive(input.declaredMonthlyBase, 'declaredMonthlyBase');
    values = [input.declaredMonthlyBase];
    method = 'first_month_contract';
  } else {
    values = incomes;
    method = incomes.length >= MAX_MONTHS ? 'twelve_months' : 'shorter_period';
  }

  let monthCapped = false;
  const capped = values.map((v) => {
    if (v > legal().maxContributionBaseNonEmployee) {
      monthCapped = true;
      return legal().maxContributionBaseNonEmployee;
    }
    return v;
  });
  if (monthCapped) notes.push(`Przychód ponad ${legal().maxContributionBaseNonEmployee} zł/mies. obcięto do limitu podstawy składki.`);

  const average = sum(capped) / capped.length;
  const baseBeforeLimits = afterSocialContributions(average);
  const capApplied = monthCapped || baseBeforeLimits > maxBenefitBaseNonEmployee();
  const base = Math.min(baseBeforeLimits, maxBenefitBaseNonEmployee());

  return {
    base,
    dailyBase: roundMoney(base / DAYS_PER_BENEFIT_MONTH),
    method,
    averageMonthlyGross: roundMoney(average),
    baseBeforeLimits,
    monthsCounted: incomes.length,
    months: incomes.map((v, i) => ({ month: `${i + 1}`, status: 'full', countedGross: Math.min(v, legal().maxContributionBaseNonEmployee) })),
    bonusesMonthlyShare: 0,
    minimumApplied: false,
    capApplied,
    notes,
  };
}

export function calculateBenefitBase(input: BenefitBaseInput): BenefitBaseResult {
  if (input.previousBenefit && shouldReusePreviousBase(input.previousBenefit)) {
    return previousBaseResult(input.previousBenefit);
  }
  if (input.insuredType === 'employee') return employeeBase(input);
  if (input.insuredType === 'non_employee') return nonEmployeeBase(input);
  throw new BenefitInputError('insuredType musi być „employee” albo „non_employee”.', 'insuredType');
}

/**
 * Podstawa z przeciętnego miesięcznego wynagrodzenia brutto – wspólna dla kalkulatora, wniosku i planu rodziny.
 * Pracownik (i osoba po ustaniu zatrudnienia): −13,71% i minimalna podstawa dla pełnego etatu.
 * Nie-pracownik: −13,71% i limit podstawy. Brak tytułu ubezpieczenia → 0.
 */
export function benefitBaseFromAverageGross(averageMonthlyGross: number, employment: string, employmentFraction = 1): number {
  if (!(averageMonthlyGross > 0)) return 0;
  if (employment === 'student' || employment === 'unemployed') return 0;
  if (employment === 'self_employed' || employment === 'civil_contract') {
    return calculateBenefitBase({ insuredType: 'non_employee', monthlyIncomes: Array.from({ length: 12 }, () => averageMonthlyGross) }).base;
  }
  return calculateBenefitBase({
    insuredType: 'employee',
    employmentFraction,
    months: Array.from({ length: 12 }, () => ({ fixedGross: averageMonthlyGross })),
  }).base;
}
