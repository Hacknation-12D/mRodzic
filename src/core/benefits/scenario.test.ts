import { describe, expect, it } from 'vitest';

import demoProfiles from '../../dev/dummyData/mrodzic_compat_profiles_v1.json';
import { ProfileSchema } from '../schemas/profile';
import { BenefitInputError } from './common';
import { calculateBenefitScenario, type BenefitScenarioInput } from './scenario';
import { scenarioDefaultsFromProfile } from './scenarioDefaults';

const base: BenefitScenarioInput = {
  kind: 'birth',
  employment: 'employment_contract',
  sicknessInsurance: 'yes',
  averageMonthlyGross: 7200,
  eventDate: '2026-09-03',
  childrenCount: 1,
  zaZyciem: false,
  partnerParentalWeeks: 9,
  upfrontApplication: true,
};
const profile = (id: string) => ProfileSchema.parse(demoProfiles.find((p) => p.profileId === id)?.profile);
const today = new Date('2026-11-21T12:00:00');

describe('kalkulator świadczeń – ocena prawa', () => {
  it('umowa o pracę: przysługuje, liczy kwoty', () => {
    const r = calculateBenefitScenario(base);
    expect(r.eligibility.status).toBe('eligible');
    // 7200 zł brutto − 13,71% = 6212,88 zł podstawy
    expect(r.base?.base).toBeCloseTo(6212.88, 2);
    expect(r.amounts?.segments.map((s) => [s.leave, s.weeks, s.rate])).toEqual([
      ['maternity', 20, 0.815],
      ['parental', 32, 0.815],
    ]);
    expect(r.amounts?.variantComparison.upfrontTotal).toBeGreaterThan(0);
  });

  it('JDG bez dobrowolnego chorobowego: nie przysługuje, bez kwot, z alternatywą', () => {
    const r = calculateBenefitScenario({ ...base, employment: 'self_employed', sicknessInsurance: 'no' });
    expect(r.eligibility.status).toBe('not_eligible');
    expect(r.amounts).toBeUndefined();
    expect(r.eligibility.alternatives[0]).toMatch(/Świadczenie rodzicielskie/);
  });

  it('zlecenie bez informacji o ubezpieczeniu: brakuje danych, bez kwot', () => {
    const r = calculateBenefitScenario({ ...base, employment: 'civil_contract', sicknessInsurance: 'unknown' });
    expect(r.eligibility.status).toBe('unknown');
    expect(r.eligibility.missing).toHaveLength(1);
    expect(r.amounts).toBeUndefined();
  });

  it('zaległość przy dobrowolnym ubezpieczeniu daje ostrzeżenie', () => {
    const r = calculateBenefitScenario({ ...base, employment: 'self_employed', sicknessInsurance: 'yes', arrearsAmount: 1200 });
    expect(r.eligibility.status).toBe('eligible');
    expect(r.eligibility.warnings.join(' ')).toMatch(/Zaległość/);
  });

  it('brak wynagrodzenia przy ustalonym prawie → błąd pola', () => {
    expect(() => calculateBenefitScenario({ ...base, averageMonthlyGross: 0 })).toThrow(BenefitInputError);
  });
});

describe('kalkulator świadczeń – okresy', () => {
  it('układa urlopy jeden po drugim i oddaje 9 tygodni drugiemu rodzicowi', () => {
    const r = calculateBenefitScenario(base);
    expect(r.periods.map((p) => [p.who, p.startDate, p.endDate, p.weeks])).toEqual([
      ['me', '2026-09-03', '2027-01-20', 20],
      ['me', '2027-01-21', '2027-09-01', 32],
      ['partner', '2027-09-02', '2027-11-03', 9],
    ]);
    expect(r.paternity?.deadline).toBe('2027-09-02');
  });

  it('bez drugiego rodzica 9 tygodni przepada', () => {
    const r = calculateBenefitScenario({ ...base, partnerParentalWeeks: 0 });
    expect(r.myParentalWeeks).toBe(32);
    expect(r.unusedParentalWeeks).toBe(9);
  });

  it('bliźnięta i „Za życiem” wydłużają urlopy', () => {
    const r = calculateBenefitScenario({ ...base, childrenCount: 2, zaZyciem: true });
    expect(r.periods[0].weeks).toBe(31);
    expect(r.parental.totalWeeks).toBe(67);
  });

  it('rodzina zastępcza: granica 7 lat, a przy odroczeniu szkoły 10 lat', () => {
    const foster = { ...base, kind: 'foster' as const, eventDate: '2026-11-01', childBirthDate: '2018-05-11' };
    expect(() => calculateBenefitScenario(foster)).toThrow(/7 lat/);
    const deferred = calculateBenefitScenario({ ...foster, schoolDeferral: true });
    expect(deferred.periods[0].kind).toBe('adoption_maternity');
    expect(deferred.periods[0].weeks).toBe(20);
  });
});

describe('kalkulator świadczeń – dane z profilu DEMO', () => {
  it('P01 (etat): narodziny Zosi, średnia z 12 mies., płaci pracodawca', () => {
    const input = scenarioDefaultsFromProfile(profile('P01'), today);
    expect(input).toMatchObject({ kind: 'birth', eventDate: '2026-09-03', employment: 'employment_contract', benefitPayer: 'employer' });
    expect(input.averageMonthlyGross).toBe(7200);
    expect(calculateBenefitScenario(input).eligibility.status).toBe('eligible');
  });

  it('P04 (studentka w ciąży): nie przysługuje', () => {
    const input = scenarioDefaultsFromProfile(profile('P04'), today);
    expect(input.kind).toBe('pregnancy');
    expect(calculateBenefitScenario(input).eligibility.status).toBe('not_eligible');
  });

  it('P05 (bliźnięta): dwoje dzieci z jednego porodu', () => {
    expect(scenarioDefaultsFromProfile(profile('P05'), today).childrenCount).toBe(2);
  });
});
