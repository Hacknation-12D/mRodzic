/**
 * Kalkulator: PLAN URLOPU RODZICIELSKIEGO DLA OBOJGA RODZICÓW (zadanie ZUS, pkt 3 c–d).
 *
 *  - wspólna pula 41/43 tyg. (65/67 z „Za życiem”), z której każdy rodzic ma wyłączne 9 tygodni,
 *  - części jednoczesne i naprzemienne, łącznie maks. 5 części,
 *  - łączenie z pracą do ½ etatu: urlop wydłuża się proporcjonalnie (art. 182¹e KP),
 *    zasiłek za dzień pracy zmniejsza się o wymiar pracy (zasiłek za pozostałą część etatu),
 *  - każdy rodzic ma własną podstawę i własne prawo do zasiłku,
 *  - urlop nie może zacząć się przed końcem macierzyńskiego ani skończyć po roku, w którym dziecko kończy 6 lat.
 * Parametry (pula, stawka 70%, limity) pochodzą z aktywnego zestawu `legal()`.
 */
import { z } from 'zod';

import { addDateDays, daysBetween, legalRules } from '../applications/engine';
import { DateSchema } from '../applications/model';
import { legal } from '../legal/parameters';

const Segment = z.object({
  id: z.string(),
  parent: z.enum(['me', 'partner']),
  start: DateSchema,
  weeks: z.number().int().min(1).max(200),
  workFraction: z.number().min(0).max(1),
  workDuringExtension: z.boolean(),
  reserved: z.boolean(),
});
const Parent = z.object({ baseCents: z.number().int().min(0), eligible: z.boolean(), label: z.string().optional() });
export const FamilyLeavePlanSchema = z.object({
  childBirthDate: DateSchema,
  /** Pierwszy dzień po urlopie macierzyńskim – wcześniej rodzicielski nie może się zacząć. */
  earliestStart: DateSchema.optional(),
  childrenCount: z.number().int().min(1).max(5),
  zaZyciem: z.boolean(),
  parents: z.object({ me: Parent, partner: Parent }),
  segments: z.array(Segment).max(10),
});
export type FamilyLeavePlan = z.infer<typeof FamilyLeavePlanSchema>;
export type FamilyLeaveSegment = FamilyLeavePlan['segments'][number];

export type FamilyLeavePeriod = FamilyLeaveSegment & {
  end: string;
  returnDate: string;
  days: number;
  extensionDays: number;
  dailyCents: number;
  totalCents: number;
};

export type FamilyLeavePlanResult = {
  valid: boolean;
  issues: string[];
  periods: FamilyLeavePeriod[];
  totalCents: number;
  totalByParent: { me: number; partner: number };
  poolWeeks: number;
  reservedWeeks: number;
  usedWeeks: number;
  unusedWeeks: number;
  simultaneousDays: number;
  /** Ostatni dzień, w którym rodzicielski może trwać. */
  lastDay: string;
  rulesVersion: string;
};

