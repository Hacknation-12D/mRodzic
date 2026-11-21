/** Małe litery, bez polskich znaków i interpunkcji. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Długość najdłuższego wspólnego podciągu (litery w tej samej kolejności, niekoniecznie obok siebie). */
export function lcsLength(a: string, b: string): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[b.length];
}

export const MATCH_THRESHOLD = 0.7;
export const MIN_INPUT_LENGTH = 2;

/** Odsetek liter wpisanego tekstu znajdujących się w kandydacie w dobrej kolejności (0–1). */
export function matchScore(input: string, candidate: string): number {
  const a = norm(input);
  const b = norm(candidate);
  if (a.length < MIN_INPUT_LENGTH || !b) return 0;
  const score = lcsLength(a, b) / a.length;
  // Bonus za zgodny początek – wpis zwykle jest przedrostkiem pytania.
  return b.startsWith(a) ? score + 1 : score;
}

/** Najlepiej pasujące wpisy (≥ 70% zgodności), od najlepszego. */
export function rankMatches<T extends { question: string }>(input: string, entries: T[], limit = 3): T[] {
  return entries
    .map((e) => ({ e, s: matchScore(input, e.question) }))
    .filter((x) => x.s >= MATCH_THRESHOLD)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.e);
}
