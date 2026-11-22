/** Walidacja numeru PESEL: suma kontrolna, zgodność z datą urodzenia i płcią. */

const WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

export function isValidPesel(pesel: string): boolean {
  if (!/^\d{11}$/.test(pesel)) return false;
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(pesel[i]), 0);
  return (10 - (sum % 10)) % 10 === Number(pesel[10]);
}

/** Data urodzenia (RRRR-MM-DD) zakodowana w PESEL – stulecie wynika z przesunięcia miesiąca. */
export function peselBirthDate(pesel: string): string | null {
  if (!/^\d{11}$/.test(pesel)) return null;
  const yy = Number(pesel.slice(0, 2));
  const mm = Number(pesel.slice(2, 4));
  const dd = pesel.slice(4, 6);
  const centuries: [number, number][] = [
    [80, 1800],
    [0, 1900],
    [20, 2000],
    [40, 2100],
    [60, 2200],
  ];
  const match = centuries.find(([offset]) => mm > offset && mm <= offset + 12);
  if (!match) return null;
  const [offset, century] = match;
  return `${century + yy}-${String(mm - offset).padStart(2, '0')}-${dd}`;
}

/** Przedostatnia cyfra: parzysta = kobieta, nieparzysta = mężczyzna. */
export function peselSex(pesel: string): 'female' | 'male' | null {
  if (!/^\d{11}$/.test(pesel)) return null;
  return Number(pesel[9]) % 2 === 0 ? 'female' : 'male';
}

/** Czy PESEL jest poprawny i zgodny z datą urodzenia oraz płcią (gdy podana). */
export function peselMatches(pesel: string, birthDate: string, gender?: string): boolean {
  if (!isValidPesel(pesel) || peselBirthDate(pesel) !== birthDate) return false;
  return gender === 'female' || gender === 'male' ? peselSex(pesel) === gender : true;
}
