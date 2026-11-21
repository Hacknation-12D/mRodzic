import type { Child, ChildColorKey, MarkKey } from '../types';

export const CHILD_COLOR_KEYS: readonly ChildColorKey[] = ['coral', 'teal', 'violet', 'amber', 'sky', 'olive'];

/**
 * Paleta dzieci. Każdy kolor ma kontrast ≥ 3:1 względem tła aplikacji
 * (jasne #F7F4EF, ciemne #141311) – sprawdzane w childColors.test.ts.
 */
export const CHILD_PALETTE: Record<ChildColorKey, { light: string; dark: string }> = {
  coral: { light: '#C2410C', dark: '#FB923C' },
  teal: { light: '#0F766E', dark: '#2DD4BF' },
  violet: { light: '#6D28D9', dark: '#C4B5FD' },
  amber: { light: '#A16207', dark: '#FACC15' },
  sky: { light: '#0369A1', dark: '#7DD3FC' },
  olive: { light: '#4D7C0F', dark: '#A3E635' },
};

/** Kolor oznaczeń „cała rodzina” (dokumenty household). */
export const FAMILY_COLOR = { light: '#57534E', dark: '#D6D3D1' };

export function getChildColor(key: MarkKey, isDark: boolean): string {
  if (key === 'family') return isDark ? FAMILY_COLOR.dark : FAMILY_COLOR.light;
  const entry = CHILD_PALETTE[key];
  return isDark ? entry.dark : entry.light;
}

/** Pierwszy wolny kolor; gdy wszystkie zajęte – rotacja. */
export function nextChildColor(children: Pick<Child, 'colorKey'>[]): ChildColorKey {
  const used = new Set(children.map((c) => c.colorKey));
  const free = CHILD_COLOR_KEYS.find((k) => !used.has(k));
  return free ?? CHILD_COLOR_KEYS[children.length % CHILD_COLOR_KEYS.length];
}

// --- kontrast WCAG (do testów i ewentualnej walidacji) ---
function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
