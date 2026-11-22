import { describe, expect, it } from 'vitest';
import { ProfileSchema } from '../schemas/profile';
import profiles from '../../dev/dummyData/mrodzic_compat_profiles_v1.json';
import { addDateDays, daysBetween, evaluateApplication } from './engine';
import { classifyPage, extractPageFacts, factConflicts } from './extraction';
import { changeDraft, markPdfReady, newApplication, submitSimulation, validateDraft } from './workflow';
import type { BenefitFacts } from './model';

const at = '2026-11-22T10:00:00.000Z';
function fixture() {
  const profile = ProfileSchema.parse(profiles[4].profile);
  const draft = newApplication(profile, 'P05', profile.children[0], '2026-11-22', 'test-1', at);
  draft.facts = { ...draft.facts, eventDate: '2026-11-01', start: '2026-11-01', end: '2026-11-30', insuranceSince: '2020-01-01', insurance: 'yes', employment: 'employment_contract', verified: true, baseConfirmed: true, baseGrossCents: 600000 };
  draft.attachmentsConfirmed = true; draft.signatureConfirmed = true;
  return draft;
}
describe('proces wniosku', () => {
  it('przechodzi od szkicu do walidacji, PDF i niezmiennego potwierdzenia DEMO', () => {
    const validated = validateDraft(fixture(), at);
    const ready = markPdfReady(validated, validated.updatedAt, at);
    const submitted = submitSimulation(ready, 'P05', true, at);
    expect(submitted.status).toBe('simulated_submitted');
    expect(submitted.submissionId).toBe('DEMO-test-1');
    expect(() => changeDraft(submitted, {}, at)).toThrow('niezmienny');
    expect(() => submitSimulation(submitted, 'P05', true, at)).toThrow();
  });
  it('nie pozwala ominąć walidacji, PDF, potwierdzenia ani izolacji profilu', () => {
    expect(() => submitSimulation(fixture(), 'P05', true, at)).toThrow();
    const validated = validateDraft(fixture(), at);
    expect(() => submitSimulation(validated, 'P05', true, at)).toThrow();
    const ready = markPdfReady(validated, at, at);
    expect(() => submitSimulation(ready, 'P03', true, at)).toThrow();
    expect(() => submitSimulation(ready, 'P05', false, at)).toThrow();
    expect(changeDraft(ready, { values: {} }, '2026-11-22T10:01:00Z')).toMatchObject({ status: 'draft', pdfRevision: undefined });
    expect(() => markPdfReady(changeDraft(ready, {}, 'new'), at, at)).toThrow();
  });
  it('nie używa nowego ZAM dla wcześniejszej daty formularza', () => {
    const draft = fixture(); draft.facts.applicationDate = '2026-10-23';
    expect(() => validateDraft(draft, at)).toThrow('24.10.2026');
    draft.facts.applicationDate = '2026-10-24';
    expect(validateDraft(draft, at).status).toBe('validated');
  });
});
describe('prawo i grosze', () => {
  it.each([
    [{ insurance: 'no' }, 'ineligible', 'NO_SICKNESS_INSURANCE'],
    [{ insurance: 'unknown' }, 'unknown', 'INSURANCE_UNKNOWN'],
    [{ disputedInsurance: true }, 'unknown', 'INSURANCE_DISPUTED'],
    [{ insuranceUntil: '2026-10-01' }, 'unknown', 'OUTSIDE_INSURANCE'],
    [{ verified: false }, 'unknown', 'UNREVIEWED'],
    [{ eventDate: '2024-01-01' }, 'unknown', 'RULESET_MISSING'],
    [{ kind: 'parental', part: 6 }, 'ineligible', 'PARENTAL_PART_LIMIT'],
    [{ employment: 'self_employed', debtCents: 4807, debtAsOf: '2026-11-01' }, 'ineligible', 'CONTRIBUTION_DEBT'],
    [{ employment: 'self_employed', debtCents: 4807, debtAsOf: '2026-10-31' }, 'unknown', 'DEBT_DATE_MISSING'],
    [{ baseConfirmed: false }, 'unknown', 'BASE_NOT_CONFIRMED'],
  ])('%j → %s', (patch, status, reasonCode) => {
    const result = evaluateApplication({ ...fixture().facts, ...patch } as BenefitFacts);
    expect(result).toMatchObject({ status, reasonCode }); expect(result.amount).toBeUndefined();
  });
  it('nie stosuje zadłużenia płatnika jako odmowy dla zleceniobiorcy', () => {
    expect(evaluateApplication({ ...fixture().facts, employment: 'civil_contract', debtCents: 100000 }).status).toBe('eligible');
  });
  it('liczy granicę 21 dni, nieprzenoszalne 70% oraz rzeczywiste dni', () => {
    const f = { ...fixture().facts, upfront: true };
    expect(evaluateApplication({ ...f, applicationDate: '2026-11-22' }).amount?.rate).toBe(.815);
    expect(evaluateApplication({ ...f, applicationDate: '2026-11-23' }).amount?.rate).toBe(1);
    const r = evaluateApplication({ ...f, kind: 'parental', reserved: true });
    expect(r.amount).toMatchObject({ baseCents: 517740, dailyCents: 12081, totalCents: 362430, days: 30, rate: .7 });
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(addDateDays('2024-02-28', 1)).toBe('2024-02-29');
  });
  it('odrzuca nieistniejącą datę', () => expect(evaluateApplication({ ...fixture().facts, eventDate: '2026-02-30' }).reasonCode).toBe('INVALID_INPUT'));
});
describe('pochodzenie danych', () => {
  it('oddziela decyzję historyczną i wykrywa sprzeczne fakty', () => {
    const source = { caseId: 'CASE_001', fileHash: 'hash', page: 1, documentType: classifyPage('DECYZJA ZAM') };
    expect(extractPageFacts('Podstawa brutto grosze: 600000', source, .99)).toEqual([]);
    const facts = extractPageFacts('Data zdarzenia: 2026-11-01\nUbezpieczenie chorobowe: no', { ...source, documentType: 'insurance' }, .8);
    expect(facts[0]).toMatchObject({ reviewed: false, source: { page: 1 }, confidence: .8 });
    expect(factConflicts([...facts, { ...facts[0], normalizedValue: '2026-11-02' }])).toEqual(['eventDate']);
  });
});

describe('dane domyślne wniosku z profilu DEMO', () => {
  const byId = (id: string) => ProfileSchema.parse(profiles.find((p) => p.profileId === id)?.profile);
  const confirmed = (id: string) => {
    const profile = byId(id);
    const draft = newApplication(profile, id, profile.children[0], '2026-11-22', `t-${id}`, at);
    return evaluateApplication({ ...draft.facts, verified: true, baseConfirmed: true });
  };

  it('P04 (studentka bez tytułu do ubezpieczenia): odmowa z uzasadnieniem, bez kwoty', () => {
    const r = confirmed('P04');
    expect(r).toMatchObject({ status: 'ineligible', reasonCode: 'NO_SICKNESS_INSURANCE' });
    expect(r.amount).toBeUndefined();
  });

  it('P09 (ubezpieczenie ustało przez likwidację pracodawcy): weryfikacja dokumentów zamiast odmowy', () => {
    expect(confirmed('P09')).toMatchObject({ status: 'unknown', reasonCode: 'POST_INSURANCE_REVIEW' });
  });
});
