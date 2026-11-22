import type { LegalParameters } from '@/core/legal/parameters';

/** Jednostka pola – decyduje o formacie (procenty pokazujemy ×100). */
export type Unit = 'percent' | 'weeks' | 'days' | 'pln' | 'years' | 'months' | 'count' | 'share';

export type FieldDef = { path: string; label: string; unit: Unit; hint?: string };
export type FieldGroup = { title: string; fields: FieldDef[] };

export const UNIT_LABEL: Record<Unit, string> = {
  percent: '%', weeks: 'tyg.', days: 'dni', pln: 'zł', years: 'lat', months: 'mies.', count: '', share: 'etatu',
};

export const GROUPS: FieldGroup[] = [
  {
    title: 'Stawki zasiłków (% podstawy wymiaru)',
    fields: [
      { path: 'rates.full', label: 'Macierzyński, ojcowski, uzupełniający, chorobowy w ciąży', unit: 'percent' },
      { path: 'rates.parental', label: 'Urlop rodzicielski', unit: 'percent' },
      { path: 'rates.upfront', label: 'Wariant „z góry” (cały okres)', unit: 'percent' },
      { path: 'rates.sicknessGeneral', label: 'Chorobowy poza ciążą', unit: 'percent' },
      { path: 'rates.rehabilitationPregnancy', label: 'Świadczenie rehabilitacyjne w ciąży', unit: 'percent' },
    ],
  },
  {
    title: 'Podstawa wymiaru i kwoty roczne',
    fields: [
      { path: 'socialContributionRate', label: 'Składki odliczane od przychodu', unit: 'percent' },
      { path: 'minimumWage', label: 'Minimalne wynagrodzenie (brutto)', unit: 'pln' },
      { path: 'maxContributionBaseNonEmployee', label: 'Maks. podstawa dobrowolnej składki chorobowej', unit: 'pln' },
      { path: 'debtThresholdShare', label: 'Próg zadłużenia JDG (% minimalnego wynagrodzenia)', unit: 'percent' },
      { path: 'funeralGrant', label: 'Zasiłek pogrzebowy', unit: 'pln' },
      { path: 'payerThresholdInsured', label: 'Płatnik wypłaca zasiłki powyżej (ubezpieczonych)', unit: 'count' },
    ],
  },
  {
    title: 'Urlop macierzyński',
    fields: [
      { path: 'maternityWeeks.0', label: '1 dziecko', unit: 'weeks' },
      { path: 'maternityWeeks.1', label: '2 dzieci', unit: 'weeks' },
      { path: 'maternityWeeks.2', label: '3 dzieci', unit: 'weeks' },
      { path: 'maternityWeeks.3', label: '4 dzieci', unit: 'weeks' },
      { path: 'maternityWeeks.4', label: '5 i więcej dzieci', unit: 'weeks' },
      { path: 'maternityBeforeBirthWeeks', label: 'Najwcześniej przed porodem', unit: 'weeks' },
      { path: 'maternityMotherMinWeeks', label: 'Matka wykorzystuje przed przejęciem przez ojca', unit: 'weeks' },
      { path: 'maternityMotherMinWeeksSpecial', label: 'Jw. przy pobycie matki w szpitalu', unit: 'weeks' },
      { path: 'lossMaternityWeeks', label: 'Po stracie dziecka – po porodzie', unit: 'weeks' },
      { path: 'lossMinDaysAfterDeath', label: 'Po stracie dziecka – minimum od dnia zgonu', unit: 'days' },
    ],
  },
  {
    title: 'Urlop rodzicielski',
    fields: [
      { path: 'parentalWeeks.single', label: '1 dziecko', unit: 'weeks' },
      { path: 'parentalWeeks.multiple', label: 'Więcej dzieci z jednego porodu', unit: 'weeks' },
      { path: 'parentalWeeks.singleZaZyciem', label: '1 dziecko z zaświadczeniem „Za życiem”', unit: 'weeks' },
      { path: 'parentalWeeks.multipleZaZyciem', label: 'Więcej dzieci z „Za życiem”', unit: 'weeks' },
      { path: 'parentalNonTransferableWeeks', label: 'Część nieprzenoszalna każdego rodzica', unit: 'weeks' },
      { path: 'parentalMaxParts', label: 'Maksymalna liczba części', unit: 'count' },
      { path: 'parentalChildAgeLimitYears', label: 'Do końca roku, w którym dziecko kończy', unit: 'years' },
      { path: 'parentalMaxWorkFraction', label: 'Maks. wymiar pracy łączonej z urlopem', unit: 'share' },
      { path: 'upfrontApplicationDays', label: 'Termin wniosku o wariant „z góry” po porodzie', unit: 'days' },
    ],
  },
  {
    title: 'Urlop ojcowski i przyjęcie dziecka',
    fields: [
      { path: 'paternityWeeks', label: 'Urlop ojcowski', unit: 'weeks' },
      { path: 'paternityMaxParts', label: 'Maksymalna liczba części', unit: 'count' },
      { path: 'paternityDeadlineMonths', label: 'Do ukończenia przez dziecko', unit: 'months' },
      { path: 'adoptionMinWeeks', label: 'Minimalny urlop na warunkach macierzyńskiego', unit: 'weeks' },
      { path: 'adoptionChildAgeLimitYears', label: 'Przysposobienie – dziecko do', unit: 'years' },
      { path: 'fosterChildAgeLimitYears', label: 'Rodzina zastępcza – dziecko do', unit: 'years' },
      { path: 'fosterChildAgeLimitDeferredYears', label: 'Rodzina zastępcza przy odroczeniu szkoły – do', unit: 'years' },
    ],
  },
  {
    title: 'Choroba w ciąży',
    fields: [
      { path: 'employerSickPayDays', label: 'Wynagrodzenie chorobowe od pracodawcy', unit: 'days' },
      { path: 'employerSickPayDaysOver50', label: 'Jw. po 50. roku życia', unit: 'days' },
      { path: 'pregnancySicknessPeriodDays', label: 'Okres zasiłkowy w ciąży', unit: 'days' },
      { path: 'generalSicknessPeriodDays', label: 'Okres zasiłkowy poza ciążą', unit: 'days' },
      { path: 'waitingPeriodMandatoryDays', label: 'Okres wyczekiwania – ubezpieczenie obowiązkowe', unit: 'days' },
      { path: 'waitingPeriodVoluntaryDays', label: 'Okres wyczekiwania – ubezpieczenie dobrowolne', unit: 'days' },
      { path: 'rehabilitationMaxMonths', label: 'Świadczenie rehabilitacyjne – maksymalnie', unit: 'months' },
    ],
  },
];

export function getPath(params: LegalParameters, path: string): number {
  return path.split('.').reduce<unknown>((obj, key) => (obj as Record<string, unknown>)[key], params) as number;
}

/** Kopia parametrów z jedną zmienioną wartością (ścieżka „a.b” albo „tablica.0”). */
export function setPath(params: LegalParameters, path: string, value: number): LegalParameters {
  const copy = JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
  const keys = path.split('.');
  let target = copy;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys.at(-1)!] = value;
  return copy as unknown as LegalParameters;
}

/** Wartość do pola tekstowego. */
export function toText(value: number, unit: Unit): string {
  const shown = unit === 'percent' ? Math.round(value * 100 * 100) / 100 : value;
  return String(shown).replace('.', ',');
}

/** Wartość z pola tekstowego; NaN = błąd. */
export function fromText(text: string, unit: Unit): number {
  const n = Number(text.replace(/\s/g, '').replace(',', '.'));
  if (!text.trim() || !Number.isFinite(n)) return Number.NaN;
  return unit === 'percent' ? Math.round(n * 100) / 10000 : n;
}
