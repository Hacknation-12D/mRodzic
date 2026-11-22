import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { Profile } from '../types';
import { roundMoney, toIsoDate } from './common';
import { PARENTAL_NON_TRANSFERABLE_WEEKS } from './parentalLeave';
import { calculateBenefitScenario, type BenefitScenarioInput, type BenefitScenarioKind, type EligibilityStatus } from './scenario';

/** Dane wejściowe kalkulatora uzupełnione z profilu (PUE/eZUS, dzieci). Użytkownik może je potem zmienić. */
export function scenarioDefaultsFromProfile(profile: Profile | null, today: Date): BenefitScenarioInput {
  const me = profile?.me;
  const work = me?.work;
  const employment = me?.employment ?? 'employment_contract';

  const sickness = work?.zus?.sickness.insured;
  const sicknessInsurance =
    sickness === true ? 'yes' : sickness === false ? 'no' : employment === 'employment_contract' ? 'yes' : 'unknown';

  const earnings = work?.earnings ?? [];
  const averageMonthlyGross = earnings.length
    ? roundMoney(earnings.reduce((acc, e) => acc + e.gross, 0) / earnings.length)
    : (work?.monthlyGross ?? work?.zus?.contributionBase ?? 0);

  // Dziecko, którego dotyczy kalkulacja: w drodze → ciąża; urodzone w ciągu roku → narodziny.
  const kids = profile?.children ?? [];
  const expected = kids.find((c) => c.status === 'expected' && c.dueDate);
  const recent = kids
    .filter((c) => c.status === 'born' && c.birthDate && differenceInCalendarDays(today, parseISO(c.birthDate)) <= 365)
    .sort((a, b) => (b.birthDate ?? '').localeCompare(a.birthDate ?? ''))[0];
  const child = recent ?? expected;
  const kind = child?.status === 'expected' ? 'pregnancy' : 'birth';
  const eventDate = (child?.status === 'expected' ? child.dueDate : child?.birthDate) ?? toIsoDate(today);
  const childrenCount = child?.multipleBirthGroupId
    ? Math.min(5, kids.filter((c) => c.multipleBirthGroupId === child.multipleBirthGroupId).length)
    : 1;

  return {
    kind,
    employment,
    sicknessInsurance,
    averageMonthlyGross,
    eventDate,
    childrenCount: Math.max(1, childrenCount),
    zaZyciem: false,
    partnerParentalWeeks: profile?.partner ? PARENTAL_NON_TRANSFERABLE_WEEKS : 0,
    upfrontApplication: true,
    benefitPayer: work?.benefitPayer,
    arrearsAmount: work?.zus?.arrears.amount,
    loss: child?.loss,
  };
}

export type ProfileBenefitEstimate = {
  kind: BenefitScenarioKind;
  status: EligibilityStatus;
  /** Kwota miesięczna za pierwszy okres (macierzyński) – tylko przy ustalonym prawie. */
  monthly?: number;
  /** Łączna długość urlopów osoby liczącej (tygodnie). */
  weeks: number;
  /** Koniec ostatniego urlopu w planie. */
  endDate?: string;
};

/** Szybki podgląd dla karty na stronie głównej. Brak danych do policzenia → null. */
export function estimateBenefitFromProfile(profile: Profile | null, today: Date): ProfileBenefitEstimate | null {
  try {
    const input = scenarioDefaultsFromProfile(profile, today);
    const r = calculateBenefitScenario(input);
    const mine = r.periods.filter((p) => p.who === 'me');
    return {
      kind: input.kind,
      status: r.eligibility.status,
      monthly: r.amounts?.segments[0]?.monthlyAmount,
      weeks: mine.reduce((acc, p) => acc + p.weeks, 0),
      endDate: mine.at(-1)?.endDate,
    };
  } catch {
    return null;
  }
}
