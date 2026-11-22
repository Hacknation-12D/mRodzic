/** „1 234,56 zł” (zawsze dwa miejsca po przecinku). */
export function formatMoney(value: number, fractionDigits = 2): string {
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} zł`;
}

/** „81,5%” z ułamka (0.815). */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`;
}

/** Liczba z pola tekstowego („7 200,50”) → number; puste/niepoprawne → NaN. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/\s|zł/g, '').replace(',', '.');
  return cleaned ? Number(cleaned) : Number.NaN;
}
