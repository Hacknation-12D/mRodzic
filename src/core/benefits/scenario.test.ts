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

  it('JDG: zadłużenie > 1% minimalnego wynagrodzenia w dniu porodu – brak prawa do czasu spłaty (art. 2a)', () => {
    const r = calculateBenefitScenario({ ...base, employment: 'self_employed', sicknessInsurance: 'yes', arrearsAmount: 1200 });
    expect(r.eligibility.status).toBe('not_eligible');
    expect(r.eligibility.reasons.join(' ')).toMatch(/art\. 2a/);
    expect(r.eligibility.warnings.join(' ')).toMatch(/6 miesięcy/);
    expect(r.amounts).toBeUndefined();
  });

  it('JDG: zadłużenie do 48,06 zł nie odbiera prawa; w ciąży tylko ostrzeżenie', () => {
    expect(calculateBenefitScenario({ ...base, employment: 'self_employed', sicknessInsurance: 'yes', arrearsAmount: 48.06 }).eligibility.status).toBe('eligible');
    const pregnant = calculateBenefitScenario({ ...base, kind: 'pregnancy', employment: 'self_employed', sicknessInsurance: 'yes', arrearsAmount: 725 });
    expect(pregnant.eligibility.status).toBe('eligible');
    expect(pregnant.eligibility.warnings.join(' ')).toMatch(/Spłać ją przed porodem/);
  });

  it('zlecenie: zaległość nie dotyczy (składki opłaca zleceniodawca)', () => {
    expect(calculateBenefitScenario({ ...base, employment: 'civil_contract', sicknessInsurance: 'yes', arrearsAmount: 900 }).eligibility.status).toBe('eligible');
  });

  it('art. 30: ubezpieczenie ustało w ciąży przez likwidację pracodawcy – zasiłek przysługuje, wypłaca ZUS', () => {
    const r = calculateBenefitScenario({
      ...base, kind: 'pregnancy', employment: 'unemployed', sicknessInsurance: 'no', eventDate: '2027-01-10', averageMonthlyGross: 5200,
      insuranceEnded: { until: '2026-10-31', reason: 'liquidation' },
    });
    expect(r.eligibility.status).toBe('eligible');
    expect(r.eligibility.reasons.join(' ')).toMatch(/art\. 30 ust\. 1/);
    expect(r.eligibility.reasons.join(' ')).toMatch(/do dnia porodu/i);
    expect(r.payer).toBe('zus');
    expect(r.base?.base).toBeCloseTo(5200 * (1 - 0.1371), 2);
  });

  it('art. 30: zwykłe ustanie umowy przed porodem – brak prawa, z alternatywą', () => {
    const r = calculateBenefitScenario({
      ...base, kind: 'pregnancy', employment: 'unemployed', sicknessInsurance: 'no', eventDate: '2027-01-10',
      insuranceEnded: { until: '2026-10-31', reason: 'other' },
    });
    expect(r.eligibility.status).toBe('not_eligible');
    expect(r.eligibility.alternatives).toHaveLength(1);
  });

  it('wariant 81,5%: termin 21 dni po porodzie', () => {
    const inTime = calculateBenefitScenario({ ...base, asOf: '2026-09-24' });
    expect(inTime).toMatchObject({ upfrontDeadline: '2026-09-24', upfrontDeadlinePassed: false });
    const late = calculateBenefitScenario({ ...base, asOf: '2026-11-21' });
    expect(late.upfrontDeadlinePassed).toBe(true);
    expect(late.notes.join(' ')).toMatch(/minął 24\.09\.2026/);
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

  it('P01: poród 3.09, termin na 81,5% minął 24.09 – domyślnie 100% + 70%', () => {
    const input = scenarioDefaultsFromProfile(profile('P01'), today);
    expect(input.upfrontApplication).toBe(false);
    expect(calculateBenefitScenario(input).upfrontDeadlinePassed).toBe(true);
  });

  it('P02 (JDG w ciąży, 725 zł zaległości): prawo jest, ale ostrzeżenie o spłacie przed porodem', () => {
    const r = calculateBenefitScenario(scenarioDefaultsFromProfile(profile('P02'), today));
    expect(r.eligibility.status).toBe('eligible');
    expect(r.eligibility.warnings.join(' ')).toMatch(/725,00 zł/);
  });

  it('P03 (zlecenie z dobrowolnym chorobowym): zasiłek macierzyński bez okresu wyczekiwania', () => {
    expect(calculateBenefitScenario(scenarioDefaultsFromProfile(profile('P03'), today)).eligibility.status).toBe('eligible');
  });

  it('P09 (likwidacja pracodawcy w ciąży): zasiłek przysługuje z art. 30, wypłaca ZUS', () => {
    const r = calculateBenefitScenario(scenarioDefaultsFromProfile(profile('P09'), today));
    expect(r.eligibility.status).toBe('eligible');
    expect(r.payer).toBe('zus');
  });
});

