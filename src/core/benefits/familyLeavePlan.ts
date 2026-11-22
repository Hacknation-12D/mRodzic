import { z } from 'zod';
import { addDateDays, daysBetween, LEGAL_2026 } from '../applications/engine';
import { DateSchema } from '../applications/model';

const Segment = z.object({
  id: z.string(), parent: z.enum(['me', 'partner']), start: DateSchema,
  weeks: z.number().int().min(1).max(67), workFraction: z.number().min(0).max(.5),
  workDuringExtension: z.boolean(), reserved: z.boolean(),
});
export const FamilyLeavePlanSchema = z.object({
  childBirthDate: DateSchema, childrenCount: z.number().int().min(1).max(5), zaZyciem: z.boolean(),
  parents: z.object({ me: z.object({ baseCents: z.number().int().positive(), eligible: z.boolean() }), partner: z.object({ baseCents: z.number().int().positive(), eligible: z.boolean() }) }),
  segments: z.array(Segment).min(1).max(10),
});
export type FamilyLeavePlan = z.infer<typeof FamilyLeavePlanSchema>;
export function calculateFamilyLeavePlan(input: FamilyLeavePlan) {
  const parsed = FamilyLeavePlanSchema.safeParse(input);
  if (!parsed.success) return { valid: false as const, issues: parsed.error.issues.map((i) => i.message), periods: [], totalCents: 0 };
  const p = parsed.data;
  const pool = (p.zaZyciem ? LEGAL_2026.zaZyciemWeeks : LEGAL_2026.parentalWeeks)[p.childrenCount > 1 ? 1 : 0];
  const issues: string[] = [];
  if (p.segments.length > 5) issues.push('Plan przekracza łącznie 5 części rodzicielskiego.');
  const sum = p.segments.reduce((n, s) => n + s.weeks, 0);
  if (sum > pool) issues.push(`Suma części przekracza pulę ${pool} tygodni. Jednoczesne urlopy zużywają dwie części puli.`);
  const periods = p.segments.map((s) => {
    if (!p.parents[s.parent].eligible) issues.push(`Rodzic ${s.parent}: prawo do świadczenia nie zostało potwierdzone.`);
    const baseDays = s.weeks * 7;
    // Art. 182(1f) KP: extension = original days * work fraction; if working during
    // the extension too, divide by (1 - fraction). Discard incomplete days.
    const extensionDays = Math.floor(baseDays * s.workFraction / (s.workDuringExtension ? 1 - s.workFraction : 1));
    const end = addDateDays(s.start, baseDays + extensionDays - 1);
    const baseDaily = Math.round(p.parents[s.parent].baseCents * .7 / 30);
    const dailyCents = Math.round(baseDaily * (1 - s.workFraction));
    const extensionDailyCents = s.workDuringExtension ? dailyCents : baseDaily;
    if (s.start < p.childBirthDate || end > `${Number(p.childBirthDate.slice(0, 4)) + 6}-12-31`) issues.push('Okres wykracza poza granicę wieku dziecka.');
    return { ...s, end, returnDate: addDateDays(end, 1), days: baseDays + extensionDays, extensionDays, dailyCents, totalCents: dailyCents * baseDays + extensionDays * extensionDailyCents };
  });
  for (const who of ['me', 'partner'] as const) {
    const own = periods.filter((s) => s.parent === who);
    if (own.reduce((n, s) => n + s.weeks, 0) > pool - 9) issues.push(`Rodzic ${who}: 9 tygodni jest nieprzenoszalne na rzecz drugiego rodzica.`);
    if (own.filter((s) => s.reserved).reduce((n, s) => n + s.weeks, 0) > 9) issues.push(`Rodzic ${who}: część wyłączna przekracza 9 tygodni.`);
    if (own.reduce((n, s) => n + s.days, 0) > pool * 14) issues.push('Przekroczono maksymalny wydłużony wymiar.');
    for (let a = 0; a < own.length; a++) for (let b = a + 1; b < own.length; b++) {
      if (own[a].start <= own[b].end && own[b].start <= own[a].end) issues.push(`Rodzic ${who}: własne części urlopu nakładają się.`);
    }
  }
  const simultaneousDays = periods.filter((s) => s.parent === 'me').reduce((n, a) => n + periods.filter((s) => s.parent === 'partner').reduce((m, b) => {
    const start = a.start > b.start ? a.start : b.start; const end = a.end < b.end ? a.end : b.end;
    return m + Math.max(0, daysBetween(start, end) + 1);
  }, 0), 0);
  return { valid: !issues.length, issues, periods: issues.length ? [] : periods, totalCents: issues.length ? 0 : periods.reduce((n, s) => n + s.totalCents, 0), poolWeeks: pool, unusedWeeks: Math.max(0, pool - sum), simultaneousDays, rulesVersion: LEGAL_2026.version };
}
