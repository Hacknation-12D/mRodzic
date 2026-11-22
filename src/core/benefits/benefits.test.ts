import { describe, expect, it } from 'vitest';

import {
  afterSocialContributions,
  BenefitInputError,
  calculateAdoptionMaternityLeave,
  calculateBenefitBase,
  calculateMaternityBenefitAmount,
  calculateMaternityLeave,
  calculateParentalLeave,
  calculatePaternityLeave,
  calculateSicknessPregnancy,
  calculateSupplementaryMaternityLeave,
  employerSickPayLimit,
  MAX_BENEFIT_BASE_NON_EMPLOYEE_2026,
  MIN_BENEFIT_BASE_2026,
  type MonthlyPay,
} from './index';

const months = (n: number, fixedGross: number): MonthlyPay[] => Array.from({ length: n }, () => ({ fixedGross }));

describe('common', () => {
  it('matches the 2026 limits from the PDF', () => {
    expect(afterSocialContributions(4806)).toBe(MIN_BENEFIT_BASE_2026);
    expect(afterSocialContributions(23550)).toBe(MAX_BENEFIT_BASE_NON_EMPLOYEE_2026);
  });
});

describe('calculateBenefitBase – employee', () => {
  it('averages 12 months and deducts 13.71%', () => {
    const r = calculateBenefitBase({ insuredType: 'employee', months: months(12, 6000) });
    expect(r.base).toBe(5177.4);
    expect(r.dailyBase).toBe(172.58);
    expect(r.method).toBe('twelve_months');
  });

  it('uses only the last 12 months', () => {
    const r = calculateBenefitBase({ insuredType: 'employee', months: [{ fixedGross: 1 }, ...months(12, 6000)] });
    expect(r.base).toBe(5177.4);
    expect(r.monthsCounted).toBe(12);
  });

  it('excludes a month worked less than half and supplements one worked at least half', () => {
    const excluded = calculateBenefitBase({
      insuredType: 'employee',
      months: [...months(11, 6000), { fixedGross: 6000, workingDays: 21, daysWorked: 10 }],
    });
    expect(excluded.base).toBe(5177.4);
    expect(excluded.monthsCounted).toBe(11);

    const supplemented = calculateBenefitBase({
      insuredType: 'employee',
      months: [{ fixedGross: 6000 }, { fixedGross: 6000, variableGross: 750, workingDays: 20, daysWorked: 15 }],
    });
    // (6000 + 6000 + 750/15*20) / 2 = 6500 → × 0,8629
    expect(supplemented.base).toBe(5608.85);
    expect(supplemented.method).toBe('shorter_period');
    expect(supplemented.months[1].status).toBe('supplemented');
  });

  it('adds 1/12 of quarterly and annual bonuses', () => {
    const r = calculateBenefitBase({
      insuredType: 'employee',
      months: months(12, 6000),
      quarterlyBonusesGross: [1200, 1200, 1200, 1200],
      annualBonusGross: 6000,
    });
    expect(r.bonusesMonthlyShare).toBe(900);
    expect(r.base).toBe(5954.01);
  });

  it('applies the minimum base proportionally to the employment fraction', () => {
    expect(calculateBenefitBase({ insuredType: 'employee', months: months(12, 3000) }).base).toBe(4147.1);
    const half = calculateBenefitBase({ insuredType: 'employee', months: months(12, 2400), employmentFraction: 0.5 });
    expect(half.base).toBe(2073.55);
    expect(half.minimumApplied).toBe(true);
  });

  it('uses the contract salary in the first month of work', () => {
    const r = calculateBenefitBase({ insuredType: 'employee', months: [], contractMonthlyGross: 7000 });
    expect(r.base).toBe(6040.3);
    expect(r.method).toBe('first_month_contract');
  });

  it('reuses the previous base when the break is shorter than 1 month', () => {
    const prev = { base: 5000, previousBenefitEndDate: '2026-01-31' };
    const reuse = calculateBenefitBase({
      insuredType: 'employee',
      months: months(12, 6000),
      previousBenefit: { ...prev, newBenefitStartDate: '2026-02-28' },
    });
    expect(reuse.method).toBe('previous_base');
    expect(reuse.base).toBe(5000);

    const fresh = calculateBenefitBase({
      insuredType: 'employee',
      months: months(12, 6000),
      previousBenefit: { ...prev, newBenefitStartDate: '2026-03-01' },
    });
    expect(fresh.base).toBe(5177.4);
  });

  it('throws without months and contract salary', () => {
    expect(() => calculateBenefitBase({ insuredType: 'employee', months: [] })).toThrow(BenefitInputError);
  });
});

