/**
 * Zintegrowany kalkulator świadczeń (ZUS, zadanie pkt 1 i 3): JEDNA funkcja, która dla wybranej sytuacji
 *  1) ocenia prawo do zasiłku macierzyńskiego (przysługuje / nie przysługuje / brakuje danych – z uzasadnieniem),
 *  2) układa okresy urlopów (macierzyński lub na jego warunkach → rodzicielski → część drugiego rodzica),
 *  3) liczy podstawę wymiaru i kwoty – tylko gdy prawo jest ustalone,
 *  4) porównuje warianty 81,5% (wniosek w 21 dni) oraz 100% + 70%.
 * Same przepisy liczą istniejące kalkulatory (benefitBase, maternityLeave, adoptionMaternityLeave, parentalLeave,
 * paternityLeave, maternityBenefitAmount) – tu jest tylko ich połączenie. Wynik jest szacunkiem, nie decyzją ZUS.
 */
import { addDays } from 'date-fns';

import type { Employment, Work } from '../types';
import {
  ADOPTION_CHILD_AGE_LIMIT_YEARS,
  calculateAdoptionMaternityLeave,
  FOSTER_CHILD_AGE_LIMIT_DEFERRED_SCHOOL_YEARS,
  FOSTER_CHILD_AGE_LIMIT_YEARS,
} from './adoptionMaternityLeave';
import { calculateBenefitBase, type BenefitBaseResult } from './benefitBase';
import { BenefitInputError, daysInclusive, endOfPeriod, parseIsoDate, roundMoney, toIsoDate } from './common';
import { calculateMaternityBenefitAmount, LEAVE_KIND_LABELS, type LeaveKind, type MaternityBenefitAmountResult } from './maternityBenefitAmount';
import { calculateMaternityLeave } from './maternityLeave';
import { calculateParentalLeave, PARENTAL_NON_TRANSFERABLE_WEEKS, type ParentalLeaveResult } from './parentalLeave';
import { calculatePaternityLeave } from './paternityLeave';

export type BenefitScenarioKind = 'birth' | 'pregnancy' | 'adoption' | 'foster';
export type SicknessInsurance = 'yes' | 'no' | 'unknown';
export type EligibilityStatus = 'eligible' | 'not_eligible' | 'unknown';
export type BenefitPayer = Work['benefitPayer'];

export type BenefitScenarioInput = {
  kind: BenefitScenarioKind;
  employment: Employment;
  /** Ubezpieczenie chorobowe. Przy umowie o pracę jest obowiązkowe; przy JDG i zleceniu – dobrowolne. */
  sicknessInsurance: SicknessInsurance;
  /** Przeciętne miesięczne wynagrodzenie (JDG: zadeklarowana podstawa składek) brutto z 12 miesięcy. */
  averageMonthlyGross: number;
  /** Data porodu / przewidywany termin porodu / dzień przyjęcia dziecka (RRRR-MM-DD). */
  eventDate: string;
  /** Liczba dzieci urodzonych przy jednym porodzie albo przyjętych jednocześnie (1–5). */
  childrenCount: number;
  /** Zaświadczenie „Za życiem” – dłuższy urlop rodzicielski. */
  zaZyciem: boolean;
  /** Adopcja / rodzina zastępcza: data urodzenia przyjmowanego dziecka. */
  childBirthDate?: string;
  /** Rodzina zastępcza: odroczony obowiązek szkolny (granica wieku 10 zamiast 7 lat). */
  schoolDeferral?: boolean;
  /** Tygodnie urlopu rodzicielskiego, które wykorzysta drugi rodzic (0 = nikt – 9 tygodni przepada). */
  partnerParentalWeeks: number;
  /** Wniosek o cały urlop w ciągu 21 dni od porodu (81,5%) zamiast osobnych wniosków (100% + 70%). */
  upfrontApplication: boolean;
  /** Kto wypłaca zasiłek (z PUE/eZUS); brak = nie wiemy. */
  benefitPayer?: BenefitPayer;
  /** Zaległość w składkach (zł) – istotna przy dobrowolnym ubezpieczeniu. */
  arrearsAmount?: number;
};

