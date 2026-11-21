import type { z } from 'zod';

import type {
  ChildColorKeySchema,
  ChildSchema,
  ContentBundleSchema,
  DocumentDefSchema,
  EmploymentSchema,
  GenderSchema,
  HouseholdSchema,
  LinkSchema,
  ParentSchema,
  ProfileSchema,
  PromptDefSchema,
  RequirementSchema,
  SourceSchema,
  TimingSchema,
  TipDefSchema,
  TodoDefSchema,
  WorkSchema,
  ZusRecordSchema,
} from '../schemas';
import type { RuleResult } from '../schemas/rules';

export type { FactKey, Op, Rule, RuleResult, RuleValue } from '../schemas/rules';

// --- Profil ---
export type Gender = z.infer<typeof GenderSchema>;
export type Employment = z.infer<typeof EmploymentSchema>;
export type ChildColorKey = z.infer<typeof ChildColorKeySchema>;
export type Work = z.infer<typeof WorkSchema>;
export type ZusRecord = z.infer<typeof ZusRecordSchema>;
export type Parent = z.infer<typeof ParentSchema>;
export type Child = z.infer<typeof ChildSchema>;
export type Household = z.infer<typeof HouseholdSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

// --- Treść ---
export type Timing = z.infer<typeof TimingSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type DocumentLink = z.infer<typeof LinkSchema>;
export type DocumentDef = z.infer<typeof DocumentDefSchema>;
export type TipDef = z.infer<typeof TipDefSchema>;
export type TodoDef = z.infer<typeof TodoDefSchema>;
export type PromptDef = z.infer<typeof PromptDefSchema>;
export type ContentBundle = z.infer<typeof ContentBundleSchema>;

// --- Etapy ---
export type Stage =
  | { kind: 'pregnancy'; week: number; trimester: 1 | 2 | 3; overdue: boolean }
  | { kind: 'newborn'; weeks: number }
  | { kind: 'infant'; months: number }
  | { kind: 'toddler'; months: number }
  | { kind: 'preschool'; years: number; months: number }
  | { kind: 'school'; years: number; months: number };

// --- Widoki ---
export type ChildFilter = 'all' | string;
export type DocumentStatus = 'todo' | 'done' | 'hidden';
export type StatusEntry = { status: 'done' | 'hidden'; updatedAt: string };
export type StatusMap = Record<string, StatusEntry>;
export type Urgency = 'overdue' | 'urgent' | 'soon' | 'later' | 'none';

export type RequirementResult = {
  id: string;
  label: string;
  who: Requirement['who'];
  result: RuleResult;
};

export type DocumentInstance = DocumentDef & {
  key: string;
  childId?: string;
  status: DocumentStatus;
  statusUpdatedAt?: string;
  deadlineDate?: Date;
  daysLeft?: number;
  urgency: Urgency;
  eligibility: RuleResult;
  requirementResults: RequirementResult[];
};

export type MonthItem = {
  key: string;
  date?: Date;
  childId?: string;
  kind: 'deadline' | 'todo';
  refId: string;
  title: string;
  urgency: Urgency;
  done: boolean;
  /** 1–5, wyższa = ważniejsza (sortowanie). */
  priority: number;
  /** Dla todo powiązanego z dokumentem. */
  relatedDocumentId?: string;
};

export type TipForChild = TipDef & { childId?: string };

export type MarkKey = ChildColorKey | 'family';
