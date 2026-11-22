/**
 * Zintegrowany kalkulator świadczeń (ZUS, zadanie pkt 1 i 3): JEDNA funkcja, która dla wybranej sytuacji
 *  1) ocenia prawo do zasiłku macierzyńskiego (przysługuje / nie przysługuje / brakuje danych – z uzasadnieniem),
 *  2) układa okresy urlopów (macierzyński lub na jego warunkach → rodzicielski → część drugiego rodzica),
 *  3) liczy podstawę wymiaru i kwoty – tylko gdy prawo jest ustalone,
 *  4) porównuje warianty 81,5% (wniosek w 21 dni) oraz 100% + 70%.
 * Same przepisy liczą istniejące kalkulatory (benefitBase, maternityLeave, adoptionMaternityLeave, parentalLeave,
 * paternityLeave, maternityBenefitAmount) – tu jest tylko ich połączenie. Wynik jest szacunkiem, nie decyzją ZUS.
 */
import { addDays, addMonths } from 'date-fns';

import type { Employment, Work } from '../types';
import { debtThreshold, DEFAULT_LEGAL_PARAMETERS, legal } from '../legal/parameters';
import { calculateAdoptionMaternityLeave } from './adoptionMaternityLeave';
import { calculateBenefitBase, type BenefitBaseResult } from './benefitBase';
import { BenefitInputError, daysInclusive, endOfPeriod, parseIsoDate, roundMoney, toIsoDate } from './common';
import { calculateMaternityBenefitAmount, LEAVE_KIND_LABELS, type LeaveKind, type LeaveSegment, type MaternityBenefitAmountResult } from './maternityBenefitAmount';
import { calculateMaternityLeave } from './maternityLeave';
import { calculateParentalLeave, type ParentalLeaveResult } from './parentalLeave';
import { calculatePaternityLeave } from './paternityLeave';
import { calculateSupplementaryMaternityLeave } from './supplementaryMaternityLeave';

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
  /** Drugi rodzic – własne prawo do zasiłku i własna podstawa (kwoty jego urlopów). */
  partner?: PartnerInput;
  /** Ojciec przejmuje część urlopu macierzyńskiego (art. 180 KP). */
  maternityTransfer?: { weeks: number; reason: MaternityTransferReason };
  /** Uzupełniający urlop macierzyński – wcześniak albo hospitalizacja dziecka. */
  supplementary?: { gestationalWeek: number; birthWeightGrams: number; hospitalFrom: string; hospitalTo: string; takenBy: 'me' | 'partner' };
  /** Umowa o pracę na czas określony / okres próbny – ostatni dzień (art. 177 § 3 KP). */
  contractEndDate?: string;
  /** Początek obecnego ubezpieczenia chorobowego – ryzyko kontroli „pozorności” umowy w ciąży. */
  insuranceStartDate?: string;
  /** Podstawa składek została podwyższona w czasie ciąży. */
  baseRaisedInPregnancy?: boolean;
};

export type PartnerInput = {
  employment: Employment;
  sicknessInsurance: SicknessInsurance;
  averageMonthlyGross: number;
};

/** Przyczyna przejęcia macierzyńskiego: zwykła (po 14 tyg.) albo szczególna (wcześniej). */
export type MaternityTransferReason = 'standard' | 'hospital' | 'incapacity' | 'death' | 'abandonment';

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
  /** Drugi rodzic: prawo, podstawa i kwoty (przejęty macierzyński, uzupełniający, rodzicielski, ojcowski). */
  partner?: { eligibility: Eligibility; base?: BenefitBaseResult; amounts?: MaternityBenefitAmountResult };
  /** Uzupełniający urlop macierzyński – wynik i uzasadnienie. */
  supplementary?: { eligible: boolean; weeks: number; caseLabel: string; notes: string[] };
  /** Suma świadczeń obojga rodziców (tylko osób z ustalonym prawem). */
  familyTotal: number;
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
export const DEBT_THRESHOLD = debtThreshold(DEFAULT_LEGAL_PARAMETERS);