export type Eligibility = {
  status: EligibilityStatus;
  /** Uzasadnienie wyniku. */
  reasons: string[];
  /** Czego brakuje, żeby rozstrzygnąć (status „unknown”). */
  missing: string[];
  /** Ryzyka, które mogą zmienić wynik. */
  warnings: string[];
  /** Co przysługuje zamiast (np. świadczenie rodzicielskie). */
  alternatives: string[];
};

export type LeavePeriod = {
  kind: LeaveKind;
  label: string;
  who: 'me' | 'partner';
  startDate: string;
  endDate: string;
  weeks: number;
};

export type BenefitScenarioResult = {
  eligibility: Eligibility;
  periods: LeavePeriod[];
  parental: ParentalLeaveResult;
  /** Tygodnie rodzicielskiego, które wykorzystuje osoba licząca (po odjęciu części drugiego rodzica). */
  myParentalWeeks: number;
  /** Tygodnie, które przepadną (nikt ich nie wykorzysta). */
  unusedParentalWeeks: number;
  /** Urlop ojcowski drugiego rodzica – do kiedy można go wykorzystać (tylko poród). */
  paternity?: { weeks: number; deadline: string };
  /** Tylko gdy prawo do zasiłku jest ustalone. */
  base?: BenefitBaseResult;
  amounts?: MaternityBenefitAmountResult;
  payer: BenefitPayer | 'unknown';
  notes: string[];
};

const VOLUNTARY: Employment[] = ['self_employed', 'civil_contract'];

export const PARENTAL_BENEFIT_ALTERNATIVE =
  'Świadczenie rodzicielskie (1000 zł miesięcznie, np. przez 52 tygodnie przy jednym dziecku) dla rodziców bez zasiłku macierzyńskiego – wniosek składasz w urzędzie gminy lub MOPS, nie w ZUS.';

/** Ocena prawa do zasiłku macierzyńskiego na podstawie podanych danych (trzy stany, zawsze z uzasadnieniem). */
export function assessEligibility(input: Pick<BenefitScenarioInput, 'kind' | 'employment' | 'sicknessInsurance' | 'arrearsAmount'>): Eligibility {
  const result: Eligibility = { status: 'unknown', reasons: [], missing: [], warnings: [], alternatives: [] };
  const voluntary = VOLUNTARY.includes(input.employment);

  if (input.employment === 'employment_contract') {
    result.status = 'eligible';
    result.reasons.push('Umowa o pracę – ubezpieczenie chorobowe jest obowiązkowe, więc zasiłek macierzyński przysługuje.');
  } else if (voluntary) {
    const who = input.employment === 'self_employed' ? 'Przy działalności gospodarczej' : 'Przy umowie zlecenia';
    if (input.sicknessInsurance === 'yes') {
      result.status = 'eligible';
      result.reasons.push(`${who} ubezpieczenie chorobowe jest dobrowolne – opłacasz je, więc zasiłek przysługuje.`);
      result.reasons.push('Zasiłek macierzyński nie wymaga okresu wyczekiwania – wystarczy, że ubezpieczenie trwa w dniu porodu lub przyjęcia dziecka.');
    } else if (input.sicknessInsurance === 'no') {
      result.status = 'not_eligible';
      result.reasons.push(`${who} bez dobrowolnego ubezpieczenia chorobowego zasiłek macierzyński z ZUS nie przysługuje.`);
      result.alternatives.push(PARENTAL_BENEFIT_ALTERNATIVE);
    } else {
      result.missing.push(`${who} ubezpieczenie chorobowe jest dobrowolne. Zaznacz, czy je opłacasz – od tego zależy prawo do zasiłku.`);
    }
  } else if (input.employment === 'student' || input.employment === 'unemployed') {
    result.status = 'not_eligible';
    result.reasons.push('Brak tytułu do ubezpieczenia chorobowego (studia, brak pracy) – zasiłek macierzyński z ZUS nie przysługuje.');
    result.alternatives.push(PARENTAL_BENEFIT_ALTERNATIVE);
  } else {
    result.missing.push('Wybierz formę zatrudnienia – od niej zależy, czy podlegasz ubezpieczeniu chorobowemu.');
  }

  if (voluntary && (input.arrearsAmount ?? 0) > 0) {
    result.warnings.push(
      `Zaległość w składkach: ${formatAmount(input.arrearsAmount ?? 0)}. Przy dobrowolnym ubezpieczeniu nieopłacenie składki w terminie może oznaczać, że ubezpieczenie chorobowe ustało – sprawdź to w ZUS, zanim złożysz wniosek.`,
    );
  }
  if (input.kind === 'pregnancy' && result.status !== 'not_eligible') {
    result.warnings.push('Prawo do zasiłku ocenia się w dniu porodu – ubezpieczenie musi wtedy trwać (np. umowa nie może wcześniej wygasnąć).');
  }
  return result;
}

