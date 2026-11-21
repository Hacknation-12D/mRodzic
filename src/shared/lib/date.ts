import { format, isValid, parse, parseISO } from 'date-fns';
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

/** „15 maja” */
export function formatDayMonth(date: Date): string {
  return format(date, 'd MMMM', { locale: pl });
}

/** „15 maja 2027” */
export function formatLongDate(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: pl });
}

/** „listopad 2026” (mianownik) */
export function formatMonthYear(date: Date): string {
  return format(date, 'LLLL yyyy', { locale: pl });
}

/** Krótkie nazwy dni tygodnia od poniedziałku: „pn”, „wt”… */
export function weekdayShortNames(): string[] {
  const monday = new Date(2024, 0, 1); // 1.01.2024 to poniedziałek
  return Array.from({ length: 7 }, (_, i) =>
    format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), 'EEEEEE', { locale: pl }),
  );
}

/** Parsuje „DD.MM.RRRR” → ISO albo null. */
export function parsePolishDate(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) return null;
  const d = parse(trimmed, 'd.M.yyyy', new Date(2000, 0, 1));
  return isValid(d) ? toISODate(d) : null;
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
