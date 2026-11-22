import { describe, expect, it } from 'vitest';

import demoProfiles from '../../dev/dummyData/mrodzic_compat_profiles_v1.json';
import { getSeedBundle } from '../content/seedRepository';
import { getDocumentInstances, getTipsFor } from '../content/selectors';
import { ProfileSchema } from '../schemas/profile';
import { calculateBenefitScenario, type BenefitScenarioInput } from './scenario';
import { scenarioDefaultsFromProfile } from './scenarioDefaults';

const today = new Date('2026-11-21T12:00:00');
const p08 = ProfileSchema.parse(demoProfiles.find((p) => p.profileId === 'P08')?.profile);

const base: BenefitScenarioInput = {
  kind: 'birth',
  employment: 'employment_contract',
  sicknessInsurance: 'yes',
  averageMonthlyGross: 6000,
  eventDate: '2026-10-30',
  childrenCount: 1,
  zaZyciem: false,
  partnerParentalWeeks: 9,
  upfrontApplication: true,
};

describe('utrata dziecka – dokumenty i wskazówki (P08, martwe urodzenie)', () => {
  it('zostaje tylko urlop i zasiłek macierzyński, z właściwym wymiarem', () => {
    const docs = getDocumentInstances(getSeedBundle(), p08, {}, today, 'all').filter((d) => d.childId === 'P08-C1');
    expect(docs.map((d) => d.id)).toEqual(['urlop-macierzynski']);
    expect(docs[0].amountLabel).toMatch(/8 tygodni/);
  });

  it('nie pokazuje porad o opiece nad dzieckiem', () => {
    expect(getTipsFor(getSeedBundle(), p08, today, 'all')).toEqual([]);
  });
});

describe('utrata dziecka – kalkulator (art. 180 § 4–5 KP)', () => {
  it('martwe urodzenie: 8 tygodni macierzyńskiego po 100%, bez rodzicielskiego i ojcowskiego', () => {
    const r = calculateBenefitScenario({ ...base, loss: { kind: 'stillbirth', date: '2026-10-30' } });
    expect(r.loss).toBe(true);
    expect(r.periods.map((p) => [p.kind, p.startDate, p.endDate, p.weeks])).toEqual([['maternity', '2026-10-30', '2026-12-24', 8]]);
    expect(r.paternity).toBeUndefined();
    expect(r.unusedParentalWeeks).toBe(0);
    expect(r.amounts?.segments.map((s) => [s.leave, s.rate])).toEqual([['maternity', 1]]);
  });

  it('zgon po 8. tygodniu życia: urlop kończy się 7 dni od zgonu', () => {
    const r = calculateBenefitScenario({ ...base, loss: { kind: 'death', date: '2027-01-15' } });
    expect(r.periods).toHaveLength(1);
    expect(r.periods[0].endDate).toBe('2027-01-22');
  });

  it('profil P08 przekazuje stratę do kalkulatora', () => {
    const input = scenarioDefaultsFromProfile(p08, today);
    expect(input.loss).toEqual({ kind: 'stillbirth', date: '2026-10-30' });
    expect(calculateBenefitScenario(input).periods).toHaveLength(1);
  });
});
