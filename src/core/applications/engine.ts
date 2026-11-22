import { BenefitFactsSchema, type BenefitFacts, type EligibilityResult } from './model';
import { calculateAdoptionMaternityLeave } from '../benefits/adoptionMaternityLeave';
import { calculateSupplementaryMaternityLeave } from '../benefits/supplementaryMaternityLeave';

export const LEGAL_2026 = Object.freeze({
  version: 'PL-2026.11.22-reviewed-subset', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31',
  rates: { full: 10000, parental: 7000, upfront: 8150 }, deduction: 1371, debtThresholdCents: 4806,
  parentalWeeks: [41, 43], zaZyciemWeeks: [65, 67], reservedWeeks: 9, maxParts: 5, upfrontDays: 21,
  maternityWeeks: [20, 31, 33, 35, 37],
  sourceCitations: [
    'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/komu-przysluguje',
    'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc',
    'https://www.gov.pl/web/rodzina/urlop-rodzicielski',
    'https://eli.gov.pl/eli/DU/2025/1242/ogl',
  ],
});
export function daysBetween(start: string, end: string) { return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000); }
export function addDateDays(date: string, days: number) { return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
const roundedDivide = (numerator: number, denominator: number) => Math.floor((numerator + denominator / 2) / denominator);

/** No decision text, filename or case ID enters this function. Unsupported evidence stays unknown. */
export function evaluateApplication(raw: BenefitFacts, rules = LEGAL_2026): EligibilityResult {
  const parsed = BenefitFactsSchema.safeParse(raw);
  const base = { rulesVersion: rules.version, effectiveDate: raw.eventDate, sourceCitations: [...rules.sourceCitations] };
  // Zdarzenie po końcu obowiązywania zestawu reguł (np. termin porodu w przyszłym roku): prognoza wg obecnych przepisów, z jawną adnotacją.
  const forecast = raw.eventDate > rules.effectiveTo
    ? `Prognoza według przepisów obowiązujących w ${rules.effectiveFrom.slice(0, 4)} r. (${rules.version}). Parametry roczne (np. minimalne wynagrodzenie) mogą się zmienić.`
    : undefined;
  const outcome = (status: EligibilityResult['status'], reasonCode: string, reason: string, missing: string[] = []): EligibilityResult => ({ ...base, status, reasonCode, reasons: forecast ? [reason, forecast] : [reason], missing });
  if (!parsed.success) return outcome('unknown', 'INVALID_INPUT', 'Popraw dane wejściowe.', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  const f = parsed.data;
  const evidence = f.specialEvidence;
  if (!f.verified) return outcome('unknown', 'UNREVIEWED', 'Potwierdź odczytane dane przed oceną prawa.', ['Weryfikacja faktów']);
  if (f.eventDate < rules.effectiveFrom) return outcome('unknown', 'RULESET_MISSING', 'Brak zweryfikowanej wersji reguł dla tej (historycznej) daty zdarzenia.', ['Przepisy obowiązujące w dniu zdarzenia']);
  if (f.end < f.start) return outcome('unknown', 'INVALID_PERIOD', 'Koniec okresu jest wcześniejszy od początku.');
  if (f.disputedInsurance) return outcome('unknown', 'INSURANCE_DISPUTED', 'Spór o podleganie ubezpieczeniu wymaga weryfikacji. Podejrzenie pozorności nie stanowi automatycznej odmowy.', ['Rozstrzygnięcie podlegania']);
  if (f.insurance === 'unknown') return outcome('unknown', 'INSURANCE_UNKNOWN', 'Potwierdź ubezpieczenie na dzień powstania prawa.', ['Ubezpieczenie na dzień zdarzenia']);
  const dateRelevant = f.kind === 'parental' || f.kind === 'paternity' || f.kind === 'pregnancy_sickness' ? f.start : f.eventDate;
  if (f.specialAfterInsurance !== 'none') return outcome('unknown', 'POST_INSURANCE_REVIEW', 'Szczególne prawo po ustaniu ubezpieczenia wymaga dokumentu potwierdzającego podstawę i datę ustania.', ['Weryfikacja dokumentu o ustaniu zatrudnienia']);
  if (f.insurance === 'no') return outcome('ineligible', 'NO_SICKNESS_INSURANCE', 'Brak ubezpieczenia chorobowego na właściwy dzień; sprawdź szczególne prawa po ustaniu zatrudnienia.');
  if (!f.insuranceSince) return outcome('unknown', 'INSURANCE_DATE_MISSING', 'Brakuje daty początku ubezpieczenia.', ['Początek ubezpieczenia']);
  if (f.insuranceSince > dateRelevant || (f.insuranceUntil && f.insuranceUntil < dateRelevant)) return outcome('unknown', 'OUTSIDE_INSURANCE', 'Zdarzenie wypada poza potwierdzonym okresem ubezpieczenia. Sprawdź prawa po jego ustaniu.', ['Podstawa prawa po ustaniu ubezpieczenia']);
  if (f.employment === 'self_employed') {
    if (f.debtAsOf !== dateRelevant) return outcome('unknown', 'DEBT_DATE_MISSING', 'Saldo składek musi być ustalone na dzień powstania prawa.', ['Saldo na właściwy dzień']);
    if (f.debtCents > rules.debtThresholdCents && !f.debtArrangementCurrent) return outcome('ineligible', 'CONTRIBUTION_DEBT', 'Dług przekracza 1% minimalnego wynagrodzenia. Spłata całości w ciągu 6 miesięcy może przywrócić prawo za cały okres; zweryfikuj układ ratalny.');
  }
  if (['rehabilitation', 'special_maternity', 'care'].includes(f.kind)) return outcome('unknown', 'SPECIAL_EVIDENCE_REQUIRED', 'Ten zakres wymaga dodatkowej weryfikacji dokumentacji. Dostępny jest szkic i ręczne uzupełnienie.', ['Dokumentacja szczególnego świadczenia']);
  if (f.kind === 'parental' && f.part > rules.maxParts) return outcome('ineligible', 'PARENTAL_PART_LIMIT', 'Przekroczono limit 5 części urlopu rodzicielskiego.');
  const days = daysBetween(f.start, f.end) + 1;
  if (f.kind === 'maternity' && f.applicantRole !== 'mother') return outcome('unknown', 'MATERNITY_TRANSFER', 'Przejęcie macierzyńskiego wymaga dat i potwierdzenia uprawnień obojga rodziców.', ['Wykorzystana część matki i podstawa przejęcia']);
  if (f.kind === 'paternity' && f.applicantRole !== 'father') return outcome('ineligible', 'PATERNITY_ROLE', 'Urlop ojcowski jest uprawnieniem ojca. Wybierz jego profil.');
  if (f.lossDate) {
    if (f.kind !== 'maternity') return outcome('ineligible', 'CHILD_LOSS', 'W tej sytuacji sprawdź pozostały okres macierzyńskiego i wsparcie po stracie.');
    if (f.childrenCount > 1) return outcome('unknown', 'MULTIPLE_LOSS_REVIEW', 'W porodzie mnogim ustal oddzielnie sytuację każdego dziecka.', ['Dane wszystkich dzieci z porodu']);
    const limit = f.lossDate < addDateDays(f.eventDate, 56) ? [addDateDays(f.eventDate, 55), addDateDays(f.lossDate, 7)].sort().at(-1)! : addDateDays(f.lossDate, 7);
    if (f.end > limit) return outcome('ineligible', 'LOSS_PERIOD_LIMIT', `Wskazany okres wykracza poza ${limit}.`);
  }
  if (f.kind === 'maternity' && (f.start < addDateDays(f.eventDate, -42) || days > rules.maternityWeeks[f.childrenCount - 1] * 7)) return outcome('ineligible', 'MATERNITY_PERIOD_LIMIT', 'Przekroczono wymiar urlopu lub limit 6 tygodni przed porodem.');
  if (f.kind === 'maternity' && f.start > f.eventDate) return outcome('unknown', 'MATERNITY_TRANSFER', 'Rozpoczęcie po porodzie wymaga sprawdzenia wcześniejszego wykorzystania i zasad przejęcia.');
  if (f.kind === 'parental') {
    const pool = (f.zaZyciem ? rules.zaZyciemWeeks : rules.parentalWeeks)[f.childrenCount > 1 ? 1 : 0];
    if (days > (f.reserved ? rules.reservedWeeks : pool - rules.reservedWeeks) * 7) return outcome('ineligible', 'PARENTAL_POOL_LIMIT', 'Okres przekracza limit dostępny jednemu rodzicowi.');
    const lastDay = `${Number(f.eventDate.slice(0, 4)) + 6}-12-31`;
    if (f.start < f.eventDate || f.end > lastDay) return outcome('ineligible', 'CHILD_AGE_LIMIT', 'Rodzicielski musi przypadać od narodzin do końca roku, w którym dziecko kończy 6 lat.');
  }
  if (f.kind === 'paternity' && (days > 14 || f.part > 2 || days % 7 !== 0 || f.start < f.eventDate || f.end >= `${Number(f.eventDate.slice(0, 4)) + 1}${f.eventDate.slice(4)}`)) return outcome('ineligible', 'PATERNITY_LIMIT', 'Ojcowski: do 2 tygodni w maksymalnie 2 częściach, przed ukończeniem przez dziecko 12 miesięcy.');
  if (f.kind === 'adoption' || f.kind === 'foster') {
    if (!evidence.placementConfirmed || !f.childBirthDate) return outcome('unknown', 'PLACEMENT_EVIDENCE', 'Potwierdź dokument przyjęcia, postępowanie sądowe i wiek dziecka.', ['Dokument przyjęcia']);
    if (f.kind === 'foster' && evidence.professionalFoster) return outcome('ineligible', 'PROFESSIONAL_FOSTER', 'Ta ścieżka dotyczy rodziny zastępczej niezawodowej.');
    if (f.childrenCount > 1) return outcome('unknown', 'PLACEMENT_CHILDREN', 'Podaj oddzielne daty urodzenia wszystkich przyjętych dzieci w kalkulatorze adopcyjnym.');
    try {
      const leave = calculateAdoptionMaternityLeave({ startDate: f.eventDate, childBirthDates: [f.childBirthDate], ageLimitYears: f.kind === 'adoption' ? 14 : f.schoolDeferral ? 10 : 7 });
      if (f.start < f.eventDate || f.end > leave.endDate) return outcome('ineligible', 'PLACEMENT_PERIOD_LIMIT', `Okres wykracza poza dostępny urlop (do ${leave.endDate}).`);
    } catch { return outcome('ineligible', 'PLACEMENT_AGE_LIMIT', 'Dziecko nie spełnia warunku wieku albo daty są sprzeczne.'); }
  }
  if (f.kind === 'supplementary') {
    if (!evidence.confirmed || !evidence.hospitalFrom || !evidence.hospitalTo || !evidence.maternityEnd) return outcome('unknown', 'HOSPITAL_EVIDENCE', 'Potwierdź zaświadczenie szpitala, tydzień porodu, masę i koniec macierzyńskiego.', ['Zaświadczenie szpitalne']);
    if (f.childrenCount > 1) return outcome('unknown', 'MULTIPLE_HOSPITAL_EVIDENCE', 'Przy porodzie mnogim potrzebne są oddzielne pobyty i masy wszystkich dzieci.');
    try {
      const leave = calculateSupplementaryMaternityLeave({ birthDate: f.eventDate, gestationalWeek: evidence.gestationalWeek, children: [{ birthWeightGrams: evidence.birthWeightGrams, hospitalizations: [{ from: evidence.hospitalFrom, to: evidence.hospitalTo }] }], maternityLeaveEndDate: evidence.maternityEnd });
      if (!leave.eligible || f.start !== leave.startDate || !leave.endDate || f.end > leave.endDate) return outcome('ineligible', 'SUPPLEMENTARY_LIMIT', `Wskazany okres nie spełnia warunków uzupełniającego urlopu. Dostępny koniec: ${leave.endDate ?? 'brak'}.`);
    } catch { return outcome('unknown', 'HOSPITAL_DATES', 'Popraw daty hospitalizacji i porodu.'); }
  }
  if (f.kind === 'pregnancy_sickness') {
    if (!evidence.confirmed || !evidence.pregnancyCodeB) return outcome('unknown', 'SICKNESS_HISTORY_REQUIRED', 'Potwierdź e-ZLA/kod B i kompletną historię okresu zasiłkowego.', ['e-ZLA i historia niezdolności']);
    const waiting = f.employment === 'employment_contract' ? 30 : 90;
    if (!evidence.waitingException && daysBetween(f.insuranceSince, f.start) + evidence.previousInsuranceDays < waiting) return outcome('ineligible', 'WAITING_PERIOD', `Nie upłynął okres wyczekiwania ${waiting} dni. Sprawdź ustawowe wyjątki i wcześniejsze okresy.`);
    if (days + evidence.sicknessDaysUsed > 270) return outcome('ineligible', 'SICKNESS_LIMIT', 'Przekroczono 270 dni okresu zasiłkowego w ciąży. Sprawdź świadczenie rehabilitacyjne.');
  }
  if (!f.baseConfirmed || f.baseGrossCents <= 0) return outcome('unknown', 'BASE_NOT_CONFIRMED', 'Potwierdź indywidualną podstawę. Średnia z konta może wymagać uzupełnienia miesięcy i składników.', ['Zweryfikowana podstawa wymiaru']);
  const timely = f.upfront && daysBetween(f.eventDate, f.applicationDate) >= 0 && daysBetween(f.eventDate, f.applicationDate) <= rules.upfrontDays;
  const rate = f.kind === 'paternity' || f.kind === 'supplementary' || f.kind === 'pregnancy_sickness' || !!f.lossDate || f.start < f.eventDate ? rules.rates.full : f.reserved && f.kind === 'parental' ? rules.rates.parental : timely ? rules.rates.upfront : f.kind === 'parental' ? rules.rates.parental : rules.rates.full;
  const baseCents = roundedDivide(f.baseGrossCents * (10000 - rules.deduction), 10000);
  const dailyCents = roundedDivide(baseCents * rate, 300000);
  return { ...outcome('eligible', 'INSURED_SUPPORTED_PERIOD', 'Na podstawie potwierdzonych danych warunki symulacji są spełnione. Wynik nie jest decyzją ZUS.'), amount: { baseCents, dailyCents, estimate30Cents: dailyCents * 30, days, totalCents: dailyCents * days, rate: rate / 10000 } };
}
