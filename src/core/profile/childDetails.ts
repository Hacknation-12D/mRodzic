import { differenceInCalendarDays, differenceInMonths, differenceInWeeks, differenceInYears, addMonths, parseISO } from 'date-fns';

import { pl } from '../../shared/i18n/pl';
import { formatShortDate } from '../../shared/lib/date';
import type { Child } from '../types';

/** „6 tygodni i 2 dni” (do 3 mies.), „5 miesięcy i 3 dni”, „1 rok i 3 miesiące”. Tylko dla urodzonych. */
export function exactAgeLabel(birthDate: string, today: Date): string {
  const birth = parseISO(birthDate);
  const totalDays = differenceInCalendarDays(today, birth);
  if (totalDays < 0) return '';
  if (totalDays < 1) return pl.plural.days(0);
  const months = differenceInMonths(today, birth);
  if (months < 3) {
    const weeks = differenceInWeeks(today, birth);
    const days = totalDays - weeks * 7;
    return pl.ageExact([weeks > 0 ? pl.plural.weeks(weeks) : '', days > 0 ? pl.plural.days(days) : ''].filter(Boolean));
  }
  const years = differenceInYears(today, birth);
  if (years >= 1) {
    const m = months - years * 12;
    return pl.ageExact([pl.plural.years(years), m > 0 ? pl.plural.months(m) : ''].filter(Boolean));
  }
  const days = differenceInCalendarDays(today, addMonths(birth, months));
  return pl.ageExact([pl.plural.months(months), days > 0 ? pl.plural.days(days) : ''].filter(Boolean));
}

/** „22031••••••” → pokazuje 6 pierwszych cyfr (data urodzenia), reszta zamaskowana. */
export function maskPesel(pesel: string): string {
  return `${pesel.slice(0, 6)}${'•'.repeat(5)}`;
}

/** Pierwsze szczepienie z terminem dziś lub później. */
export function nextVaccination(child: Pick<Child, 'vaccinations'>, today: Date): { name: string; dueDate: Date; daysLeft: number } | null {
  const upcoming = (child.vaccinations ?? [])
    .map((v) => ({ name: v.name, dueDate: parseISO(v.dueDate) }))
    .map((v) => ({ ...v, daysLeft: differenceInCalendarDays(v.dueDate, today) }))
    .filter((v) => v.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return upcoming[0] ?? null;
}

export function vaccinationLabel(next: { name: string; dueDate: Date; daysLeft: number }): string {
  const when = next.daysLeft === 0 ? pl.deadline.today : next.daysLeft === 1 ? pl.deadline.tomorrow : next.daysLeft <= 30 ? pl.deadline.inDays(next.daysLeft) : formatShortDate(next.dueDate);
  return `${next.name} – ${when}`;
}
