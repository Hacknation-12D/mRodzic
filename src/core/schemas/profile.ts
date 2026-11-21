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

export const ParentSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1).max(60),
  gender: GenderSchema,
  employment: EmploymentSchema.optional(),
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