function formatAmount(n: number): string {
  return `${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

function payerFor(input: BenefitScenarioInput): BenefitPayer | 'unknown' {
  if (input.employment === 'self_employed') return 'zus';
  return input.benefitPayer ?? 'unknown';
}

function ageLimitYears(input: BenefitScenarioInput): number {
  if (input.kind !== 'foster') return ADOPTION_CHILD_AGE_LIMIT_YEARS;
  return input.schoolDeferral ? FOSTER_CHILD_AGE_LIMIT_DEFERRED_SCHOOL_YEARS : FOSTER_CHILD_AGE_LIMIT_YEARS;
}

/** Główny kalkulator. Błędne dane → BenefitInputError z nazwą pola (UI pokazuje go przy polu). */
export function calculateBenefitScenario(input: BenefitScenarioInput): BenefitScenarioResult {
  const eligibility = assessEligibility(input);
  const notes: string[] = [];
  const adopting = input.kind === 'adoption' || input.kind === 'foster';

  // 1. Urlop macierzyński albo na warunkach urlopu macierzyńskiego.
  let first: { kind: LeaveKind; start: string; end: string; next: string; weeks: number };
  let ageLimitDate: string | undefined;
  if (adopting) {
    if (!input.childBirthDate) throw new BenefitInputError('Podaj datę urodzenia dziecka.', 'childBirthDate');
    const r = calculateAdoptionMaternityLeave({
      startDate: input.eventDate,
      childBirthDates: Array.from({ length: input.childrenCount }, () => input.childBirthDate as string),
      ageLimitYears: ageLimitYears(input),
    });
    first = { kind: 'adoption_maternity', start: r.startDate, end: r.endDate, next: r.nextDayAfter, weeks: r.weeks };
    ageLimitDate = r.ageLimitDate;
    notes.push(...r.notes);
  } else {
    const r = calculateMaternityLeave({ childrenCount: input.childrenCount, startDate: input.eventDate });
    if (!r.startDate || !r.endDate || !r.nextDayAfter) throw new BenefitInputError('Podaj datę.', 'eventDate');
    first = { kind: 'maternity', start: r.startDate, end: r.endDate, next: r.nextDayAfter, weeks: r.weeks };
    if (input.kind === 'pregnancy') {
      notes.push('Urlop policzono od przewidywanego terminu porodu. Możesz go zacząć do 6 tygodni wcześniej – wtedy wcześniej się skończy.');
    }
  }

  // 2. Urlop rodzicielski: 9 tygodni należy wyłącznie do drugiego rodzica.
  const totalParental = calculateParentalLeave({ childrenCount: input.childrenCount, zaZyciem: input.zaZyciem }).totalWeeks;
  const maxOne = totalParental - PARENTAL_NON_TRANSFERABLE_WEEKS;
  const partnerWeeks = Math.max(0, Math.min(Math.round(input.partnerParentalWeeks), maxOne));
  const myWeeks = totalParental - Math.max(PARENTAL_NON_TRANSFERABLE_WEEKS, partnerWeeks);
  const parental = calculateParentalLeave({
    childrenCount: input.childrenCount,
    zaZyciem: input.zaZyciem,
    plan: { firstParentWeeks: myWeeks, secondParentWeeks: partnerWeeks },
  });
  const unusedParentalWeeks = parental.plan?.unusedWeeks ?? 0;
  if (unusedParentalWeeks > 0) {
    notes.push(`${unusedParentalWeeks} tyg. urlopu rodzicielskiego przepada, jeśli drugi rodzic ich nie wykorzysta (część nieprzenoszalna).`);
  }

  const periods: LeavePeriod[] = [
    { kind: first.kind, label: LEAVE_KIND_LABELS[first.kind], who: 'me', startDate: first.start, endDate: first.end, weeks: first.weeks },
  ];
  let cursor = parseIsoDate(first.next, 'eventDate');
  let myParentalWeeks = myWeeks;
  const addParental = (who: 'me' | 'partner', weeks: number): number => {
    if (weeks <= 0) return 0;
    let end = endOfPeriod(cursor, weeks * 7);
    if (ageLimitDate && end > parseIsoDate(ageLimitDate, 'childBirthDate')) {
      end = parseIsoDate(ageLimitDate, 'childBirthDate');
      if (end < cursor) return 0;
      notes.push(`Urlop rodzicielski skrócono – kończy się dzień przed ${ageLimitYears(input)}. urodzinami dziecka.`);
    }
    const days = daysInclusive(cursor, end);
    const realWeeks = roundMoney(days / 7);
    periods.push({
      kind: who === 'me' ? 'parental' : 'parental_other_parent',
      label: who === 'me' ? LEAVE_KIND_LABELS.parental : 'Urlop rodzicielski – drugi rodzic',
      who,
      startDate: toIsoDate(cursor),
      endDate: toIsoDate(end),
      weeks: realWeeks,
    });
    cursor = addDays(end, 1);
    return realWeeks;
  };
  myParentalWeeks = addParental('me', myWeeks);
  addParental('partner', partnerWeeks);

  // 3. Urlop ojcowski drugiego rodzica (2 tyg. do ukończenia przez dziecko 12 miesięcy).
  const paternity =
    input.kind === 'birth' || input.kind === 'pregnancy'
      ? (() => {
          const r = calculatePaternityLeave({ mode: 'birth', childBirthDate: input.eventDate });
          return { weeks: r.totalWeeks, deadline: r.deadline };
        })()
      : undefined;

  const result: BenefitScenarioResult = {
    eligibility,
    periods,
    parental,
    myParentalWeeks,
    unusedParentalWeeks,
    paternity,
    payer: payerFor(input),
    notes,
  };

  // 4. Kwoty – wyłącznie przy ustalonym prawie (zadanie ZUS: nie pokazujemy kwoty, gdy prawo nie przysługuje).
  if (eligibility.status === 'eligible') {
    if (!(input.averageMonthlyGross > 0)) {
      throw new BenefitInputError('Podaj przeciętne miesięczne wynagrodzenie brutto.', 'averageMonthlyGross');
    }
    const base =
      input.employment === 'employment_contract'
        ? calculateBenefitBase({
            insuredType: 'employee',
            months: Array.from({ length: 12 }, () => ({ fixedGross: input.averageMonthlyGross })),
          })
        : calculateBenefitBase({ insuredType: 'non_employee', monthlyIncomes: Array.from({ length: 12 }, () => input.averageMonthlyGross) });
    result.base = base;
    result.amounts = calculateMaternityBenefitAmount({
      benefitBase: base.base,
      segments: [
        { leave: first.kind, weeks: first.weeks },
        ...(myParentalWeeks > 0 ? [{ leave: 'parental' as const, weeks: myParentalWeeks }] : []),
      ],
      upfrontApplication: input.upfrontApplication,
    });
    notes.push(...base.notes);
  }
  return result;
}