describe('calculateBenefitBase – non-employee', () => {
  it('caps the base at 20 321,30 zł', () => {
    const r = calculateBenefitBase({ insuredType: 'non_employee', monthlyIncomes: Array(12).fill(30000) });
    expect(r.base).toBe(20321.3);
    expect(r.capApplied).toBe(true);
  });

  it('has no minimum', () => {
    const r = calculateBenefitBase({ insuredType: 'non_employee', monthlyIncomes: [1000, 1000] });
    expect(r.base).toBe(862.9);
  });
});

describe('calculateSicknessPregnancy', () => {
  const base = { benefitBase: 6000, insuranceStatus: 'insured' as const, insuredType: 'employee' as const };

  it('employer pays 33 days, then ZUS, all at 100%', () => {
    const r = calculateSicknessPregnancy({
      ...base,
      birthYear: 1996,
      periods: [{ from: '2026-03-01', to: '2026-05-31', pregnancy: true }],
    });
    expect(r.totals).toEqual({
      employerDays: 33,
      employerAmount: 6600,
      zusDays: 59,
      zusAmount: 11800,
      unpaidDays: 0,
      totalAmount: 18400,
    });
    expect(r.segments[0]).toMatchObject({ from: '2026-03-01', to: '2026-04-02', payer: 'employer' });
    expect(r.segments[1]).toMatchObject({ from: '2026-04-03', payer: 'zus', rate: 1 });
  });

  it('switches to 14 days from the year after turning 50', () => {
    expect(employerSickPayLimit(2026, 1976)).toBe(33); // 50 lat w 2026
    expect(employerSickPayLimit(2026, 1975)).toBe(14); // 50 lat w 2025
  });

  it('respects employer days already used and restarts the limit in a new year', () => {
    const r = calculateSicknessPregnancy({
      ...base,
      birthYear: 1996,
      employerDaysUsedBefore: 20,
      periods: [{ from: '2026-12-01', to: '2027-02-28', pregnancy: true }],
    });
    expect(r.employerDaysByYear[2026]).toEqual({ used: 33, limit: 33 });
    expect(r.employerDaysByYear[2027]).toEqual({ used: 33, limit: 33 });
    expect(r.segments.map((s) => [s.from, s.to, s.payer])).toEqual([
      ['2026-12-01', '2026-12-13', 'employer'],
      ['2026-12-14', '2026-12-31', 'zus'],
      ['2027-01-01', '2027-02-02', 'employer'],
      ['2027-02-03', '2027-02-28', 'zus'],
    ]);
  });

  it('stops paying after 270 days in pregnancy', () => {
    const r = calculateSicknessPregnancy({
      ...base,
      birthYear: 1996,
      periods: [{ from: '2026-01-01', to: '2026-12-31', pregnancy: true }],
    });
    expect(r.benefitPeriods[0]).toMatchObject({ countedDays: 365, limitDays: 270, remainingDays: 0 });
    expect(r.totals.unpaidDays).toBe(95);
    expect(r.totals.employerDays + r.totals.zusDays).toBe(270);
  });

  it('starts a new benefit period when pregnancy incapacity follows a break', () => {
    const r = calculateSicknessPregnancy({
      ...base,
      birthYear: 1996,
      periods: [
        { from: '2026-01-01', to: '2026-01-20', pregnancy: false },
        { from: '2026-02-01', to: '2026-02-10', pregnancy: true },
      ],
    });
    expect(r.benefitPeriods).toHaveLength(2);
    expect(r.benefitPeriods[1].startReason).toBe('pregnancy_after_break');
  });

  it('joins non-pregnancy periods with a gap ≤ 60 days, splits above', () => {
    const joined = calculateSicknessPregnancy({
      ...base,
      birthYear: 1996,
      periods: [
        { from: '2026-01-01', to: '2026-01-10', pregnancy: false },
        { from: '2026-03-12', to: '2026-03-15', pregnancy: false }, // przerwa 60 dni
      ],
    });
    expect(joined.benefitPeriods).toHaveLength(1);
    expect(joined.benefitPeriods[0].countedDays).toBe(14);

    const split = calculateSicknessPregnancy({
      ...base,
      birthYear: 1996,
      periods: [
        { from: '2026-01-01', to: '2026-01-10', pregnancy: false },
        { from: '2026-03-13', to: '2026-03-15', pregnancy: false }, // przerwa 61 dni
      ],
    });
    expect(split.benefitPeriods).toHaveLength(2);
  });

  it('after insurance ended ZUS pays from day one', () => {
    const r = calculateSicknessPregnancy({
      benefitBase: 6000,
      insuranceStatus: 'after_insurance_ended',
      insuredType: 'employee',
      periods: [{ from: '2026-03-01', to: '2026-03-10', pregnancy: true }],
    });
    expect(r.totals.employerDays).toBe(0);
    expect(r.totals.zusAmount).toBe(2000);
  });

  it('rejects overlapping periods', () => {
    expect(() =>
      calculateSicknessPregnancy({
        ...base,
        birthYear: 1996,
        periods: [
          { from: '2026-01-01', to: '2026-01-10', pregnancy: true },
          { from: '2026-01-10', to: '2026-01-12', pregnancy: true },
        ],
      }),
    ).toThrow(BenefitInputError);
  });
});

