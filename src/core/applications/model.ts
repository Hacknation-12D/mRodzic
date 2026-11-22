import { z } from 'zod';

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const date = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v;
}, 'Niepoprawna data');
export const FactSchema = z.object({
  key: z.string(), rawValue: z.string(), normalizedValue: z.string(), confidence: z.number().min(0).max(1),
  source: z.object({ caseId: z.string(), fileHash: z.string(), page: z.number().int().positive(), documentType: z.string(), bbox: z.array(z.number()).length(4).optional() }),
  reviewed: z.boolean(), verificationStatus: z.enum(['unreviewed', 'confirmed', 'corrected', 'rejected']),
});
export type ExtractedFact = z.infer<typeof FactSchema>;
export const CaseDocumentSchema = z.object({
  caseId: z.string(), fileHash: z.string(), pageCount: z.number().int().min(1).max(150),
  synthetic: z.boolean(), parserVersion: z.string(),
  pages: z.array(z.object({ page: z.number().int(), documentType: z.string(), text: z.string().max(100000), confidence: z.number(), method: z.enum(['text', 'ocr', 'manual']) })),
  facts: z.array(FactSchema),
});
export type CaseDocument = z.infer<typeof CaseDocumentSchema>;
export const BenefitFactsSchema = z.object({
  kind: z.enum(['maternity', 'parental', 'paternity', 'adoption', 'foster', 'supplementary', 'pregnancy_sickness', 'rehabilitation', 'special_maternity', 'care']),
  eventDate: DateSchema, start: DateSchema, end: DateSchema, applicationDate: DateSchema,
  insurance: z.enum(['yes', 'no', 'unknown']), insuranceSince: z.string(), insuranceUntil: z.string(),
  employment: z.enum(['employment_contract', 'civil_contract', 'self_employed', 'student', 'unemployed', 'other']),
  baseGrossCents: z.number().int().min(0).max(100000000), baseConfirmed: z.boolean(),
  childrenCount: z.number().int().min(1).max(5), childBirthDate: z.string(),
  upfront: z.boolean(), reserved: z.boolean(), part: z.number().int().min(1).max(20),
  zaZyciem: z.boolean(), schoolDeferral: z.boolean(),
  debtCents: z.number().int().min(0), debtAsOf: z.string(), debtArrangementCurrent: z.boolean(),
  disputedInsurance: z.boolean(), specialAfterInsurance: z.enum(['none', 'liquidation', 'bankruptcy', 'birth_day', 'court', 'unknown']),
  applicantRole: z.enum(['mother', 'father', 'guardian']).default('mother'),
  lossDate: z.string().default(''),
  specialEvidence: z.object({
    confirmed: z.boolean().default(false), pregnancyCodeB: z.boolean().default(false),
    waitingException: z.boolean().default(false), previousInsuranceDays: z.number().int().min(0).default(0),
    sicknessDaysUsed: z.number().int().min(0).default(0), employerDaysUsed: z.number().int().min(0).default(0),
    placementConfirmed: z.boolean().default(false), professionalFoster: z.boolean().default(false),
    gestationalWeek: z.number().int().min(1).max(45).default(40), birthWeightGrams: z.number().int().min(1).default(3500),
    hospitalFrom: z.string().default(''), hospitalTo: z.string().default(''), maternityEnd: z.string().default(''),
    rehabilitationDecision: z.boolean().default(false),
  }).default({ confirmed: false, pregnancyCodeB: false, waitingException: false, previousInsuranceDays: 0, sicknessDaysUsed: 0, employerDaysUsed: 0, placementConfirmed: false, professionalFoster: false, gestationalWeek: 40, birthWeightGrams: 3500, hospitalFrom: '', hospitalTo: '', maternityEnd: '', rehabilitationDecision: false }),
  verified: z.boolean(),
});
export type BenefitFacts = z.infer<typeof BenefitFactsSchema>;
export const ApplicationDraftSchema = z.object({
  id: z.string(), owner: z.string(), caseId: z.string(), childId: z.string(),
  formId: z.enum(['ZAM', 'EMPLOYER', 'USC', 'SICKNESS', 'ADOPTION', 'REHABILITATION']),
  formVersion: z.string(), createdAt: z.string(), updatedAt: z.string(),
  status: z.enum(['draft', 'validated', 'ready', 'simulated_submitted']),
  values: z.record(z.string(), z.string().optional()), facts: BenefitFactsSchema,
  evidence: z.array(FactSchema).default([]),
  attachmentsConfirmed: z.boolean(), signatureConfirmed: z.boolean(), recipient: z.enum(['zus', 'employer', 'usc', 'unknown']),
  pdfRevision: z.string().optional(), submissionId: z.string().optional(), submittedAt: z.string().optional(),
  history: z.array(z.object({ at: z.string(), action: z.string() })),
});
export type ApplicationDraft = z.infer<typeof ApplicationDraftSchema>;
export type EligibilityResult = {
  status: 'eligible' | 'ineligible' | 'unknown'; reasonCode: string; reasons: string[]; missing: string[];
  rulesVersion: string; effectiveDate: string; sourceCitations: string[];
  amount?: { baseCents: number; dailyCents: number; estimate30Cents: number; days: number; totalCents: number; rate: number };
};
