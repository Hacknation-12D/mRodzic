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
import { BenefitInputError, daysInclusive, endOfPeriod, MINIMUM_WAGE_2026, parseIsoDate, roundMoney, toIsoDate } from './common';
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
  /** Utrata dziecka (martwe urodzenie / zgon) – skraca urlop macierzyński, wyłącza rodzicielski i ojcowski. */
  loss?: { kind: 'stillbirth' | 'death'; date: string };
  /** Kto wypłaca zasiłek (z PUE/eZUS); brak = nie wiemy. */
  benefitPayer?: BenefitPayer;
  /** Zaległość w składkach (zł) – istotna przy działalności gospodarczej (art. 2a ustawy zasiłkowej). */
  arrearsAmount?: number;
  /** Ustanie ubezpieczenia chorobowego przed porodem: ostatni dzień i przyczyna (art. 30 ustawy zasiłkowej). */
  insuranceEnded?: { until: string; reason: 'liquidation' | 'bankruptcy' | 'employer_death' | 'unlawful_termination' | 'other' };
  /** Dzień obliczeń – do sprawdzenia terminu 21 dni na wniosek o wariant 81,5%. */
  asOf?: string;
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
  /** Obliczenia po stracie dziecka (UI pomija wybór wariantu wniosku). */
  loss: boolean;
  /** Ostatni dzień na wniosek o wariant 81,5% (21 dni po porodzie) i czy już minął. */
  upfrontDeadline?: string;
  upfrontDeadlinePassed: boolean;
};

const VOLUNTARY: Employment[] = ['self_employed', 'civil_contract'];

/** Poradnik ZUS 2026: osoby bez prawa do zasiłku macierzyńskiego (np. bezrobotne, studenci, umowa o dzieło). */
export const PARENTAL_BENEFIT_ALTERNATIVE =
  'Świadczenie rodzicielskie – dla osób, które z powodu swojej sytuacji zawodowej nie mogą skorzystać z zasiłku macierzyńskiego (np. bezrobotnych, studentów, pracujących na umowę o dzieło). Wniosek nie trafia do ZUS – szczegóły na gov.pl (Ministerstwo Rodziny, Pracy i Polityki Społecznej).';

/** Przyczyny ustania ubezpieczenia w ciąży, przy których zasiłek macierzyński przysługuje (art. 30 ust. 1 ustawy zasiłkowej). */
const ART30_REASONS: Record<string, string> = {
  liquidation: 'likwidacji pracodawcy',
  bankruptcy: 'ogłoszenia upadłości pracodawcy',
  employer_death: 'śmierci pracodawcy',
  unlawful_termination: 'rozwiązania umowy z naruszeniem prawa (stwierdzonego prawomocnym wyrokiem sądu)',
};
/** Typowa długość ciąży – do sprawdzenia, czy ubezpieczenie ustało „w okresie ciąży”. */
const PREGNANCY_DAYS = 280;
/** Art. 2a ustawy zasiłkowej: zadłużenie > 1% minimalnego wynagrodzenia w dniu powstania prawa. */
export const DEBT_THRESHOLD = roundMoney(MINIMUM_WAGE_2026 * 0.01);