describe('kalkulator świadczeń – oboje rodzice i sytuacje szczególne', () => {
  const partner = { employment: 'employment_contract' as const, sicknessInsurance: 'yes' as const, averageMonthlyGross: 8000 };

  it('drugi rodzic: własna podstawa, 9 tyg. rodzicielskiego (70%) i ojcowski (100%)', () => {
    const r = calculateBenefitScenario({ ...base, partner });
    expect(r.partner?.eligibility.status).toBe('eligible');
    // 8000 − 13,71% = 6903,20 zł
    expect(r.partner?.base?.base).toBeCloseTo(6903.2, 2);
    expect(r.partner?.amounts?.segments.map((s) => [s.leave, s.weeks, s.rate])).toEqual([
      ['parental_other_parent', 9, 0.7],
      ['paternity', 2, 1],
    ]);
    expect(r.familyTotal).toBeCloseTo((r.amounts?.totalAmount ?? 0) + (r.partner?.amounts?.totalAmount ?? 0), 2);
  });

  it('ojciec przejmuje macierzyński po 14 tygodniach – matce zostaje 14, ojcu 6 tyg. za 100%', () => {
    const r = calculateBenefitScenario({ ...base, partner, maternityTransfer: { weeks: 6, reason: 'standard' } });
    expect(r.periods.slice(0, 2).map((p) => [p.who, p.kind, p.weeks])).toEqual([
      ['me', 'maternity', 14],
      ['partner', 'maternity', 6],
    ]);
    expect(r.partner?.amounts?.segments[0]).toMatchObject({ leave: 'maternity', weeks: 6, rate: 1 });
    // Rodzicielski zaczyna się po części ojca.
    expect(r.periods[1]).toMatchObject({ startDate: '2026-12-10', endDate: '2027-01-20' });
    expect(r.periods[2].startDate).toBe('2027-01-21');
  });

  it('ojciec nie przejmie więcej niż pozwala minimum matki; po śmierci matki – całość', () => {
    expect(calculateBenefitScenario({ ...base, partner, maternityTransfer: { weeks: 10, reason: 'standard' } }).periods[1].weeks).toBe(6);
    expect(calculateBenefitScenario({ ...base, partner, maternityTransfer: { weeks: 12, reason: 'hospital' } }).periods[1].weeks).toBe(12);
    expect(calculateBenefitScenario({ ...base, partner, maternityTransfer: { weeks: 20, reason: 'death' } }).periods[1].weeks).toBe(20);
  });

  it('uzupełniający urlop macierzyński: wcześniak z 30. tyg., 40 dni w szpitalu → 6 tyg. po macierzyńskim (100%)', () => {
    const r = calculateBenefitScenario({
      ...base,
      supplementary: { gestationalWeek: 30, birthWeightGrams: 1400, hospitalFrom: '2026-09-03', hospitalTo: '2026-10-12', takenBy: 'me' },
    });
    expect(r.supplementary).toMatchObject({ eligible: true, weeks: 6 });
    expect(r.periods[1]).toMatchObject({ kind: 'supplementary_maternity', startDate: '2027-01-21', weeks: 6 });
    expect(r.amounts?.segments.find((s) => s.leave === 'supplementary_maternity')?.rate).toBe(1);
  });

  it('ryzyko: umowa terminowa kończąca się po 3. miesiącu ciąży jest przedłużana do porodu', () => {
    const r = calculateBenefitScenario({ ...base, kind: 'pregnancy', eventDate: '2027-03-01', contractEndDate: '2026-12-31' });
    expect(r.eligibility.status).toBe('eligible');
    expect(r.eligibility.warnings.join(' ')).toContain('art. 177');
  });

  it('ryzyko: umowa kończąca się przed upływem 3. miesiąca ciąży – brak prawa w dniu porodu', () => {
    const r = calculateBenefitScenario({ ...base, kind: 'pregnancy', eventDate: '2027-06-01', contractEndDate: '2026-09-30' });
    expect(r.eligibility.status).toBe('not_eligible');
    expect(r.amounts).toBeUndefined();
  });

  it('ryzyko: ubezpieczenie zaczęte w ciąży i podwyższona podstawa – ostrzeżenia, bez odmowy', () => {
    const r = calculateBenefitScenario({ ...base, insuranceStartDate: '2026-06-01', baseRaisedInPregnancy: true });
    expect(r.eligibility.status).toBe('eligible');
    expect(r.eligibility.warnings.some((w) => w.includes('pozoru'))).toBe(true);
    expect(r.eligibility.warnings.some((w) => w.includes('niższą podstawę'))).toBe(true);
  });
});
