import { describe, expect, it } from 'vitest';

import { calculatePregnancyScenario, type PregnancyScenarioInput } from './pregnancyScenario';

const base: PregnancyScenarioInput = {
  employment: 'employment_contract',
  sicknessInsurance: 'yes',
  insuranceSince: '2024-01-01',
  waitingException: false,
  averageMonthlyGross: 6000,
  birthYear: 1994,
  employerDaysUsedBefore: 0,
  periods: [{ from: '2026-03-01', to: '2026-04-29', pregnancy: true }],
};

describe('świadczenia w ciąży', () => {
  it('pracownica: 33 dni od pracodawcy, potem ZUS – wszystko 100% przy kodzie B', () => {
    const r = calculatePregnancyScenario(base);
    expect(r.eligibility.status).toBe('eligible');
    expect(r.base).toBeCloseTo(5177.4, 2);
    expect(r.sickness?.totals).toMatchObject({ employerDays: 33, zusDays: 27 });
    expect(r.sickness?.segments.every((s) => s.rate === 1)).toBe(true);
    expect(r.remainingDays).toBe(270 - 60);
  });

  it('zlecenie: okres wyczekiwania 90 dni – dni przed jego upływem nie są płatne', () => {
    const r = calculatePregnancyScenario({ ...base, employment: 'civil_contract', insuranceSince: '2026-01-15' });
    expect(r.waitingEnds).toBe('2026-04-15');
    expect(r.sickness?.totals).toMatchObject({ employerDays: 0, zusDays: 15 });
    expect(r.eligibility.warnings.join(' ')).toContain('Okres wyczekiwania');
  });

  it('studentka: brak tytułu – nie przysługuje', () => {
    expect(calculatePregnancyScenario({ ...base, employment: 'student' }).eligibility.status).toBe('not_eligible');
  });

  it('wyczerpanie 270 dni → informacja o świadczeniu rehabilitacyjnym', () => {
    const r = calculatePregnancyScenario({ ...base, periods: [{ from: '2026-01-01', to: '2026-10-31', pregnancy: true }] });
    expect(r.remainingDays).toBe(0);
    expect(r.rehabilitation.applies).toBe(true);
  });

  it('likwidacja pracodawcy w ciąży: zasiłek w wysokości macierzyńskiego do dnia porodu', () => {
    const r = calculatePregnancyScenario({ ...base, periods: [], dueDate: '2026-12-31', jobLoss: { date: '2026-10-31', reason: 'liquidation' } });
    expect(r.maternityLevel).toMatchObject({ from: '2026-11-01', to: '2026-12-30', days: 60, dailyAmount: 172.58 });
  });
});
