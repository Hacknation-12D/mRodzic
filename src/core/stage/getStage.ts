import { addDays, differenceInCalendarDays, differenceInMonths, parseISO, startOfDay } from 'date-fns';

import type { Child, Stage } from '../types';

/** Data-kotwica: birthDate ma pierwszeństwo przed dueDate. */
export function anchorDate(child: Pick<Child, 'birthDate' | 'dueDate'>): Date {
  const iso = child.birthDate ?? child.dueDate;
  if (!iso) throw new Error('Child without birthDate/dueDate');
  return startOfDay(parseISO(iso));
}

/** Dni względem porodu: ujemne = ciąża, 0 = dzień porodu, dodatnie = wiek dziecka. */
export function dayOffset(child: Pick<Child, 'birthDate' | 'dueDate'>, date: Date): number {
  return differenceInCalendarDays(startOfDay(date), anchorDate(child));
}

export function offsetToDate(child: Pick<Child, 'birthDate' | 'dueDate'>, offsetDays: number): Date {
  return addDays(anchorDate(child), offsetDays);
}

/** Pełne miesiące życia (tylko dla urodzonych; dla oczekiwanych undefined). */
export function ageInMonths(child: Child, date: Date): number | undefined {
  if (child.status !== 'born' || !child.birthDate) return undefined;
  const months = differenceInMonths(startOfDay(date), anchorDate(child));
  return months < 0 ? undefined : months;
}

function pregnancyStage(offset: number, overdue: boolean): Stage {
  const week = Math.max(1, 40 + Math.floor(offset / 7));
  const trimester: 1 | 2 | 3 = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return { kind: 'pregnancy', week, trimester, overdue };
}

export function getStage(child: Child, date: Date): Stage {
  const offset = dayOffset(child, date);
  if (child.status === 'expected') {
    // dueDate w przeszłości bez birthDate → nadal ciąża, „po terminie”
    return pregnancyStage(offset, offset > 0);
  }
  if (offset < 0) return pregnancyStage(offset, false); // „dzisiaj” cofnięte przed urodzenie (demo)

  const months = differenceInMonths(startOfDay(date), anchorDate(child));
  if (months < 2) return { kind: 'newborn', weeks: Math.floor(offset / 7) };
  if (months < 12) return { kind: 'infant', months };
  if (months < 36) return { kind: 'toddler', months };
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years < 7) return { kind: 'preschool', years, months: rest };
  return { kind: 'school', years, months: rest };
}
