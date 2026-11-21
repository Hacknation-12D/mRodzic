import { addWeeks, isAfter, isBefore, parseISO, startOfDay, subWeeks } from 'date-fns';
import { z } from 'zod';

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const IsoDateSchema = z.string().regex(ISO_DATE_REGEX, 'Oczekiwano daty YYYY-MM-DD');

export const GenderSchema = z.enum(['female', 'male', 'undisclosed']);
export const EmploymentSchema = z.enum([
  'employment_contract',
  'self_employed',
  'civil_contract',
  'unemployed',
  'student',
  'other',
]);
export const ChildColorKeySchema = z.enum(['coral', 'teal', 'violet', 'amber', 'sky', 'olive']);
export const ChildSexSchema = z.enum(['female', 'male', 'unknown']);
export const ChildStatusSchema = z.enum(['expected', 'born']);

/** Kto wypłaca zasiłki: ZUS (pracodawca ≤ 20 ubezpieczonych) albo sam pracodawca (> 20). */
export const BenefitPayerSchema = z.enum(['zus', 'employer']);

/** Dane o pracy rodzica (z PUE/eZUS) – bez nazwy i NIP-u pracodawcy. */
export const WorkSchema = z.object({
  employedSince: IsoDateSchema,
  /** Wymiar etatu, np. 1 albo 0.5. */
  fte: z.number().min(0.1).max(1),
  employerInsuredCount: z.number().int().min(1).max(100_000),
  benefitPayer: BenefitPayerSchema,
  /** Aktualne wynagrodzenie brutto miesięcznie. */
  monthlyGross: z.number().min(0).max(1_000_000),
  /** Wynagrodzenie netto miesięcznie – podstawa wyliczenia dochodu na osobę. */
  monthlyNet: z.number().min(0).max(1_000_000).optional(),
  /** Podstawa wymiaru składek (brutto) za kolejne miesiące, od najstarszego. */
  earnings: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), gross: z.number().min(0) })).max(24),
  vacation: z.object({ entitlementDays: z.number().int().min(0).max(60), usedDays: z.number().int().min(0).max(60) }),
  /** Trwający (lub zaplanowany) urlop macierzyński – widoczny w ZUS. */
  maternityLeave: z.object({ startDate: IsoDateSchema, endDate: IsoDateSchema, weeks: z.number().int().min(1) }).optional(),
  parentalLeave: z.object({ weeksTotal: z.number().int().min(1), weeksUsed: z.number().int().min(0) }).optional(),
});

export const ParentSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1).max(60),
  gender: GenderSchema,
  employment: EmploymentSchema.optional(),
  work: WorkSchema.optional(),
});

const ChildBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  status: ChildStatusSchema,
  dueDate: IsoDateSchema.optional(),
  birthDate: IsoDateSchema.optional(),
  sex: ChildSexSchema.optional(),
  premature: z.boolean().optional(),
  multipleBirthGroupId: z.string().optional(),
  disability: z.boolean().optional(),
  /** Ubezpieczenie dziecka – pobierane z mObywatela; brak = nieznane. */
  insured: z.boolean().optional(),
  /** PESEL dziecka (z mObywatela) – wyświetlany domyślnie zamaskowany. */
  pesel: z.string().regex(/^\d{11}$/).optional(),
  /** Akt urodzenia: numer i urząd stanu cywilnego. */
  birthRegistry: z.object({ actNumber: z.string().min(1), office: z.string().min(1) }).optional(),
  /** Nadchodzące szczepienia (z rejestru). */
  vaccinations: z.array(z.object({ name: z.string().min(1), dueDate: IsoDateSchema })).optional(),
  colorKey: ChildColorKeySchema,
});

/** Walidacja strukturalna (używana też przy odczycie z AsyncStorage). */
export const ChildSchema = ChildBaseSchema.superRefine((child, ctx) => {
  if (child.status === 'expected' && !child.dueDate) {
    ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Dziecko w drodze wymaga dueDate' });
  }
  if (child.status === 'born' && !child.birthDate) {
    ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Urodzone dziecko wymaga birthDate' });
  }
});

export const HouseholdSchema = z.object({
  city: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(10).optional(),
  size: z.number().int().min(1).max(30).optional(),
  incomePerPersonNet: z.number().min(0).max(1_000_000).optional(),
  singleParent: z.boolean().optional(),
});

export const ProfileSchema = z.object({
  schemaVersion: z.literal(1),
  me: ParentSchema,
  partner: ParentSchema.optional(),
  children: z.array(ChildSchema).min(1),
  household: HouseholdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DateValidationError = 'dueDateRequired' | 'dueDateRange' | 'birthDateRequired' | 'birthDateFuture';

/**
 * Walidacja dat względem „dzisiaj” – tylko przy wprowadzaniu danych w formularzu.
 * (Zapisany profil nie jest odrzucany, gdy z czasem termin porodu „przeterminuje się”.)
 * dueDate: od dziś −4 tygodnie do dziś +42 tygodnie; birthDate: nie z przyszłości.
 */
export function validateChildDates(
  child: { status: 'expected' | 'born'; dueDate?: string; birthDate?: string },
  today: Date,
): Partial<Record<'dueDate' | 'birthDate', DateValidationError>> {
  const day = startOfDay(today);
  if (child.status === 'expected') {
    if (!child.dueDate) return { dueDate: 'dueDateRequired' };
    const due = parseISO(child.dueDate);
    if (isBefore(due, subWeeks(day, 4)) || isAfter(due, addWeeks(day, 42))) return { dueDate: 'dueDateRange' };
    return {};
  }
  if (!child.birthDate) return { birthDate: 'birthDateRequired' };
  if (isAfter(parseISO(child.birthDate), day)) return { birthDate: 'birthDateFuture' };
  return {};
}
