import { differenceInYears, parseISO } from 'date-fns';

import { ageInMonths, dayOffset } from '../stage/getStage';
import type { Child, Employment, FactKey, Profile } from '../types';

export type FactValue = string | number | boolean | string[];

/** Element listy oznaczający brak danych (np. nieznane zatrudnienie jednego z rodziców). */
export const UNKNOWN_ITEM = '__unknown__';
/** Brak klucza = fakt nieznany (→ RuleResult „unknown”). */
export type Facts = Partial<Record<FactKey, FactValue>>;

function set(facts: Facts, key: FactKey, value: FactValue | undefined) {
  if (value !== undefined) facts[key] = value;
}

export function bornChildren(profile: Profile): Child[] {
  return profile.children.filter((c) => c.status === 'born');
}

export function isMultipleBirth(profile: Profile, child: Child): boolean {
  if (!child.multipleBirthGroupId) return false;
  return profile.children.filter((c) => c.multipleBirthGroupId === child.multipleBirthGroupId).length > 1;
}

/** Domyślna liczba osób: rodzice + dzieci urodzone. */
export function defaultHouseholdSize(profile: Pick<Profile, 'partner' | 'children'>): number {
  return 1 + (profile.partner ? 1 : 0) + profile.children.filter((c) => c.status === 'born').length;
}

export function buildFacts(profile: Profile, child: Child | null, today: Date): Facts {
  const facts: Facts = {};

  if (child) {
    set(facts, 'child.status', child.status);
    set(facts, 'child.dayOffset', dayOffset(child, today));
    set(facts, 'child.ageMonths', ageInMonths(child, today));
    // Dla urodzonego dziecka brak zaznaczenia „wcześniak” = nie (formularz domyślnie „nie”).
    set(facts, 'child.premature', child.status === 'born' ? (child.premature ?? false) : child.premature);
    set(facts, 'child.disability', child.disability);
    set(facts, 'child.isMultipleBirth', isMultipleBirth(profile, child));
  }

  set(facts, 'me.gender', profile.me.gender);
  set(facts, 'me.employment', profile.me.employment);
  set(facts, 'partner.exists', Boolean(profile.partner));
  if (profile.partner) {
    set(facts, 'partner.gender', profile.partner.gender);
    set(facts, 'partner.employment', profile.partner.employment);
  }

  const parents = [profile.me, ...(profile.partner ? [profile.partner] : [])];
  const employments: (Employment | typeof UNKNOWN_ITEM)[] = parents.map((p) => p.employment ?? UNKNOWN_ITEM);
  // Gdy nie znamy zatrudnienia żadnego rodzica → fakt nieznany; częściowa wiedza → element UNKNOWN_ITEM.
  if (employments.some((e) => e !== UNKNOWN_ITEM)) set(facts, 'anyParent.employment', employments);

  const h = profile.household;
  set(facts, 'household.size', h.size ?? defaultHouseholdSize(profile));
  set(facts, 'household.incomePerPersonNet', h.incomePerPersonNet);
  set(facts, 'household.singleParent', h.singleParent ?? !profile.partner);
  set(facts, 'household.childrenCount', profile.children.length);
  set(
    facts,
    'household.childrenUnder18Count',
    bornChildren(profile).filter((c) => c.birthDate && differenceInYears(today, parseISO(c.birthDate)) < 18).length,
  );
  // Miejscowość gospodarstwa = miejscowość z adresu zamieszkania (starsze profile: pole household.city).
  set(facts, 'household.city', profile.me.city?.trim() || h.city?.trim() || undefined);

  return facts;
}
