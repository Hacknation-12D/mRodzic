import { z } from 'zod';

/**
 * Zamknięta lista faktów. Literówka w treści (np. „child.premture”) zostanie
 * wyłapana przez walidację zod (content:validate / import / Supabase).
 */
export const FACT_KEYS = [
  'child.status',
  'child.dayOffset',
  'child.ageMonths',
  'child.premature',
  'child.disability',
  'child.isMultipleBirth',
  'child.loss',
  'me.gender',
  'me.employment',
  'partner.exists',
  'partner.gender',
  'partner.employment',
  'anyParent.employment',
  'household.size',
  'household.incomePerPersonNet',
  'household.singleParent',
  'household.childrenCount',
  'household.childrenUnder18Count',
  'household.city',
] as const;

export const FactKeySchema = z.enum(FACT_KEYS);
export type FactKey = z.infer<typeof FactKeySchema>;

export const OpSchema = z.enum(['eq', 'neq', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte', 'exists', 'notExists']);
export type Op = z.infer<typeof OpSchema>;

export type RuleValue = string | number | boolean | (string | number | boolean)[];

export type Rule =
  | { all: Rule[] }
  | { any: Rule[] }
  | { not: Rule }
  | { fact: FactKey; op: Op; value?: RuleValue };

export type RuleResult = 'met' | 'unmet' | 'unknown';

const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
export const RuleValueSchema = z.union([ScalarSchema, z.array(ScalarSchema)]);

export const RuleSchema: z.ZodType<Rule> = z.lazy(() =>
  z.union([
    z.strictObject({ all: z.array(RuleSchema) }),
    z.strictObject({ any: z.array(RuleSchema) }),
    z.strictObject({ not: RuleSchema }),
    z
      .strictObject({ fact: FactKeySchema, op: OpSchema, value: RuleValueSchema.optional() })
      .superRefine((leaf, ctx) => {
        const needsValue = leaf.op !== 'exists' && leaf.op !== 'notExists';
        if (needsValue && leaf.value === undefined) {
          ctx.addIssue({ code: 'custom', path: ['value'], message: `Operator "${leaf.op}" wymaga pola value` });
        }
        if ((leaf.op === 'in' || leaf.op === 'notIn') && !Array.isArray(leaf.value)) {
          ctx.addIssue({ code: 'custom', path: ['value'], message: `Operator "${leaf.op}" wymaga tablicy w value` });
        }
        if (['lt', 'lte', 'gt', 'gte'].includes(leaf.op) && typeof leaf.value !== 'number') {
          ctx.addIssue({ code: 'custom', path: ['value'], message: `Operator "${leaf.op}" wymaga liczby w value` });
        }
      }),
  ]),
);

export const RuleResultSchema = z.enum(['met', 'unmet', 'unknown']);
