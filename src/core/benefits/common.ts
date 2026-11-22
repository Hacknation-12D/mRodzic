/**
 * Wspólne stałe i narzędzia kalkulatorów zasiłków (stan prawny 2026).
 * Źródło: „Załącznik do Template Wyzwania HackNation 2026” + ustawa zasiłkowa / Kodeks pracy.
 */
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

import { DEFAULT_LEGAL_PARAMETERS as D, legal, maxBenefitBaseNonEmployee, minBenefitBase, netOfContributions } from '../legal/parameters';

export { legal } from '../legal/parameters';

/*
 * Wartości DOMYŚLNE (zestaw 2026). Kalkulatory czytają aktywny zestaw przez `legal()` – te stałe
 * służą do dokumentacji i testów. Zmiana parametrów: panel administracyjny albo src/core/legal/parameters.ts.
 */

/** Składki społeczne finansowane przez pracownika – odejmowane od przychodu przy ustalaniu podstawy. */
export const SOCIAL_CONTRIBUTION_RATE = D.socialContributionRate;

/** Płaca minimalna 2026 (brutto). */
export const MINIMUM_WAGE_2026 = D.minimumWage;

/** Minimalna podstawa wymiaru zasiłku 2026 dla pełnego etatu: 4806 zł − 13,71%. */
export const MIN_BENEFIT_BASE_2026 = minBenefitBase(D);

/** Maksymalna miesięczna podstawa wymiaru dobrowolnej składki chorobowej 2026 (nie-pracownicy). */
export const MAX_CONTRIBUTION_BASE_NON_EMPLOYEE_2026 = D.maxContributionBaseNonEmployee;

/** Limit podstawy wymiaru zasiłku 2026 dla nie-pracowników: 23 550 zł − 13,71%. */
export const MAX_BENEFIT_BASE_NON_EMPLOYEE_2026 = maxBenefitBaseNonEmployee(D);

/** Stawka dzienna zasiłku = 1/30 miesięcznej podstawy. */
export const DAYS_PER_BENEFIT_MONTH = 30;

/** Wysokości świadczeń jako ułamek podstawy wymiaru. */
export const BENEFIT_RATES = D.rates;

/** Aktywne stawki (z panelu administracyjnego). */
export function benefitRates() {
  return legal().rates;
}

/** Błąd nieprawidłowych danych wejściowych kalkulatora. `field` wskazuje pole, którego dotyczy. */
export class BenefitInputError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'BenefitInputError';
    this.field = field;
  }
}

/** Zaokrąglenie do pełnych groszy. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Kwota po odjęciu składek społecznych pracownika (13,71%), zaokrąglona do groszy. */
export function afterSocialContributions(gross: number): number {
  return netOfContributions(gross);
}

/** Dzienna kwota świadczenia: podstawa × stawka / 30, zaokrąglona do groszy. */
export function dailyBenefitAmount(monthlyBase: number, rate: number): number {
  return roundMoney((monthlyBase * rate) / DAYS_PER_BENEFIT_MONTH);
}

// --- Daty (ISO YYYY-MM-DD, strefa lokalna) ---

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string, field: string): Date {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new BenefitInputError(`Pole „${field}” musi być datą w formacie RRRR-MM-DD (otrzymano: ${String(value)}).`, field);
  }
  const date = parseISO(value);
  if (!isValid(date)) throw new BenefitInputError(`Pole „${field}” zawiera nieistniejącą datę: ${value}.`, field);
  return date;
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Liczba dni kalendarzowych od `from` do `to` włącznie. */
export function daysInclusive(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1;
}

/** Ostatni dzień okresu `days` dni zaczynającego się `start` (włącznie). */
export function endOfPeriod(start: Date, days: number): Date {
  return addDays(start, days - 1);
}

// --- Walidacja liczb ---

export function assertNonNegative(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BenefitInputError(`Pole „${field}” musi być liczbą ≥ 0 (otrzymano: ${String(value)}).`, field);
  }
}

export function assertPositive(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BenefitInputError(`Pole „${field}” musi być liczbą > 0 (otrzymano: ${String(value)}).`, field);
  }
}

export function assertIntInRange(value: number, min: number, max: number, field: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BenefitInputError(`Pole „${field}” musi być liczbą całkowitą z zakresu ${min}–${max} (otrzymano: ${String(value)}).`, field);
  }
}
