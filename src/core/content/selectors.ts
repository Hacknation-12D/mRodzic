import { differenceInCalendarDays } from 'date-fns';

import { instanceKey } from '../documents/documentKey';
import { buildFacts } from '../rules/buildFacts';
import { combineAll, evaluate, evaluateOptional } from '../rules/evaluate';
import { anchorDate, dayOffset, offsetToDate } from '../stage/getStage';
import type {
  Child,
  ChildFilter,
  ContentBundle,
  DocumentDef,
  DocumentInstance,
  Profile,
  RuleResult,
  StatusMap,
  Urgency,
} from '../types';

/** Gdy brak showTo, a jest deadline – dokument widać jeszcze tyle dni „po terminie”. */
export const OVERDUE_GRACE_DAYS = 30;

const URGENCY_RANK: Record<Urgency, number> = { overdue: 0, urgent: 1, soon: 2, later: 3, none: 4 };

/**
 * Po utracie dziecka (martwe urodzenie / zgon) zostają tylko dokumenty, które nadal przysługują rodzicowi.
 * Urlop macierzyński: 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu (art. 180 § 4–5 KP).
 */
const LOSS_DOCUMENTS = new Set(['urlop-macierzynski']);
const LOSS_AMOUNT_LABEL: Record<string, string> = { 'urlop-macierzynski': '8 tygodni po porodzie (nie krócej niż 7 dni od zgonu)' };

/** Dzieci, którymi rodzic się opiekuje (bez utraconych) – do wskazówek, zadań i podpowiedzi. */
function caredForChildren(profile: Profile, filter: ChildFilter): Child[] {
  return filterChildren(profile, filter).filter((c) => !c.loss);
}

export function filterChildren(profile: Profile, filter: ChildFilter): Child[] {
  if (filter === 'all') return profile.children;
  const child = profile.children.find((c) => c.id === filter);
  return child ? [child] : profile.children;
}

export function isInWindow(offset: number, timing: { showFrom: number; showTo?: number; deadline?: number }): boolean {
  if (offset < timing.showFrom) return false;
  const end = timing.showTo ?? (timing.deadline !== undefined ? timing.deadline + OVERDUE_GRACE_DAYS : Number.POSITIVE_INFINITY);
  return offset <= end;
}

export function urgencyFor(daysLeft: number | undefined): Urgency {
  if (daysLeft === undefined) return 'none';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 7) return 'urgent';
  if (daysLeft <= 30) return 'soon';
  return 'later';
}

export function getDocumentById(bundle: ContentBundle, docId: string): DocumentDef | undefined {
  return bundle.documents.find((d) => d.id === docId);
}

/** Dla dokumentów scope=household: najmłodsze dziecko, dla którego visibleWhen ≠ unmet. */
export function householdAnchor(doc: DocumentDef, profile: Profile, today: Date): Child | null {
  const candidates = profile.children.filter((c) => evaluateOptional(doc.visibleWhen, buildFacts(profile, c, today)) !== 'unmet');
  if (candidates.length === 0) return null;
  return candidates.reduce((youngest, c) => (anchorDate(c) > anchorDate(youngest) ? c : youngest));
}

type Candidate = { doc: DocumentDef; child: Child | null; childId?: string; visibility: RuleResult };

function documentCandidates(bundle: ContentBundle, profile: Profile, today: Date, filter: ChildFilter): Candidate[] {
  const children = filterChildren(profile, filter);
  const out: Candidate[] = [];
  for (const doc of bundle.documents) {
    if (doc.scope === 'child') {
      for (const child of children) {
        const visibility =
          child.loss && !LOSS_DOCUMENTS.has(doc.id) ? 'unmet' : evaluateOptional(doc.visibleWhen, buildFacts(profile, child, today));
        out.push({ doc, child, childId: child.id, visibility });
      }
    } else {
      // Dokumenty rodzinne pokazujemy niezależnie od filtra dziecka.
      const anchor = householdAnchor(doc, profile, today);
      out.push({ doc, child: anchor, visibility: anchor ? 'met' : 'unmet' });
    }
  }
  return out;
}

function buildInstance(
  doc: DocumentDef,
  profile: Profile,
  statuses: StatusMap,
  today: Date,
  child: Child | null,
  childId: string | undefined,
): DocumentInstance {
  const facts = buildFacts(profile, child, today);
  const requirementResults = doc.requirements.map((r) => ({ id: r.id, label: r.label, who: r.who, result: evaluate(r.rule, facts) }));
  const eligibility = combineAll(requirementResults.map((r) => r.result));
  const deadlineDate = child && doc.timing.deadline !== undefined ? offsetToDate(child, doc.timing.deadline) : undefined;
  const daysLeft = deadlineDate ? differenceInCalendarDays(deadlineDate, today) : undefined;
  const key = instanceKey(doc.id, childId);
  const entry = statuses[key];
  return {
    ...doc,
    ...(child?.loss && LOSS_AMOUNT_LABEL[doc.id] ? { amountLabel: LOSS_AMOUNT_LABEL[doc.id] } : null),
    key,
    childId,
    status: entry?.status ?? 'todo',
    statusUpdatedAt: entry?.updatedAt,
    deadlineDate,
    daysLeft,
    urgency: urgencyFor(daysLeft),
    eligibility,
    requirementResults,
  };
}

