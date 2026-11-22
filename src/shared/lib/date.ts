import { format, isValid, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

/** Format ISO daty bez czasu: YYYY-MM-DD (strefa lokalna). */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

/** „12.05.2027” */
export function formatShortDate(date: Date): string {
  return format(date, 'dd.MM.yyyy');
}

/** „15 maja 2027” */
export function formatLongDate(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: pl });
}

/** ISO → „DD.MM.RRRR” (dla pól formularza). */
export function isoToPolishDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd.MM.yyyy') : '';
}

export function formatTime(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd.MM.yyyy HH:mm') : '';
}
