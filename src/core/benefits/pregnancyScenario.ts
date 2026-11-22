/**
 * Zintegrowany kalkulator: ŚWIADCZENIA W CIĄŻY (zadanie ZUS, pkt 3 a).
 *
 *  1) prawo do zasiłku chorobowego: tytuł ubezpieczenia i okres wyczekiwania (30 dni – obowiązkowe, 90 – dobrowolne),
 *  2) wynagrodzenie chorobowe od pracodawcy (33 / 14 dni w roku) i zasiłek chorobowy z ZUS – w ciąży 100% podstawy,
 *  3) okres zasiłkowy w ciąży (270 dni) i świadczenie rehabilitacyjne po jego wyczerpaniu,
 *  4) zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu – po utracie pracy w ciąży wskutek likwidacji,
 *     upadłości lub śmierci pracodawcy albo rozwiązania umowy z naruszeniem prawa (art. 30 ust. 3 ustawy zasiłkowej).
 * Parametry pochodzą z aktywnego zestawu `legal()`. Wynik jest szacunkiem, nie decyzją ZUS.
 */
import { addDays } from 'date-fns';

import type { Employment } from '../types';
import { legal } from '../legal/parameters';
import { benefitBaseFromAverageGross } from './benefitBase';
import { BenefitInputError, daysInclusive, parseIsoDate, roundMoney, toIsoDate } from './common';
import type { Eligibility, SicknessInsurance } from './scenario';
import { calculateSicknessPregnancy, type IncapacityPeriod, type SicknessPregnancyResult } from './sicknessPregnancy';

export type JobLossReason = 'liquidation' | 'bankruptcy' | 'employer_death' | 'unlawful_termination';

export type PregnancyScenarioInput = {
  employment: Employment;
  /** Dobrowolne ubezpieczenie chorobowe (zlecenie, działalność). */
  sicknessInsurance: SicknessInsurance;
  /** Początek obecnego ubezpieczenia chorobowego (do okresu wyczekiwania). */
  insuranceSince?: string;
  /** Okres wyczekiwania nie obowiązuje (absolwent, 10 lat ubezpieczenia obowiązkowego, wcześniejsze okresy). */
  waitingException: boolean;
  averageMonthlyGross: number;
  /** Rok urodzenia – po 50. roku życia pracodawca płaci 14 dni zamiast 33. */
  birthYear?: number;
  /** Dni wynagrodzenia chorobowego wykorzystane wcześniej w tym roku. */
  employerDaysUsedBefore: number;
  /** Zwolnienia lekarskie (e-ZLA); `pregnancy` = kod „B”. */
  periods: IncapacityPeriod[];
  /** Przewidywany termin porodu. */
  dueDate?: string;
  /** Utrata pracy w ciąży z przyczyny z art. 30 ust. 3. */
  jobLoss?: { date: string; reason: JobLossReason };
};

export type MaternityLevelBenefit = {
  from: string;
  to: string;
  days: number;
  dailyAmount: number;
  amount: number;
  reason: string;
};

export type PregnancyScenarioResult = {
  eligibility: Eligibility;
  base?: number;
  /** Pierwszy dzień, za który przysługuje zasiłek (po okresie wyczekiwania). */
  waitingEnds?: string;
  sickness?: SicknessPregnancyResult;
  /** Ile dni okresu zasiłkowego w ciąży zostało. */
  remainingDays?: number;
  rehabilitation: { applies: boolean; text: string };
  maternityLevel?: MaternityLevelBenefit;
};

const VOLUNTARY: Employment[] = ['self_employed', 'civil_contract'];
const JOB_LOSS_TEXT: Record<JobLossReason, string> = {
  liquidation: 'likwidacji pracodawcy',
  bankruptcy: 'ogłoszenia upadłości pracodawcy',
  employer_death: 'śmierci pracodawcy',
  unlawful_termination: 'rozwiązania umowy z naruszeniem prawa (wymagany prawomocny wyrok sądu)',
};