/** Ocena prawa do zasiłku macierzyńskiego na podstawie podanych danych (trzy stany, zawsze z uzasadnieniem). */
export function assessEligibility(
  input: Pick<BenefitScenarioInput, 'kind' | 'employment' | 'sicknessInsurance' | 'arrearsAmount' | 'insuranceEnded' | 'eventDate'>,
): Eligibility {
  const result: Eligibility = { status: 'unknown', reasons: [], missing: [], warnings: [], alternatives: [] };
  const voluntary = VOLUNTARY.includes(input.employment);

  // Ubezpieczenie ustało przed porodem (art. 30 ustawy zasiłkowej).
  const ended = input.insuranceEnded;
  if (ended && (input.kind === 'birth' || input.kind === 'pregnancy') && ended.until < input.eventDate) {
    const pregnancyStart = toIsoDate(addDays(parseIsoDate(input.eventDate, 'eventDate'), -PREGNANCY_DAYS));
    const why = ART30_REASONS[ended.reason];
    if (why && ended.until >= pregnancyStart) {
      result.status = 'eligible';
      result.reasons.push(
        `Ubezpieczenie chorobowe ustało w ciąży (${ended.until.split('-').reverse().join('.')}) wskutek ${why}. Zasiłek macierzyński przysługuje mimo to (art. 30 ust. 1 ustawy zasiłkowej) i wypłaca go ZUS.`,
      );
      if (ended.reason !== 'unlawful_termination') {
        result.reasons.push(
          'Do dnia porodu przysługuje też zasiłek w wysokości zasiłku macierzyńskiego, jeśli nie zapewniono Ci innego zatrudnienia (art. 30 ust. 3).',
        );
      } else {
        result.warnings.push('Potrzebny jest prawomocny wyrok sądu stwierdzający naruszenie prawa przy rozwiązaniu umowy.');
      }
      result.warnings.push('Do wniosku: zaświadczenie lekarskie o ciąży w okresie zatrudnienia i świadectwo pracy z przyczyną ustania stosunku pracy.');
      return result;
    }
    result.status = 'not_eligible';
    result.reasons.push(
      `Ubezpieczenie chorobowe ustało ${ended.until.split('-').reverse().join('.')}, przed porodem, z przyczyny, która nie daje prawa do zasiłku po ustaniu ubezpieczenia.`,
    );
    result.alternatives.push(PARENTAL_BENEFIT_ALTERNATIVE);
    return result;
  }

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

  // Art. 2a: osoby, które same opłacają składki (działalność gospodarcza) – zadłużenie > 1% minimalnego wynagrodzenia
  // w dniu powstania prawa wstrzymuje świadczenie do czasu spłaty całości; po 6 miesiącach bez spłaty prawo przedawnia się.
  const debt = input.arrearsAmount ?? 0;
  if (input.employment === 'self_employed' && result.status === 'eligible' && debt > DEBT_THRESHOLD) {
    const fix = `Spłać całe zadłużenie w ciągu 6 miesięcy od dnia powstania prawa – wtedy zasiłek zostanie wypłacony (najpóźniej 60 dni od spłaty). Bez spłaty prawo się przedawni.`;
    if (input.kind === 'pregnancy') {
      result.warnings.push(
        `Zaległość w składkach: ${formatAmount(debt)} (próg: ${formatAmount(DEBT_THRESHOLD)}). Jeśli w dniu porodu będzie wyższa niż próg, zasiłek nie zostanie wypłacony do czasu spłaty całości (art. 2a ustawy zasiłkowej). Spłać ją przed porodem.`,
      );
    } else {
      result.status = 'not_eligible';
      result.reasons.push(
        `Zadłużenie składkowe ${formatAmount(debt)} przekracza 1% minimalnego wynagrodzenia (${formatAmount(DEBT_THRESHOLD)}) – zasiłek nie przysługuje do czasu spłaty całości (art. 2a ustawy zasiłkowej).`,
      );
      result.warnings.push(fix);
    }
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
  // Działalność gospodarcza i zasiłki za okres po ustaniu ubezpieczenia wypłaca ZUS (art. 61 ustawy zasiłkowej).
  if (input.employment === 'self_employed' || input.insuranceEnded) return 'zus';
  return input.benefitPayer ?? 'unknown';
}

function ageLimitYears(input: BenefitScenarioInput): number {
  if (input.kind !== 'foster') return ADOPTION_CHILD_AGE_LIMIT_YEARS;
  return input.schoolDeferral ? FOSTER_CHILD_AGE_LIMIT_DEFERRED_SCHOOL_YEARS : FOSTER_CHILD_AGE_LIMIT_YEARS;
}

/** Główny kalkulator. Błędne dane → BenefitInputError z nazwą pola (UI pokazuje go przy polu). */
export function calculateBenefitScenario(input: BenefitScenarioInput): BenefitScenarioResult {
  if (!input.eventDate) throw new BenefitInputError('Wybierz datę z kalendarza.', 'eventDate');
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
    if (input.loss) {
      // Art. 180 § 4–5 KP: martwe urodzenie lub zgon przed 8. tygodniem życia → 8 tygodni po porodzie, nie krócej niż
      // 7 dni od zgonu; zgon po 8. tygodniu → urlop trwa jeszcze 7 dni od zgonu. Nigdy dłużej niż zwykły wymiar.
      const birth = parseIsoDate(input.eventDate, 'eventDate');
      const death = parseIsoDate(input.loss.date, 'loss.date');
      if (death < birth) throw new BenefitInputError('Data zgonu nie może być wcześniejsza niż data porodu.', 'loss.date');
      const sevenDaysAfterDeath = addDays(death, 7);
      const eightWeeksEnd = endOfPeriod(birth, 8 * 7);
      const lossEnd = death < addDays(birth, 8 * 7) && sevenDaysAfterDeath < eightWeeksEnd ? eightWeeksEnd : sevenDaysAfterDeath;
      const regularEnd = parseIsoDate(first.end, 'eventDate');
      const end = lossEnd < regularEnd ? lossEnd : regularEnd;
      first = { ...first, end: toIsoDate(end), next: toIsoDate(addDays(end, 1)), weeks: roundMoney(daysInclusive(birth, end) / 7) };
      notes.push('Po stracie dziecka urlop macierzyński trwa 8 tygodni po porodzie (nie krócej niż 7 dni od dnia zgonu). Urlop rodzicielski i ojcowski nie przysługują.');
    }
  }
  const lossCase = Boolean(input.loss) && !adopting;

  // 2. Urlop rodzicielski: 9 tygodni należy wyłącznie do drugiego rodzica. Po stracie dziecka – brak.
  const totalParental = calculateParentalLeave({ childrenCount: input.childrenCount, zaZyciem: input.zaZyciem }).totalWeeks;
  const maxOne = totalParental - PARENTAL_NON_TRANSFERABLE_WEEKS;
  const partnerWeeks = lossCase ? 0 : Math.max(0, Math.min(Math.round(input.partnerParentalWeeks), maxOne));
  const myWeeks = lossCase ? 0 : totalParental - Math.max(PARENTAL_NON_TRANSFERABLE_WEEKS, partnerWeeks);
  const parental = calculateParentalLeave({
    childrenCount: input.childrenCount,
    zaZyciem: input.zaZyciem,
    plan: { firstParentWeeks: myWeeks, secondParentWeeks: partnerWeeks },
  });
  const unusedParentalWeeks = lossCase ? 0 : (parental.plan?.unusedWeeks ?? 0);
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
    !lossCase && (input.kind === 'birth' || input.kind === 'pregnancy')
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
    loss: lossCase,
    upfrontDeadlinePassed: false,
  };

  // Wariant 81,5%: wniosek najpóźniej 21 dni po porodzie (art. 30a ustawy zasiłkowej).
  if (!lossCase && (input.kind === 'birth' || input.kind === 'pregnancy')) {
    const deadline = toIsoDate(addDays(parseIsoDate(input.eventDate, 'eventDate'), 21));
    result.upfrontDeadline = deadline;
    result.upfrontDeadlinePassed = Boolean(input.asOf && input.asOf > deadline);
    if (result.upfrontDeadlinePassed && input.upfrontApplication) {
      notes.push('Termin na wniosek o wariant 81,5% minął ' + deadline.split('-').reverse().join('.') + ' – ten wariant jest możliwy tylko, jeśli wniosek złożono w terminie.');
    }
  }

  // 4. Kwoty – wyłącznie przy ustalonym prawie (zadanie ZUS: nie pokazujemy kwoty, gdy prawo nie przysługuje).
  if (eligibility.status === 'eligible') {
    if (!(input.averageMonthlyGross > 0)) {
      throw new BenefitInputError('Podaj przeciętne miesięczne wynagrodzenie brutto.', 'averageMonthlyGross');
    }
    const base =
      input.employment === 'employment_contract' || input.insuranceEnded
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
      // Po stracie dziecka nie ma wniosku o urlop rodzicielski, więc wariant 81,5% nie ma zastosowania.
      upfrontApplication: lossCase ? false : input.upfrontApplication,
    });
    notes.push(...base.notes);
  }
  return result;
}
