import { pl } from '../../shared/i18n/pl';
import { defaultHouseholdSize, isMultipleBirth } from '../rules/buildFacts';
import { getStage } from '../stage/getStage';
import { stageLabel } from '../stage/stageLabel';
import type { Child, Parent, Profile } from '../types';

/** Mapa childId → „Dziecko N” (kolejność z profilu). Trzymana lokalnie, nigdy nie wysyłana. */
export function childAliases(profile: Profile): Map<string, string> {
  return new Map(profile.children.map((c, i) => [c.id, pl.anonymize.child(i + 1)]));
}

function describeParent(p: Parent): string {
  const employment = p.employment ? pl.employmentShort[p.employment] : pl.anonymize.employmentUnknown;
  return `${pl.genderShort[p.gender]}, ${employment}`;
}

/** „Dziecko 1: 4. miesiąc życia, wcześniak” – bez imienia i dat. */
export function describeChildAnonymously(profile: Profile, child: Child, today: Date): string {
  const alias = childAliases(profile).get(child.id) ?? pl.anonymize.child(1);
  const flags: string[] = [];
  if (child.premature) flags.push(pl.anonymize.premature);
  if (child.disability) flags.push(pl.anonymize.disability);
  if (isMultipleBirth(profile, child)) flags.push(pl.anonymize.multiple);
  const label = stageLabel(getStage(child, today));
  return `${alias}: ${[label, ...flags].join(', ')}`;
}

/**
 * Podsumowanie profilu bez danych identyfikujących, używane przez asystenta
 * i zgłoszenia do człowieka.
 */
export function toAnonymousSummary(profile: Profile, today: Date): string {
  const parts: string[] = [];
  parts.push(`${pl.anonymize.parent}: ${describeParent(profile.me)}.`);
  if (profile.partner) parts.push(`${pl.anonymize.partner}: ${describeParent(profile.partner)}.`);
  for (const child of profile.children) parts.push(`${describeChildAnonymously(profile, child, today)}.`);

  const h = profile.household;
  const size = h.size ?? defaultHouseholdSize(profile);
  const householdParts = [pl.plural.persons(size)];
  householdParts.push(h.incomePerPersonNet !== undefined ? pl.anonymize.income(h.incomePerPersonNet) : pl.anonymize.incomeUnknown);
  if (h.singleParent ?? !profile.partner) householdParts.push(pl.anonymize.singleParent);
  parts.push(`${pl.anonymize.household}: ${householdParts.join(', ')}.`);

  return parts.join(' ');
}

/** Zamienia „Dziecko N” w odpowiedzi AI z powrotem na imiona (lokalnie). */
export function deanonymize(text: string, profile: Profile): string {
  let result = text;
  // od najwyższego numeru, żeby „Dziecko 1” nie podmieniło początku „Dziecko 10”
  const entries = [...childAliases(profile).entries()].reverse();
  for (const [childId, alias] of entries) {
    const child = profile.children.find((c) => c.id === childId);
    if (child) result = result.split(alias).join(child.name);
  }
  return result;
}
