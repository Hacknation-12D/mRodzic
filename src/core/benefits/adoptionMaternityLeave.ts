/**
 * Kalkulator: ZASIŁEK MACIERZYŃSKI ZA OKRES URLOPU NA WARUNKACH URLOPU MACIERZYŃSKIEGO
 * (przyjęcie dziecka na wychowanie – przysposobienie, rodzina zastępcza).
 *
 *  - Wymiar jak przy urodzeniu: 20 / 31 / 33 / 35 / 37 tygodni wg liczby dzieci przyjętych jednocześnie.
 *  - Urlop trwa najdłużej do dnia poprzedzającego 14. urodziny dziecka (art. 183 KP);
 *    przy kilku dzieciach decyduje najmłodsze. Dzieci, które ukończyły 14 lat przed startem, nie są liczone.
 *  - Nie może trwać krócej niż 9 tygodni (nawet jeśli limit wieku wypada wcześniej).
 *  - Wysokość: 100% podstawy.
 */
import { addDays, addYears, max as maxDate } from 'date-fns';

import { BENEFIT_RATES, BenefitInputError, daysInclusive, endOfPeriod, parseIsoDate, roundMoney, toIsoDate } from './common';
import { maternityLeaveWeeks } from './maternityLeave';

export const ADOPTION_LEAVE_MIN_WEEKS = 9;
export const ADOPTION_CHILD_AGE_LIMIT_YEARS = 14;

export type AdoptionMaternityLeaveInput = {
  /** Pierwszy dzień urlopu (RRRR-MM-DD). */
  startDate: string;
  /** Daty urodzenia dzieci przyjętych jednocześnie (RRRR-MM-DD). */
  childBirthDates: string[];
};

export type AdoptionMaternityLeaveResult = {
  /** Liczba dzieci, które nie ukończyły 14 lat w dniu rozpoczęcia urlopu. */
  eligibleChildrenCount: number;
  /** Wymiar z tabeli (tygodnie). */
  tableWeeks: number;
  days: number;
  /** Tygodnie (może być ułamkowa, gdy urlop skrócono do 14. urodzin). */
  weeks: number;
  startDate: string;
  endDate: string;
  nextDayAfter: string;
  /** Ostatni dzień, do którego urlop może trwać ze względu na wiek najmłodszego dziecka. */
  ageLimitDate: string;
  limitedByChildAge: boolean;
  minimumApplied: boolean;
  benefitRate: number;
  notes: string[];
};

export function calculateAdoptionMaternityLeave(input: AdoptionMaternityLeaveInput): AdoptionMaternityLeaveResult {
  const start = parseIsoDate(input.startDate, 'startDate');
  if (!Array.isArray(input.childBirthDates) || input.childBirthDates.length === 0) {
    throw new BenefitInputError('Podaj datę urodzenia co najmniej jednego dziecka.', 'childBirthDates');
  }
  const births = input.childBirthDates.map((d, i) => parseIsoDate(d, `childBirthDates[${i}]`));
  births.forEach((b, i) => {
    if (b > start) throw new BenefitInputError(`Dziecko ${i + 1} ma datę urodzenia po starcie urlopu.`, `childBirthDates[${i}]`);
  });

  const notes: string[] = [];
  const eligible = births.filter((b) => addYears(b, ADOPTION_CHILD_AGE_LIMIT_YEARS) > start);
  if (eligible.length === 0) {
    throw new BenefitInputError('Żadne dziecko nie spełnia warunku wieku (do ukończenia 14 lat).', 'childBirthDates');
  }
  if (eligible.length < births.length) {
    notes.push(`${births.length - eligible.length} dziecko/dzieci ukończyło 14 lat przed startem urlopu – nie są liczone.`);
  }

  const tableWeeks = maternityLeaveWeeks(eligible.length);
  const youngest = maxDate(eligible);
  const ageLimitDate = addDays(addYears(youngest, ADOPTION_CHILD_AGE_LIMIT_YEARS), -1);
  const daysUntilLimit = daysInclusive(start, ageLimitDate);
  const minDays = ADOPTION_LEAVE_MIN_WEEKS * 7;

  let days = tableWeeks * 7;
  const limitedByChildAge = daysUntilLimit < days;
  if (limitedByChildAge) days = daysUntilLimit;
  const minimumApplied = days < minDays;
  if (minimumApplied) days = minDays;

  if (limitedByChildAge) notes.push('Urlop skrócony – kończy się dzień przed 14. urodzinami najmłodszego dziecka.');
  if (minimumApplied) notes.push('Zastosowano minimalny wymiar 9 tygodni.');

  const end = endOfPeriod(start, days);
  return {
    eligibleChildrenCount: eligible.length,
    tableWeeks,
    days,
    weeks: roundMoney(days / 7),
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    nextDayAfter: toIsoDate(addDays(end, 1)),
    ageLimitDate: toIsoDate(ageLimitDate),
    limitedByChildAge,
    minimumApplied,
    benefitRate: BENEFIT_RATES.full,
    notes,
  };
}
