import { z } from 'zod';

import { RuleSchema } from './rules';

/** Okno czasowe względem porodu dziecka, w dniach (ujemne = ciąża). Tydzień ciąży T → (T − 40) × 7. */
export const TimingSchema = z.object({
  showFrom: z.number().int(),
  showTo: z.number().int().optional(),
  deadline: z.number().int().optional(),
  deadlineNote: z.string().max(300).optional(),
});

export const ShortTimingSchema = TimingSchema.pick({ showFrom: true, showTo: true });

export const UrlSchema = z.url({ protocol: /^https?$/ });

export const SourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: UrlSchema.optional(),
  asOf: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'asOf musi mieć format YYYY-MM'),
});

export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id musi być slugiem (a-z, 0-9, myślniki)');

export const RequirementSchema = z.object({
  id: SlugSchema,
  label: z.string().min(1).max(300),
  who: z.enum(['me', 'partner', 'anyParent', 'child', 'household']),
  rule: RuleSchema,
});

export const LinkSchema = z.object({
  label: z.string().min(1).max(120),
  url: UrlSchema,
  kind: z.enum(['apply', 'info', 'guide']),
});

export const DocumentCategorySchema = z.enum(['benefit', 'registry', 'work', 'health', 'education', 'other']);

export const DocumentDefSchema = z.object({
  id: SlugSchema,
  scope: z.enum(['child', 'household']),
  category: DocumentCategorySchema,
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  bodyMd: z.string().min(1),
  timing: TimingSchema,
  visibleWhen: RuleSchema.optional(),
  requirements: z.array(RequirementSchema),
  links: z.array(LinkSchema),
  checklist: z.array(z.string().min(1)).optional(),
  assistantPrompts: z.array(z.string().min(1).max(200)),
  amountLabel: z.string().max(80).optional(),
  tags: z.array(z.string().min(1)),
  source: SourceSchema,
  needsReview: z.boolean(),
  priority: z.number().int().min(1).max(5),
});

export const TipDefSchema = z.object({
  id: SlugSchema,
  title: z.string().min(1).max(120),
  summaryMd: z.string().min(1).max(600),
  bodyMd: z.string().optional(),
  timing: ShortTimingSchema,
  visibleWhen: RuleSchema.optional(),
  tags: z.array(z.string().min(1)),
  source: SourceSchema.optional(),
  priority: z.number().int().min(1).max(5),
});

export const TodoDefSchema = z.object({
  id: SlugSchema,
  title: z.string().min(1).max(120),
  descriptionMd: z.string().optional(),
  timing: TimingSchema,
  visibleWhen: RuleSchema.optional(),
  category: z.enum(['health', 'home', 'work', 'registry', 'education', 'other']),
  relatedDocumentId: SlugSchema.optional(),
  source: SourceSchema.optional(),
  priority: z.number().int().min(1).max(5),
});

export const PromptDefSchema = z.object({
  id: SlugSchema,
  text: z.string().min(1).max(200),
  timing: ShortTimingSchema,
  visibleWhen: RuleSchema.optional(),
});

export const ContentBundleSchema = z.object({
  version: z.number().int().min(0),
  updatedAt: z.string(),
  documents: z.array(DocumentDefSchema),
  tips: z.array(TipDefSchema),
  todos: z.array(TodoDefSchema),
  prompts: z.array(PromptDefSchema),
});

export const ContentMetaSchema = z.object({
  version: z.number().int().min(0),
  updatedAt: z.string(),
});

export const CONTENT_KINDS = ['documents', 'tips', 'todos', 'prompts'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_SCHEMAS = {
  documents: DocumentDefSchema,
  tips: TipDefSchema,
  todos: TodoDefSchema,
  prompts: PromptDefSchema,
} as const;