export function compareInstances(a: DocumentInstance, b: DocumentInstance): number {
  return (
    URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
    (a.deadlineDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.deadlineDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
    b.priority - a.priority ||
    a.title.localeCompare(b.title, 'pl')
  );
}

/**
 * Instancje dokumentów: widoczne (visibleWhen ≠ unmet) i w oknie showFrom..showTo
 * LUB już oznaczone jako done/hidden. Sort: pilność, termin, priorytet.
 */
export function getDocumentInstances(
  bundle: ContentBundle,
  profile: Profile,
  statuses: StatusMap,
  today: Date,
  filter: ChildFilter,
): DocumentInstance[] {
  const result: DocumentInstance[] = [];
  for (const { doc, child, childId, visibility } of documentCandidates(bundle, profile, today, filter)) {
    const hasStatus = statuses[instanceKey(doc.id, childId)] !== undefined;
    const visibleNow = visibility !== 'unmet' && child !== null && isInWindow(dayOffset(child, today), doc.timing);
    if (visibleNow || (hasStatus && child !== null)) {
      result.push(buildInstance(doc, profile, statuses, today, child, childId));
    }
  }
  return result.sort(compareInstances);
}

/** Pojedyncza instancja – niezależnie od okna czasowego (ekran szczegółów). */
export function getDocumentInstance(
  bundle: ContentBundle,
  profile: Profile,
  statuses: StatusMap,
  today: Date,
  docId: string,
  childId?: string,
): DocumentInstance | undefined {
  const doc = getDocumentById(bundle, docId);
  if (!doc) return undefined;
  if (doc.scope === 'household') {
    const anchor = householdAnchor(doc, profile, today) ?? profile.children.reduce((y, c) => (anchorDate(c) > anchorDate(y) ? c : y));
    return buildInstance(doc, profile, statuses, today, anchor, undefined);
  }
  const child = (childId ? profile.children.find((c) => c.id === childId) : undefined) ?? profile.children[0];
  if (!child) return undefined;
  return buildInstance(doc, profile, statuses, today, child, child.id);
}

/** Podpowiedzi czatu: 2–3 pytania z dokumentów z najbliższym terminem + PromptDef dla etapu. */
export function getSuggestedPrompts(
  bundle: ContentBundle,
  profile: Profile,
  statuses: StatusMap,
  today: Date,
  childId: string | null,
  max = 6,
): string[] {
  const filter: ChildFilter = childId ?? 'all';
  const prompts: string[] = [];
  const push = (text: string | undefined) => {
    if (text && !prompts.includes(text) && prompts.length < max) prompts.push(text);
  };

  const upcoming = getDocumentInstances(bundle, profile, statuses, today, filter).filter((d) => d.status === 'todo');
  const docIds = new Set<string>();
  for (const inst of upcoming) {
    if (docIds.size >= 3) break;
    if (docIds.has(inst.id)) continue;
    docIds.add(inst.id);
    push(inst.assistantPrompts[0]);
  }

  for (const child of caredForChildren(profile, filter)) {
    const facts = buildFacts(profile, child, today);
    const offset = dayOffset(child, today);
    for (const p of bundle.prompts) {
      if (isInWindow(offset, p.timing) && evaluateOptional(p.visibleWhen, facts) !== 'unmet') push(p.text);
    }
  }
  return prompts;
}

/** 5–8 dokumentów z najbliższym terminem – kontekst dla asystenta. */
export function getRelevantDocumentIds(
  bundle: ContentBundle,
  profile: Profile,
  statuses: StatusMap,
  today: Date,
  childId: string | null,
  max = 8,
): string[] {
  const ids: string[] = [];
  for (const inst of getDocumentInstances(bundle, profile, statuses, today, childId ?? 'all')) {
    if (inst.status !== 'todo' || ids.includes(inst.id)) continue;
    ids.push(inst.id);
    if (ids.length >= max) break;
  }
  return ids;
}

/**
 * Liczba zaległych terminów (dokument „do zrobienia” po terminie) dla każdego dziecka.
 * Ta sama logika co lista „Najbliższe terminy” na ekranie dziecka – strona główna pokazuje na tej podstawie ostrzeżenie.
 */
export function overdueCountByChild(bundle: ContentBundle, profile: Profile, statuses: StatusMap, today: Date): Record<string, number> {
  const out: Record<string, number> = {};
  for (const child of profile.children) {
    const count = getDocumentInstances(bundle, profile, statuses, today, child.id).filter(
      (d) => d.childId === child.id && d.status === 'todo' && d.urgency === 'overdue',
    ).length;
    if (count > 0) out[child.id] = count;
  }
  return out;
}