describe('calculateMaternityLeave', () => {
  it.each([
    [1, 20],
    [2, 31],
    [3, 33],
    [4, 35],
    [5, 37],
    [7, 37],
  ])('%i children → %i weeks', (children, weeks) => {
    expect(calculateMaternityLeave({ childrenCount: children }).weeks).toBe(weeks);
  });

  it('computes the end date', () => {
    const r = calculateMaternityLeave({ childrenCount: 1, startDate: '2026-01-01' });
    expect(r.endDate).toBe('2026-05-20');
    expect(r.nextDayAfter).toBe('2026-05-21');
  });
});

describe('calculateAdoptionMaternityLeave', () => {
  it('uses the table length for a young child', () => {
    const r = calculateAdoptionMaternityLeave({ startDate: '2026-01-01', childBirthDates: ['2020-01-01'] });
    expect(r).toMatchObject({ weeks: 20, days: 140, limitedByChildAge: false, minimumApplied: false });
  });

  it('ends the day before the 14th birthday', () => {
    const r = calculateAdoptionMaternityLeave({ startDate: '2026-01-01', childBirthDates: ['2012-04-15'] });
    expect(r).toMatchObject({ days: 104, endDate: '2026-04-14', limitedByChildAge: true, minimumApplied: false });
  });

  it('never goes below 9 weeks', () => {
    const r = calculateAdoptionMaternityLeave({ startDate: '2026-01-01', childBirthDates: ['2012-03-01'] });
    expect(r).toMatchObject({ days: 63, weeks: 9, minimumApplied: true });
  });

  it('skips children over 14 and rejects when none qualifies', () => {
    const r = calculateAdoptionMaternityLeave({ startDate: '2026-01-01', childBirthDates: ['2011-01-01', '2020-01-01', '2021-01-01'] });
    expect(r.eligibleChildrenCount).toBe(2);
    expect(r.tableWeeks).toBe(31);
    expect(() => calculateAdoptionMaternityLeave({ startDate: '2026-01-01', childBirthDates: ['2011-12-01'] })).toThrow(
      BenefitInputError,
    );
  });
});

describe('calculateSupplementaryMaternityLeave', () => {
  it('case 3: before 28th week and ≤ 1000 g, rounds partial weeks up', () => {
    const r = calculateSupplementaryMaternityLeave({
      birthDate: '2026-01-01',
      gestationalWeek: 26,
      children: [{ birthWeightGrams: 900, hospitalizations: [{ from: '2026-01-01', to: '2026-03-15' }] }],
    });
    expect(r).toMatchObject({ caseNumber: 3, hospitalDaysCounted: 74, weeks: 11, eligible: true });
  });

  it('case 1: caps at 15 weeks', () => {
    const r = calculateSupplementaryMaternityLeave({
      birthDate: '2026-01-01',
      gestationalWeek: 26,
      children: [{ birthWeightGrams: 1200, hospitalizations: [{ from: '2026-01-01', to: '2026-05-01' }] }],
    });
    expect(r).toMatchObject({ caseNumber: 1, maxWeeks: 15, weeks: 15 });
  });

  it('sums several hospital stays', () => {
    const r = calculateSupplementaryMaternityLeave({
      birthDate: '2026-01-01',
      gestationalWeek: 32,
      children: [
        {
          birthWeightGrams: 1500,
          hospitalizations: [
            { from: '2026-01-01', to: '2026-01-10' },
            { from: '2026-02-01', to: '2026-02-05' },
          ],
        },
      ],
    });
    expect(r).toMatchObject({ caseNumber: 4, hospitalDaysCounted: 15, weeks: 3 });
  });

  it('case 5: counts from the 5th day and requires 2 consecutive days between day 5 and 28', () => {
    const ok = calculateSupplementaryMaternityLeave({
      birthDate: '2026-01-01',
      gestationalWeek: 39,
      children: [{ birthWeightGrams: 3200, hospitalizations: [{ from: '2026-01-01', to: '2026-01-08' }] }],
    });
    expect(ok).toMatchObject({ caseNumber: 5, eligible: true, hospitalDaysCounted: 3, weeks: 1 });

    const notOk = calculateSupplementaryMaternityLeave({
      birthDate: '2026-01-01',
      gestationalWeek: 39,
      children: [{ birthWeightGrams: 3200, hospitalizations: [{ from: '2026-01-01', to: '2026-01-05' }] }],
    });
    expect(notOk).toMatchObject({ eligible: false, weeks: 0 });
  });

  it('case 6: multiple birth → lowest weight and longest stay', () => {
    const r = calculateSupplementaryMaternityLeave({
      birthDate: '2026-01-01',
      gestationalWeek: 30,
      maternityLeaveEndDate: '2026-08-05',
      children: [
        { birthWeightGrams: 1400, hospitalizations: [{ from: '2026-01-01', to: '2026-01-10' }] },
        { birthWeightGrams: 1800, hospitalizations: [{ from: '2026-01-01', to: '2026-01-30' }] },
      ],
    });
    expect(r).toMatchObject({
      multipleBirth: true,
      lowestBirthWeightGrams: 1400,
      decisiveChildIndex: 1,
      weeks: 5,
      startDate: '2026-08-06',
      endDate: '2026-09-09',
    });
  });
});

