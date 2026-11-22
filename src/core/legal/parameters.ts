/**
 * Parametry prawne kalkulatorów (stawki, wymiary urlopów, kwoty roczne) – JEDNO źródło dla całej aplikacji.
 *
 * Kalkulatory odczytują je przy każdym wywołaniu (`legal()`), więc zmiana w panelu administracyjnym
 * (`/admin`) albo nowy zestaw z serwera działa od razu, bez nowej wersji aplikacji.
 * Kwoty pochodne (minimalna i maksymalna podstawa, próg zadłużenia) są wyliczane z parametrów, nie wpisywane.
 *
 * Źródło wartości domyślnych: ustawa zasiłkowa i Kodeks pracy w brzmieniu z 2026 r., załącznik do zadania ZUS.
 */
import { z } from 'zod';

const share = z.number().min(0).max(1);
const weeks = z.number().int().min(0).max(200);
const days = z.number().int().min(0).max(1000);

export const LegalParametersSchema = z.object({
  /** Identyfikator wersji zestawu, np. „2026.1”. */
  version: z.string().min(1).max(40),
  /** Okres, w którym zestaw obowiązuje (RRRR-MM-DD). */
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Podstawa prawna / uzasadnienie zmiany – widoczne w historii panelu. */
  note: z.string().max(500),
  rates: z.object({
    /** Macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski, chorobowy w ciąży. */
    full: share,
    /** Wariant „z góry” – wniosek o macierzyński + rodzicielski w terminie po porodzie. */
    upfront: share,
    /** Urlop rodzicielski (w tym 9 tygodni drugiego rodzica). */
    parental: share,
    /** Zasiłek chorobowy poza ciążą. */
    sicknessGeneral: share,
    /** Świadczenie rehabilitacyjne za okres niezdolności przypadającej w ciąży. */
    rehabilitationPregnancy: share,
  }),
  /** Składki społeczne finansowane przez ubezpieczonego, odliczane przy podstawie zasiłku (13,71%). */
  socialContributionRate: share,
  /** Minimalne wynagrodzenie (brutto) – minimalna podstawa i próg zadłużenia. */
  minimumWage: z.number().positive().max(100_000),
  /** Maksymalna miesięczna podstawa dobrowolnej składki chorobowej (nie-pracownicy). */
  maxContributionBaseNonEmployee: z.number().positive().max(1_000_000),
  /** Próg zadłużenia składkowego jako ułamek minimalnego wynagrodzenia (art. 2a ustawy zasiłkowej). */
  debtThresholdShare: share,
  /** Urlop macierzyński wg liczby dzieci z jednego porodu: 1, 2, 3, 4, 5+. */
  maternityWeeks: z.tuple([weeks, weeks, weeks, weeks, weeks]),
  /** Najwcześniejszy start macierzyńskiego przed przewidywaną datą porodu. */
  maternityBeforeBirthWeeks: weeks,
  /** Tygodnie, które matka musi wykorzystać, zanim ojciec przejmie resztę urlopu macierzyńskiego. */
  maternityMotherMinWeeks: weeks,
  /** To samo przy pobycie matki w szpitalu / niezdolności do samodzielnej egzystencji. */
  maternityMotherMinWeeksSpecial: weeks,
  parentalWeeks: z.object({ single: weeks, multiple: weeks, singleZaZyciem: weeks, multipleZaZyciem: weeks }),
  /** Nieprzenoszalna część rodzicielskiego dla każdego z rodziców. */
  parentalNonTransferableWeeks: weeks,
  parentalMaxParts: z.number().int().min(1).max(20),
  /** Rodzicielski można wykorzystać do końca roku kalendarzowego, w którym dziecko kończy tyle lat. */
  parentalChildAgeLimitYears: z.number().int().min(1).max(18),
  /** Maksymalny wymiar pracy łączonej z rodzicielskim (ułamek etatu). */
  parentalMaxWorkFraction: share,
  paternityWeeks: weeks,
  paternityMaxParts: z.number().int().min(1).max(10),
  paternityDeadlineMonths: z.number().int().min(1).max(60),
  /** Termin (dni po porodzie) na wniosek o wariant „z góry”. */
  upfrontApplicationDays: days,
  /** Strata dziecka: urlop macierzyński po porodzie i minimum od dnia zgonu. */
  lossMaternityWeeks: weeks,
  lossMinDaysAfterDeath: days,
  /** Przyjęcie dziecka na wychowanie. */
  adoptionMinWeeks: weeks,
  adoptionChildAgeLimitYears: z.number().int().min(1).max(18),
  fosterChildAgeLimitYears: z.number().int().min(1).max(18),
  fosterChildAgeLimitDeferredYears: z.number().int().min(1).max(18),
  /** Choroba w ciąży. */
  employerSickPayDays: days,
  employerSickPayDaysOver50: days,
  pregnancySicknessPeriodDays: days,
  generalSicknessPeriodDays: days,
  waitingPeriodMandatoryDays: days,
  waitingPeriodVoluntaryDays: days,
  /** Świadczenie rehabilitacyjne – maksymalny okres (miesiące). */
  rehabilitationMaxMonths: z.number().int().min(0).max(60),
  /** Liczba ubezpieczonych, powyżej której zasiłki wypłaca płatnik (art. 61 ustawy zasiłkowej). */
  payerThresholdInsured: z.number().int().min(0).max(100_000),
  /** Zasiłek pogrzebowy (zł). */
  funeralGrant: z.number().min(0).max(1_000_000),
});

export type LegalParameters = z.infer<typeof LegalParametersSchema>;

