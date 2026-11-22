import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { Parent, Profile } from '../types';
import { roundMoney, toIsoDate } from './common';
import { PARENTAL_NON_TRANSFERABLE_WEEKS } from './parentalLeave';
import { calculateBenefitScenario, type BenefitScenarioInput, type BenefitScenarioKind, type EligibilityStatus, type PartnerInput } from './scenario';

/** Przeciętne wynagrodzenie brutto z historii PUE (12 mies.), a bez niej – bieżące albo podstawa składek. */
function averageGross(parent: Parent | undefined): number {
  const work = parent?.work;
  const earnings = work?.earnings ?? [];
  return earnings.length
    ? roundMoney(earnings.reduce((acc, e) => acc + e.gross, 0) / earnings.length)
    : (work?.monthlyGross ?? work?.zus?.contributionBase ?? 0);
}

/** Drugi rodzic z profilu – jego forma zatrudnienia, ubezpieczenie i wynagrodzenie. */
export function partnerDefaults(profile: Profile | null): PartnerInput | undefined {
  const partner = profile?.partner;
  if (!partner) return undefined;
  const employment = partner.employment ?? 'employment_contract';
  const insured = partner.work?.zus?.sickness.insured;
  return {
    employment,
    sicknessInsurance: insured === true ? 'yes' : insured === false ? 'no' : employment === 'employment_contract' ? 'yes' : 'unknown',
    averageMonthlyGross: averageGross(partner),
  };
}

/** Dane wejściowe kalkulatora uzupełnione z profilu (PUE/eZUS, dzieci). Użytkownik może je potem zmienić. */
export function scenarioDefaultsFromProfile(profile: Profile | null, today: Date): BenefitScenarioInput {
  const me = profile?.me;
  const work = me?.work;
  const employment = me?.employment ?? 'employment_contract';

  const sickness = work?.zus?.sickness.insured;
  const sicknessInsurance =
    sickness === true ? 'yes' : sickness === false ? 'no' : employment === 'employment_contract' ? 'yes' : 'unknown';

  const averageMonthlyGross = averageGross(me);

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

  const asOf = toIsoDate(today);
  // Wariant 81,5% wymaga wniosku najpóźniej 21 dni po porodzie – po tym terminie domyślnie 100% + 70%.
  const upfrontApplication = kind === 'birth' ? differenceInCalendarDays(today, parseISO(eventDate)) <= 21 : true;
  const z = work?.zus?.sickness;
  const insuranceEnded = z && !z.insured && z.until ? { until: z.until, reason: z.endReason ?? 'other' } : undefined;

  return {
    kind,
    employment,
    sicknessInsurance,
    averageMonthlyGross,
    eventDate,
    childrenCount: Math.max(1, childrenCount),
    zaZyciem: false,
    partnerParentalWeeks: profile?.partner ? PARENTAL_NON_TRANSFERABLE_WEEKS : 0,
    upfrontApplication,
    benefitPayer: work?.benefitPayer,
    arrearsAmount: work?.zus?.arrears.amount,
    loss: child?.loss,
    insuranceEnded,
    asOf,
    partner: partnerDefaults(profile),
    // Umowa terminowa z PUE (art. 177 § 3 KP) i początek ubezpieczenia (ryzyko pozorności) – do oceny ryzyk.
    contractEndDate: (() => {
      const last = work?.zus?.periods.at(-1);
      return last?.fixedTerm && last.kind === 'employment_contract' ? last.to : undefined;
    })(),
    insuranceStartDate: z?.since,
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