describe('calculateParentalLeave', () => {
  it.each([
    [1, false, 41],
    [2, false, 43],
    [1, true, 65],
    [3, true, 67],
  ])('%i children, Za życiem=%s → %i weeks', (n, zz, weeks) => {
    const r = calculateParentalLeave({ childrenCount: n, zaZyciem: zz });
    expect(r.totalWeeks).toBe(weeks);
    expect(r.maxWeeksForOneParent).toBe(weeks - 9);
  });

  it('validates the split between parents', () => {
    expect(calculateParentalLeave({ childrenCount: 1, zaZyciem: false, plan: { firstParentWeeks: 32, secondParentWeeks: 9 } }).plan?.valid).toBe(
      true,
    );
    const bad = calculateParentalLeave({ childrenCount: 1, zaZyciem: false, plan: { firstParentWeeks: 33, secondParentWeeks: 8 } });
    expect(bad.plan?.valid).toBe(false);
  });
});

describe('calculatePaternityLeave', () => {
  it('birth: deadline is the day before the first birthday', () => {
    const r = calculatePaternityLeave({
      mode: 'birth',
      childBirthDate: '2026-01-15',
      parts: [
        { start: '2026-02-01', weeks: 1 },
        { start: '2026-06-01', weeks: 1 },
      ],
    });
    expect(r.deadline).toBe('2027-01-14');
    expect(r.valid).toBe(true);
    expect(r.unusedWeeks).toBe(0);
  });

  it('rejects 3 parts, too many weeks and parts past the deadline', () => {
    const r = calculatePaternityLeave({
      mode: 'birth',
      childBirthDate: '2026-01-15',
      parts: [
        { start: '2026-02-01', weeks: 1 },
        { start: '2026-03-01', weeks: 1 },
        { start: '2027-01-10', weeks: 1 },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.issues?.length).toBe(3);
  });

  it('adoption: 12 months from the court decision, but not after the 14th birthday', () => {
    const r = calculatePaternityLeave({ mode: 'adoption', childBirthDate: '2013-06-01', adoptionFinalDate: '2026-09-01' });
    expect(r.earliestStart).toBe('2026-09-01');
    expect(r.deadline).toBe('2027-05-31');
  });
});

describe('calculateMaternityBenefitAmount', () => {
  const segments = [
    { leave: 'maternity' as const, weeks: 20 },
    { leave: 'parental' as const, weeks: 32 },
  ];

  it('separate applications: 100% + 70%', () => {
    const r = calculateMaternityBenefitAmount({ benefitBase: 6000, segments, upfrontApplication: false });
    expect(r.segments.map((s) => [s.rate, s.dailyAmount, s.amount])).toEqual([
      [1, 200, 28000],
      [0.7, 140, 31360],
    ]);
    expect(r.totalAmount).toBe(59360);
  });

  it('upfront application: 81.5% for everything, 70% for the other parent part', () => {
    const r = calculateMaternityBenefitAmount({
      benefitBase: 6000,
      segments: [...segments, { leave: 'parental_other_parent', weeks: 9 }],
      upfrontApplication: true,
    });
    expect(r.segments.map((s) => s.rate)).toEqual([0.815, 0.815, 0.7]);
    expect(r.segments[0].dailyAmount).toBe(163);
    expect(r.segments[0].monthlyAmount).toBe(4890);
    expect(r.totalAmount).toBe(163 * 364 + 140 * 63);
    expect(r.variantComparison.difference).toBe(-28);
  });

  it('supplementary and paternity are always 100%', () => {
    const r = calculateMaternityBenefitAmount({
      benefitBase: 6000,
      segments: [
        { leave: 'supplementary_maternity', weeks: 3 },
        { leave: 'paternity', weeks: 2 },
      ],
      upfrontApplication: true,
    });
    expect(r.segments.map((s) => s.rate)).toEqual([1, 1]);
  });
});
