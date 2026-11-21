/** Łączy klasy Tailwind/DaisyUI; pomija wartości puste. Nie rozwiązuje konfliktów – nie podawaj dwóch klas tej samej właściwości. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