export function calculateFamilyLeavePlan(input: FamilyLeavePlan): FamilyLeavePlanResult {
  const rules = legalRules();
  const p0 = legal();
  const empty = (issues: string[], pool = 0): FamilyLeavePlanResult => ({
    valid: false, issues, periods: [], totalCents: 0, totalByParent: { me: 0, partner: 0 }, poolWeeks: pool, reservedWeeks: rules.reservedWeeks,
    usedWeeks: 0, unusedWeeks: pool, simultaneousDays: 0, lastDay: '', rulesVersion: rules.version,
  });
  const parsed = FamilyLeavePlanSchema.safeParse(input);
  if (!parsed.success) return empty(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  const p = parsed.data;
  const pool = (p.zaZyciem ? rules.zaZyciemWeeks : rules.parentalWeeks)[p.childrenCount > 1 ? 1 : 0];
  const reserved = rules.reservedWeeks;
  const name = (who: 'me' | 'partner') => p.parents[who].label || (who === 'me' ? 'Rodzic 1' : 'Rodzic 2');
  const lastDay = `${Number(p.childBirthDate.slice(0, 4)) + rules.parentalAgeLimitYears}-12-31`;
  const earliest = p.earliestStart ?? p.childBirthDate;
  const issues = new Set<string>();

  if (p.segments.length > rules.maxParts) issues.add(`Rodzicielski można podzielić łącznie na maksymalnie ${rules.maxParts} części.`);
  const usedWeeks = p.segments.reduce((n, s) => n + s.weeks, 0);
  if (usedWeeks > pool) issues.add(`Suma części (${usedWeeks} tyg.) przekracza pulę ${pool} tygodni. Części jednoczesne zużywają pulę podwójnie.`);

  const periods: FamilyLeavePeriod[] = p.segments.map((s, i) => {
    const who = name(s.parent);
    if (!p.parents[s.parent].eligible) issues.add(`${who}: prawo do zasiłku nie jest potwierdzone – kwoty tej osoby są orientacyjne.`);
    if (s.workFraction > p0.parentalMaxWorkFraction) issues.add(`Część ${i + 1}: z rodzicielskim można łączyć pracę w wymiarze najwyżej ${p0.parentalMaxWorkFraction.toLocaleString('pl-PL')} etatu.`);
    const baseDays = s.weeks * 7;
    // Art. 182¹e KP: urlop wydłuża się proporcjonalnie do wymiaru pracy. Jeśli praca trwa także w okresie
    // wydłużenia, wydłużenie liczy się od całego okresu (dzielenie przez 1 − wymiar). Niepełne dni pomijamy.
    const fraction = Math.min(s.workFraction, 0.99);
    const extensionDays = Math.floor((baseDays * fraction) / (s.workDuringExtension ? 1 - fraction : 1));
    const end = addDateDays(s.start, baseDays + extensionDays - 1);
    const baseDaily = Math.round((p.parents[s.parent].baseCents * p0.rates.parental) / 30);
    const dailyCents = Math.round(baseDaily * (1 - fraction));
    const extensionDailyCents = s.workDuringExtension ? dailyCents : baseDaily;
    if (s.start < earliest) issues.add(`Część ${i + 1}: rodzicielski może zacząć się najwcześniej ${earliest.split('-').reverse().join('.')} (po urlopie macierzyńskim).`);
    if (end > lastDay) issues.add(`Część ${i + 1}: kończy się po ${lastDay.split('-').reverse().join('.')} – rodzicielski trwa najdłużej do końca roku, w którym dziecko kończy ${rules.parentalAgeLimitYears} lat.`);
    return {
      ...s, end, returnDate: addDateDays(end, 1), days: baseDays + extensionDays, extensionDays, dailyCents,
      totalCents: dailyCents * baseDays + extensionDays * extensionDailyCents,
    };
  });

  for (const who of ['me', 'partner'] as const) {
    const own = periods.filter((s) => s.parent === who);
    const weeks = own.reduce((n, s) => n + s.weeks, 0);
    if (weeks > pool - reserved) issues.add(`${name(who)}: maksymalnie ${pool - reserved} tyg. – ${reserved} tyg. należy wyłącznie do drugiego rodzica.`);
    if (own.filter((s) => s.reserved).reduce((n, s) => n + s.weeks, 0) > reserved) issues.add(`${name(who)}: część wyłączna nie może przekraczać ${reserved} tygodni.`);
    if (own.reduce((n, s) => n + s.days, 0) > pool * 14) issues.add(`${name(who)}: przekroczono maksymalny wydłużony wymiar (${pool * 2} tyg.).`);
    for (let a = 0; a < own.length; a++) for (let b = a + 1; b < own.length; b++) {
      if (own[a].start <= own[b].end && own[b].start <= own[a].end) issues.add(`${name(who)}: własne części urlopu nakładają się.`);
    }
  }
  const overlap = (a: FamilyLeavePeriod, b: FamilyLeavePeriod) => {
    const start = a.start > b.start ? a.start : b.start;
    const end = a.end < b.end ? a.end : b.end;
    return Math.max(0, daysBetween(start, end) + 1);
  };
  const mine = periods.filter((s) => s.parent === 'me');
  const theirs = periods.filter((s) => s.parent === 'partner');
  const simultaneousDays = mine.reduce((n, a) => n + theirs.reduce((m, b) => m + overlap(a, b), 0), 0);

  // Brak potwierdzonego prawa nie blokuje planu – to ostrzeżenie. Pozostałe problemy unieważniają plan.
  const blocking = [...issues].filter((i) => !i.includes('nie jest potwierdzone'));
  const sumBy = (who: 'me' | 'partner') => periods.filter((s) => s.parent === who && p.parents[who].eligible).reduce((n, s) => n + s.totalCents, 0);
  const totalByParent = { me: sumBy('me'), partner: sumBy('partner') };
  return {
    valid: blocking.length === 0,
    issues: [...issues],
    periods: blocking.length ? [] : periods,
    totalCents: blocking.length ? 0 : totalByParent.me + totalByParent.partner,
    totalByParent: blocking.length ? { me: 0, partner: 0 } : totalByParent,
    poolWeeks: pool,
    reservedWeeks: reserved,
    usedWeeks,
    unusedWeeks: Math.max(0, pool - usedWeeks),
    simultaneousDays,
    lastDay,
    rulesVersion: rules.version,
  };
}