export const DEFAULT_LEGAL_PARAMETERS: LegalParameters = Object.freeze({
  version: '2026.1',
  effectiveFrom: '2026-01-01',
  effectiveTo: '2026-12-31',
  note: 'Ustawa zasiłkowa (Dz.U. 2026 poz. 854), Kodeks pracy (Dz.U. 2026 poz. 1245), załącznik do zadania ZUS.',
  rates: { full: 1, upfront: 0.815, parental: 0.7, sicknessGeneral: 0.8, rehabilitationPregnancy: 1 },
  socialContributionRate: 0.1371,
  minimumWage: 4806,
  maxContributionBaseNonEmployee: 23550,
  debtThresholdShare: 0.01,
  maternityWeeks: [20, 31, 33, 35, 37],
  maternityBeforeBirthWeeks: 6,
  maternityMotherMinWeeks: 14,
  maternityMotherMinWeeksSpecial: 8,
  parentalWeeks: { single: 41, multiple: 43, singleZaZyciem: 65, multipleZaZyciem: 67 },
  parentalNonTransferableWeeks: 9,
  parentalMaxParts: 5,
  parentalChildAgeLimitYears: 6,
  parentalMaxWorkFraction: 0.5,
  paternityWeeks: 2,
  paternityMaxParts: 2,
  paternityDeadlineMonths: 12,
  upfrontApplicationDays: 21,
  lossMaternityWeeks: 8,
  lossMinDaysAfterDeath: 7,
  adoptionMinWeeks: 9,
  adoptionChildAgeLimitYears: 14,
  fosterChildAgeLimitYears: 7,
  fosterChildAgeLimitDeferredYears: 10,
  employerSickPayDays: 33,
  employerSickPayDaysOver50: 14,
  pregnancySicknessPeriodDays: 270,
  generalSicknessPeriodDays: 182,
  waitingPeriodMandatoryDays: 30,
  waitingPeriodVoluntaryDays: 90,
  rehabilitationMaxMonths: 12,
  payerThresholdInsured: 20,
  funeralGrant: 7000,
}) as LegalParameters;

let current: LegalParameters = DEFAULT_LEGAL_PARAMETERS;
const listeners = new Set<() => void>();

/** Aktywny zestaw parametrów. */
export function legal(): LegalParameters {
  return current;
}

/** Ustawia aktywny zestaw (po walidacji). Zwraca listę błędów – pusta = zapisano. */
export function setLegalParameters(next: unknown): string[] {
  const parsed = LegalParametersSchema.safeParse(next);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join('.') || 'zestaw'}: ${i.message}`);
  const issues = consistencyIssues(parsed.data);
  if (issues.length) return issues;
  current = parsed.data;
  listeners.forEach((l) => l());
  return [];
}

export function resetLegalParameters(): void {
  current = DEFAULT_LEGAL_PARAMETERS;
  listeners.forEach((l) => l());
}

export function subscribeLegalParameters(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reguły spójności, których schemat nie wyrazi (np. pula musi być większa niż część nieprzenoszalna). */
export function consistencyIssues(p: LegalParameters): string[] {
  const issues: string[] = [];
  if (p.effectiveTo < p.effectiveFrom) issues.push('effectiveTo: koniec obowiązywania przed początkiem.');
  if (p.maternityWeeks.some((w, i) => i > 0 && w < p.maternityWeeks[i - 1])) issues.push('maternityWeeks: wymiar nie może maleć wraz z liczbą dzieci.');
  if (p.parentalWeeks.single <= p.parentalNonTransferableWeeks) issues.push('parentalWeeks.single: pula musi być większa niż część nieprzenoszalna.');
  if (p.maternityMotherMinWeeks > p.maternityWeeks[0]) issues.push('maternityMotherMinWeeks: dłuższe niż cały urlop macierzyński.');
  if (p.lossMaternityWeeks > p.maternityWeeks[0]) issues.push('lossMaternityWeeks: dłuższe niż urlop macierzyński.');
  return issues;
}

// --- Wartości pochodne ---

const toGrosze = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Kwota po odjęciu składek społecznych ubezpieczonego – liczone w punktach bazowych, bez błędów float. */
export function netOfContributions(gross: number, p: LegalParameters = current): number {
  const factorBp = 10_000 - Math.round(p.socialContributionRate * 10_000);
  return Math.round((gross * factorBp) / 100) / 100;
}

/** Minimalna podstawa wymiaru (pełny etat) = minimalne wynagrodzenie po odliczeniu składek. */
export function minBenefitBase(p: LegalParameters = current): number {
  return netOfContributions(p.minimumWage, p);
}

/** Maksymalna podstawa wymiaru zasiłku dla nie-pracowników. */
export function maxBenefitBaseNonEmployee(p: LegalParameters = current): number {
  return netOfContributions(p.maxContributionBaseNonEmployee, p);
}

/** Próg zadłużenia, powyżej którego zasiłek nie jest wypłacany do czasu spłaty (art. 2a). */
export function debtThreshold(p: LegalParameters = current): number {
  return toGrosze(p.minimumWage * p.debtThresholdShare);
}

/** Wymiar rodzicielskiego wg liczby dzieci i zaświadczenia „Za życiem”. */
export function parentalPoolWeeks(childrenCount: number, zaZyciem: boolean, p: LegalParameters = current): number {
  const multiple = childrenCount > 1;
  if (zaZyciem) return multiple ? p.parentalWeeks.multipleZaZyciem : p.parentalWeeks.singleZaZyciem;
  return multiple ? p.parentalWeeks.multiple : p.parentalWeeks.single;
}

/** Wymiar macierzyńskiego wg liczby dzieci z jednego porodu. */
export function maternityWeeksFor(childrenCount: number, p: LegalParameters = current): number {
  return p.maternityWeeks[Math.min(Math.max(childrenCount, 1), 5) - 1];
}