export function calculatePregnancyScenario(input: PregnancyScenarioInput): PregnancyScenarioResult {
  const p = legal();
  const eligibility: Eligibility = { status: 'unknown', reasons: [], missing: [], warnings: [], alternatives: [] };
  const voluntary = VOLUNTARY.includes(input.employment);
  const rehabilitation = {
    applies: false,
    text: `Gdy po ${p.pregnancySicknessPeriodDays} dniach zasiłku nadal nie możesz pracować, a dalsze leczenie rokuje powrót do pracy, możesz wystąpić do ZUS o świadczenie rehabilitacyjne – maksymalnie na ${p.rehabilitationMaxMonths} mies., za okres niezdolności w ciąży ${Math.round(p.rates.rehabilitationPregnancy * 100)}% podstawy. Wniosek składasz w ZUS z zaświadczeniem lekarza prowadzącego.`,
  };

  // Zasiłek w wysokości macierzyńskiego – niezależny od zwolnień lekarskich.
  let maternityLevel: MaternityLevelBenefit | undefined;
  const base = benefitBaseFromAverageGross(input.averageMonthlyGross, input.jobLoss ? 'employment_contract' : input.employment);
  if (input.jobLoss) {
    if (!input.dueDate) throw new BenefitInputError('Podaj przewidywany termin porodu.', 'dueDate');
    const from = addDays(parseIsoDate(input.jobLoss.date, 'jobLoss.date'), 1);
    const to = addDays(parseIsoDate(input.dueDate, 'dueDate'), -1);
    if (to >= from && base > 0) {
      const days = daysInclusive(from, to);
      const dailyAmount = roundMoney((base * p.rates.full) / 30);
      maternityLevel = {
        from: toIsoDate(from),
        to: toIsoDate(to),
        days,
        dailyAmount,
        amount: roundMoney(dailyAmount * days),
        reason: `Zatrudnienie ustało w ciąży wskutek ${JOB_LOSS_TEXT[input.jobLoss.reason]}. Do dnia porodu przysługuje zasiłek w wysokości zasiłku macierzyńskiego (100% podstawy), a od porodu – zasiłek macierzyński. Wypłaca ZUS.`,
      };
    }
  }

  // Tytuł do ubezpieczenia chorobowego.
  if (input.employment === 'student' || input.employment === 'unemployed') {
    eligibility.status = 'not_eligible';
    eligibility.reasons.push('Brak tytułu do ubezpieczenia chorobowego – zasiłek chorobowy w ciąży nie przysługuje. Zwolnienie lekarskie usprawiedliwia jednak nieobecność (np. na uczelni).');
    return { eligibility, rehabilitation, maternityLevel };
  }
  if (voluntary && input.sicknessInsurance === 'no') {
    eligibility.status = 'not_eligible';
    eligibility.reasons.push('Bez dobrowolnego ubezpieczenia chorobowego zasiłek chorobowy nie przysługuje.');
    eligibility.alternatives.push('Możesz zgłosić się do dobrowolnego ubezpieczenia chorobowego – prawo do zasiłku powstanie po 90 dniach nieprzerwanego ubezpieczenia.');
    return { eligibility, rehabilitation, maternityLevel };
  }
  if (voluntary && input.sicknessInsurance === 'unknown') {
    eligibility.missing.push('Zaznacz, czy opłacasz dobrowolne ubezpieczenie chorobowe.');
    return { eligibility, rehabilitation, maternityLevel };
  }
  if (!(input.averageMonthlyGross > 0)) throw new BenefitInputError('Podaj przeciętne miesięczne wynagrodzenie brutto.', 'averageMonthlyGross');
  if (input.periods.length === 0) {
    eligibility.missing.push('Dodaj zwolnienie lekarskie (e-ZLA) – daty od i do.');
    return { eligibility, base, rehabilitation, maternityLevel };
  }

  // Okres wyczekiwania (art. 4 ustawy zasiłkowej).
  const waiting = voluntary ? p.waitingPeriodVoluntaryDays : p.waitingPeriodMandatoryDays;
  let periods = input.periods;
  let waitingEnds: string | undefined;
  if (!input.waitingException && input.insuranceSince) {
    const end = addDays(parseIsoDate(input.insuranceSince, 'insuranceSince'), waiting);
    waitingEnds = toIsoDate(end);
    const trimmed = periods
      .map((x) => ({ ...x, from: x.from < waitingEnds! ? waitingEnds! : x.from }))
      .filter((x) => x.from <= x.to);
    if (trimmed.length < periods.length || trimmed.some((x, i) => x.from !== periods[i]?.from)) {
      eligibility.warnings.push(
        `Okres wyczekiwania: zasiłek przysługuje dopiero po ${waiting} dniach nieprzerwanego ubezpieczenia, tj. od ${waitingEnds.split('-').reverse().join('.')}. Wcześniejsze dni zwolnienia nie są płatne – chyba że wliczasz poprzednie ubezpieczenie (przerwa do 30 dni) albo obowiązuje Cię wyjątek (absolwent zgłoszony w ciągu 90 dni od ukończenia szkoły, co najmniej 10 lat obowiązkowego ubezpieczenia).`,
      );
    }
    periods = trimmed;
  } else if (!input.insuranceSince && !input.waitingException) {
    eligibility.warnings.push(`Nie podano początku ubezpieczenia – przyjęto, że okres wyczekiwania (${waiting} dni) już minął.`);
  }
  if (periods.length === 0) {
    eligibility.status = 'not_eligible';
    eligibility.reasons.push('Całe zwolnienie przypada w okresie wyczekiwania – zasiłek chorobowy za nie nie przysługuje.');
    return { eligibility, base, waitingEnds, rehabilitation, maternityLevel };
  }

  const sickness = calculateSicknessPregnancy({
    benefitBase: base,
    insuranceStatus: 'insured',
    insuredType: input.employment === 'employment_contract' ? 'employee' : 'non_employee',
    // Brak roku urodzenia → zakładamy osobę przed 50. rokiem życia (limit 33 dni).
    birthYear: input.birthYear ?? 2000,
    employerDaysUsedBefore: input.employerDaysUsedBefore,
    periods,
  });
  eligibility.status = 'eligible';
  eligibility.reasons.push(
    input.employment === 'employment_contract'
      ? `Umowa o pracę: najpierw wynagrodzenie chorobowe od pracodawcy (do ${p.employerSickPayDays} dni w roku, po 50. roku życia ${p.employerSickPayDaysOver50}), potem zasiłek chorobowy.`
      : 'Ubezpieczenie dobrowolne: zasiłek chorobowy od pierwszego dnia niezdolności do pracy.',
  );
  if (periods.some((x) => x.pregnancy)) {
    eligibility.reasons.push(`Zwolnienie z kodem „B” (ciąża): ${Math.round(p.rates.full * 100)}% podstawy, okres zasiłkowy do ${p.pregnancySicknessPeriodDays} dni.`);
  } else {
    eligibility.warnings.push(`Zwolnienie bez kodu „B” liczone jest jak zwykła choroba: ${Math.round(p.rates.sicknessGeneral * 100)}% podstawy. Poproś lekarza o oznaczenie ciąży.`);
  }
  if (input.employment !== 'employment_contract') {
    eligibility.warnings.push('Na zwolnieniu powstrzymaj się od pracy zarobkowej (także na zleceniu lub w działalności) – inaczej ZUS odbierze zasiłek za cały okres zwolnienia.');
  }

  const pregnancyPeriods = sickness.benefitPeriods.filter((b) => b.pregnancy);
  const remainingDays = pregnancyPeriods.length ? Math.min(...pregnancyPeriods.map((b) => b.remainingDays)) : undefined;
  if (remainingDays === 0) {
    rehabilitation.applies = true;
    eligibility.warnings.push(`Wyczerpano ${p.pregnancySicknessPeriodDays} dni okresu zasiłkowego – sprawdź świadczenie rehabilitacyjne.`);
  }
  return { eligibility, base, waitingEnds, sickness, remainingDays, rehabilitation, maternityLevel };
}
