import { parse } from 'csv-parse/sync';

/** Kolumny liczbowe (poza JSON-em). */
const NUMBER_COLUMNS = new Set(['priority']);
/** Kolumny boolean. */
const BOOLEAN_COLUMNS = new Set(['needsReview']);

export type CsvCellError = { row: number; column: string; message: string };

/**
 * CSV → rekordy. Nagłówki = nazwy pól (camelCase). Pola złożone (timing, requirements, links…)
 * jako JSON w komórce. Pusta komórka = brak pola.
 */
export function parseCsvRecords(text: string): { records: Record<string, unknown>[]; errors: CsvCellError[] } {
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[];
  const errors: CsvCellError[] = [];
  const records = rows.map((row, index) => {
    const out: Record<string, unknown> = {};
    for (const [column, raw] of Object.entries(row)) {
      const cell = raw.trim();
      if (cell === '') continue;
      if (cell.startsWith('{') || cell.startsWith('[')) {
        try {
          out[column] = JSON.parse(cell);
        } catch (e) {
          errors.push({ row: index + 2, column, message: `Niepoprawny JSON: ${e instanceof Error ? e.message : String(e)}` });
        }
      } else if (NUMBER_COLUMNS.has(column)) {
        const n = Number(cell);
        if (Number.isFinite(n)) out[column] = n;
        else errors.push({ row: index + 2, column, message: `Oczekiwano liczby, jest "${cell}"` });
      } else if (BOOLEAN_COLUMNS.has(column)) {
        if (cell === 'true' || cell === 'false') out[column] = cell === 'true';
        else errors.push({ row: index + 2, column, message: `Oczekiwano true/false, jest "${cell}"` });
      } else {
        out[column] = cell;
      }
    }
    return out;
  });
  return { records, errors };
}