/** Ocena prawa do zasiłku macierzyńskiego na podstawie podanych danych (trzy stany, zawsze z uzasadnieniem). */
export function assessEligibility(
  input: Pick<BenefitScenarioInput, 'kind' | 'employment' | 'sicknessInsurance' | 'arrearsAmount' | 'insuranceEnded' | 'eventDate'> &
    Partial<Pick<BenefitScenarioInput, 'contractEndDate' | 'insuranceStartDate' | 'baseRaisedInPregnancy'>>,
): Eligibility {
  const result: Eligibility = { status: 'unknown', reasons: [], missing: [], warnings: [], alternatives: [] };
  const voluntary = VOLUNTARY.includes(input.employment);
  const birthLike = input.kind === 'birth' || input.kind === 'pregnancy';
  const pregnancyStart = birthLike && input.eventDate ? addDays(parseIsoDate(input.eventDate, 'eventDate'), -PREGNANCY_DAYS) : undefined;

  // Art. 177 § 3 KP: umowa na czas określony / okres próbny > 1 mies., która rozwiązałaby się po upływie
  // 3. miesiąca ciąży, ulega przedłużeniu do dnia porodu. Wcześniejsze rozwiązanie = brak ubezpieczenia w dniu porodu.
  if (input.employment === 'employment_contract' && pregnancyStart && input.contractEndDate && input.contractEndDate < input.eventDate) {
    const end = parseIsoDate(input.contractEndDate, 'contractEndDate');
    const thirdMonthEnd = addMonths(pregnancyStart, 3);
    const endText = input.contractEndDate.split('-').reverse().join('.');
    if (end > thirdMonthEnd) {
      result.warnings.push(
        `Umowa kończy się ${endText}, już po 3. miesiącu ciąży – ulega przedłużeniu do dnia porodu (art. 177 § 3 Kodeksu pracy), więc w dniu porodu będziesz ubezpieczona. Przekaż pracodawcy zaświadczenie lekarskie o ciąży. Po porodzie umowa wygasa, a zasiłek macierzyński wypłaca ZUS – zakres okresów potwierdź w ZUS.`,
      );
    } else {
      result.status = 'not_eligible';
      result.reasons.push(
        `Umowa kończy się ${endText}, przed upływem 3. miesiąca ciąży, więc nie zostanie przedłużona do dnia porodu. Bez innego tytułu do ubezpieczenia chorobowego w dniu porodu zasiłek macierzyński nie przysługuje.`,
      );
      result.alternatives.push('Nowa umowa o pracę albo dobrowolne ubezpieczenie chorobowe (zlecenie, działalność) trwające w dniu porodu daje prawo do zasiłku macierzyńskiego.');
      result.alternatives.push(PARENTAL_BENEFIT_ALTERNATIVE);
      return result;
    }
  }
  // Ryzyka z zadania ZUS (sekcja H): pozorność umowy i podwyższenie podstawy w ciąży.
  if (pregnancyStart && input.insuranceStartDate && parseIsoDate(input.insuranceStartDate, 'insuranceStartDate') >= pregnancyStart) {
    result.warnings.push(
      'Ubezpieczenie zaczęło się w czasie ciąży. ZUS może sprawdzić, czy umowa lub działalność nie została zawarta wyłącznie dla pozoru – wtedy wyda decyzję o niepodleganiu ubezpieczeniu i zasiłek nie przysługuje. Zachowaj dowody faktycznie wykonywanej pracy (umowy, faktury, korespondencję).',
    );
  }
  if (input.baseRaisedInPregnancy) {
    result.warnings.push(
      'Podstawa składek wzrosła w czasie ciąży. Jeśli ZUS uzna, że podwyższenie miało na celu wyłącznie wyższy zasiłek, ustali niższą podstawę – zasiłek będzie niższy niż w tym wyliczeniu.',
    );
  }
  if (voluntary && input.kind === 'pregnancy') {
    result.warnings.push('Nie wyrejestrowuj się z dobrowolnego ubezpieczenia chorobowego i nie kończ umowy ani działalności przed porodem – w dniu porodu ubezpieczenie musi trwać.');
  }

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
  const threshold = debtThreshold();
  if (input.employment === 'self_employed' && result.status === 'eligible' && debt > threshold) {
    const fix = `Spłać całe zadłużenie w ciągu 6 miesięcy od dnia powstania prawa – wtedy zasiłek zostanie wypłacony (najpóźniej 60 dni od spłaty). Bez spłaty prawo się przedawni.`;
    if (input.kind === 'pregnancy') {
      result.warnings.push(
        `Zaległość w składkach: ${formatAmount(debt)} (próg: ${formatAmount(threshold)}). Jeśli w dniu porodu będzie wyższa niż próg, zasiłek nie zostanie wypłacony do czasu spłaty całości (art. 2a ustawy zasiłkowej). Spłać ją przed porodem.`,
      );
    } else {
      result.status = 'not_eligible';
      result.reasons.push(
        `Zadłużenie składkowe ${formatAmount(debt)} przekracza próg zadłużenia (${formatAmount(threshold)}) – zasiłek nie przysługuje do czasu spłaty całości (art. 2a ustawy zasiłkowej).`,
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
  const p = legal();
  if (input.kind !== 'foster') return p.adoptionChildAgeLimitYears;
  return input.schoolDeferral ? p.fosterChildAgeLimitDeferredYears : p.fosterChildAgeLimitYears;
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
      const lp = legal();
      const sevenDaysAfterDeath = addDays(death, lp.lossMinDaysAfterDeath);
      const eightWeeksEnd = endOfPeriod(birth, lp.lossMaternityWeeks * 7);
      const lossEnd = death < addDays(birth, lp.lossMaternityWeeks * 7) && sevenDaysAfterDeath < eightWeeksEnd ? eightWeeksEnd : sevenDaysAfterDeath;
      const regularEnd = parseIsoDate(first.end, 'eventDate');
      const end = lossEnd < regularEnd ? lossEnd : regularEnd;
      first = { ...first, end: toIsoDate(end), next: toIsoDate(addDays(end, 1)), weeks: roundMoney(daysInclusive(birth, end) / 7) };
      notes.push('Po stracie dziecka urlop macierzyński trwa 8 tygodni po porodzie (nie krócej niż 7 dni od dnia zgonu). Urlop rodzicielski i ojcowski nie przysługują.');
    }
  }
  const lossCase = Boolean(input.loss) && !adopting;
  const birthLike = !adopting && !lossCase && (input.kind === 'birth' || input.kind === 'pregnancy');
  const p = legal();

  // 1b. Ojciec przejmuje część macierzyńskiego: zwykle po 14 tyg. matki, wcześniej w sytuacjach z art. 180 KP.
  let transfer: { start: string; end: string; weeks: number } | undefined;
  if (birthLike && input.maternityTransfer && input.maternityTransfer.weeks > 0) {
    const reason = input.maternityTransfer.reason;
    const motherMin = reason === 'death' || reason === 'abandonment' ? 0 : reason === 'standard' ? p.maternityMotherMinWeeks : p.maternityMotherMinWeeksSpecial;
    const maxTransfer = Math.max(0, Math.floor(first.weeks) - motherMin);
    const weeks = Math.min(Math.round(input.maternityTransfer.weeks), maxTransfer);
    if (weeks < input.maternityTransfer.weeks) {
      notes.push(`Matka musi wykorzystać co najmniej ${motherMin} tyg. urlopu macierzyńskiego – ojciec może przejąć najwyżej ${maxTransfer} tyg.`);
    }
    if (weeks > 0) {
      const motherEnd = endOfPeriod(parseIsoDate(first.start, 'eventDate'), (first.weeks - weeks) * 7);
      const partnerStart = addDays(motherEnd, 1);
      const partnerEnd = endOfPeriod(partnerStart, weeks * 7);
      transfer = { start: toIsoDate(partnerStart), end: toIsoDate(partnerEnd), weeks };
      first = { ...first, end: toIsoDate(motherEnd), next: toIsoDate(addDays(partnerEnd, 1)), weeks: first.weeks - weeks };
      notes.push(TRANSFER_NOTES[reason]);
    }
  }

  // 1c. Uzupełniający urlop macierzyński – bezpośrednio po macierzyńskim, jednorazowo.
  let supplementary: { start: string; end: string; weeks: number; who: 'me' | 'partner' } | undefined;
  let supplementaryInfo: BenefitScenarioResult['supplementary'];
  if (birthLike && input.supplementary) {
    const sup = input.supplementary;
    const maternityEnd = transfer?.end ?? first.end;
    let r: ReturnType<typeof calculateSupplementaryMaternityLeave>;
    try {
      r = calculateSupplementaryMaternityLeave({
        birthDate: input.eventDate,
        gestationalWeek: sup.gestationalWeek,
        children: [{ birthWeightGrams: sup.birthWeightGrams, hospitalizations: sup.hospitalFrom && sup.hospitalTo ? [{ from: sup.hospitalFrom, to: sup.hospitalTo }] : [] }],
        maternityLeaveEndDate: maternityEnd,
      });
    } catch (e) {
      if (e instanceof BenefitInputError) throw new BenefitInputError(e.message, `supplementary.${e.field ?? ''}`);
      throw e;
    }
    supplementaryInfo = { eligible: r.eligible && r.weeks > 0, weeks: r.weeks, caseLabel: r.caseLabel, notes: r.notes };
    if (r.eligible && r.weeks > 0 && r.startDate && r.endDate) {
      supplementary = { start: r.startDate, end: r.endDate, weeks: r.weeks, who: sup.takenBy };
      first = { ...first, next: toIsoDate(addDays(parseIsoDate(r.endDate, 'eventDate'), 1)) };
    }
  }

  // 2. Urlop rodzicielski: 9 tygodni należy wyłącznie do drugiego rodzica. Po stracie dziecka – brak.
  const totalParental = calculateParentalLeave({ childrenCount: input.childrenCount, zaZyciem: input.zaZyciem }).totalWeeks;
  const reservedWeeks = legal().parentalNonTransferableWeeks;
  const maxOne = totalParental - reservedWeeks;
  const partnerWeeks = lossCase ? 0 : Math.max(0, Math.min(Math.round(input.partnerParentalWeeks), maxOne));
  const myWeeks = lossCase ? 0 : totalParental - Math.max(reservedWeeks, partnerWeeks);
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
  if (transfer) {
    periods.push({ kind: 'maternity', label: 'Urlop macierzyński – część przejęta przez ojca', who: 'partner', startDate: transfer.start, endDate: transfer.end, weeks: transfer.weeks });
  }
  if (supplementary) {
    periods.push({ kind: 'supplementary_maternity', label: LEAVE_KIND_LABELS.supplementary_maternity, who: supplementary.who, startDate: supplementary.start, endDate: supplementary.end, weeks: supplementary.weeks });
  }
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
    supplementary: supplementaryInfo,
    familyTotal: 0,
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
        ...(supplementary?.who === 'me' ? [{ leave: 'supplementary_maternity' as const, weeks: supplementary.weeks }] : []),
        ...(myParentalWeeks > 0 ? [{ leave: 'parental' as const, weeks: myParentalWeeks }] : []),
      ],
      // Po stracie dziecka nie ma wniosku o urlop rodzicielski, więc wariant 81,5% nie ma zastosowania.
      upfrontApplication: lossCase ? false : input.upfrontApplication,
    });
    notes.push(...base.notes);
  }

  // 5. Drugi rodzic – własne prawo, własna podstawa, własne okresy.
  if (input.partner) {
    const partnerEligibility = assessEligibility({ kind: input.kind, employment: input.partner.employment, sicknessInsurance: input.partner.sicknessInsurance, eventDate: input.eventDate });
    const partnerResult: NonNullable<BenefitScenarioResult['partner']> = { eligibility: partnerEligibility };
    const partnerParental = periods.filter((x) => x.kind === 'parental_other_parent').reduce((n, x) => n + x.weeks, 0);
    const segments: LeaveSegment[] = [
      ...(transfer ? [{ leave: 'maternity' as const, weeks: transfer.weeks }] : []),
      ...(supplementary?.who === 'partner' ? [{ leave: 'supplementary_maternity' as const, weeks: supplementary.weeks }] : []),
      ...(partnerParental > 0 ? [{ leave: 'parental_other_parent' as const, weeks: partnerParental }] : []),
      ...(paternity ? [{ leave: 'paternity' as const, weeks: paternity.weeks }] : []),
    ];
    if (partnerEligibility.status === 'eligible' && input.partner.averageMonthlyGross > 0 && segments.length) {
      const voluntaryPartner = VOLUNTARY.includes(input.partner.employment);
      const base = voluntaryPartner
        ? calculateBenefitBase({ insuredType: 'non_employee', monthlyIncomes: Array.from({ length: 12 }, () => input.partner!.averageMonthlyGross) })
        : calculateBenefitBase({ insuredType: 'employee', months: Array.from({ length: 12 }, () => ({ fixedGross: input.partner!.averageMonthlyGross })) });
      partnerResult.base = base;
      // Ojciec przejmujący macierzyński i korzystający z ojcowskiego dostaje 100%; jego rodzicielski – 70%.
      const amounts = calculateMaternityBenefitAmount({ benefitBase: base.base, segments, upfrontApplication: false });
      amounts.segments = amounts.segments.map((x) => (x.leave === 'maternity' ? { ...x, label: 'Urlop macierzyński – część przejęta' } : x));
      partnerResult.amounts = amounts;
    } else if (partnerEligibility.status === 'eligible' && !(input.partner.averageMonthlyGross > 0)) {
      partnerEligibility.missing.push('Podaj wynagrodzenie drugiego rodzica, aby policzyć jego zasiłek.');
    }
    if (eligibility.status === 'not_eligible' && partnerEligibility.status === 'eligible' && birthLike) {
      notes.push('Nie masz prawa do zasiłku, ale drugi rodzic jest ubezpieczony – może pobierać zasiłek macierzyński za okres urlopu rodzicielskiego.');
    }
    result.partner = partnerResult;
  }
  result.familyTotal = roundMoney((result.amounts?.totalAmount ?? 0) + (result.partner?.amounts?.totalAmount ?? 0));
  return result;
}

const TRANSFER_NOTES: Record<MaternityTransferReason, string> = {
  standard: 'Po wykorzystaniu co najmniej 14 tygodni matka rezygnuje z reszty urlopu macierzyńskiego, a ojciec przejmuje ją bezpośrednio po niej (art. 180 KP). Ojciec składa wniosek u swojego pracodawcy albo w ZUS.',
  hospital: 'Matka przebywa w szpitalu i nie może opiekować się dzieckiem – po wykorzystaniu co najmniej 8 tygodni ojciec przejmuje urlop na czas pobytu w szpitalu (art. 180 KP). Potrzebne zaświadczenie ze szpitala.',
  incapacity: 'Matka ma orzeczenie o niezdolności do samodzielnej egzystencji – po wykorzystaniu co najmniej 8 tygodni ojciec przejmuje resztę urlopu (art. 180 KP). Potrzebne orzeczenie.',
  death: 'Po śmierci matki ojciec ma prawo do pozostałej części urlopu macierzyńskiego (art. 180 KP). Potrzebny akt zgonu.',
  abandonment: 'Matka porzuciła dziecko – ojciec ma prawo do pozostałej części urlopu macierzyńskiego (art. 180 KP).',
};
