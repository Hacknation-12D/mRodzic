import { afterEach, describe, expect, it } from 'vitest';

import { calculateMaternityLeave } from '../benefits/maternityLeave';
import { calculateParentalLeave } from '../benefits/parentalLeave';
import { benefitBaseFromAverageGross } from '../benefits/benefitBase';
import { evaluateApplication, legalRules } from '../applications/engine';
import {
  DEFAULT_LEGAL_PARAMETERS,
  debtThreshold,
  legal,
  maxBenefitBaseNonEmployee,
  minBenefitBase,
  resetLegalParameters,
  setLegalParameters,
} from './parameters';

afterEach(() => resetLegalParameters());

describe('parametry prawne', () => {
  it('wartości pochodne 2026 zgadzają się z załącznikiem ZUS', () => {
    expect(minBenefitBase()).toBe(4147.1);
    expect(maxBenefitBaseNonEmployee()).toBe(20321.3);
    expect(debtThreshold()).toBe(48.06);
  });

  it('zmiana parametru od razu zmienia wynik kalkulatorów', () => {
    expect(calculateMaternityLeave({ childrenCount: 1 }).weeks).toBe(20);
    const errors = setLegalParameters({ ...DEFAULT_LEGAL_PARAMETERS, version: 'test', maternityWeeks: [22, 31, 33, 35, 37], rates: { ...DEFAULT_LEGAL_PARAMETERS.rates, parental: 0.75 } });
    expect(errors).toEqual([]);
    expect(calculateMaternityLeave({ childrenCount: 1 }).weeks).toBe(22);
    expect(calculateParentalLeave({ childrenCount: 1, zaZyciem: false }).benefitRate).toBe(0.75);
    expect(legalRules().rates.parental).toBe(7500);
  });

  it('nowa płaca minimalna podnosi minimalną podstawę także we wniosku', () => {
    setLegalParameters({ ...DEFAULT_LEGAL_PARAMETERS, minimumWage: 5000 });
    expect(benefitBaseFromAverageGross(3000, 'employment_contract')).toBe(4314.5);
  });

  it('odrzuca zestaw niespójny i nie zmienia aktywnych wartości', () => {
    const errors = setLegalParameters({ ...DEFAULT_LEGAL_PARAMETERS, parentalNonTransferableWeeks: 50 });
    expect(errors.length).toBeGreaterThan(0);
    expect(legal().parentalNonTransferableWeeks).toBe(9);
    expect(setLegalParameters({ ...DEFAULT_LEGAL_PARAMETERS, rates: { ...DEFAULT_LEGAL_PARAMETERS.rates, full: 2 } }).length).toBeGreaterThan(0);
  });

  it('silnik wniosku stosuje minimalną podstawę (spójnie z kalkulatorem)', () => {
    const r = evaluateApplication({
      kind: 'maternity', eventDate: '2026-11-01', start: '2026-11-01', end: '2026-11-30', applicationDate: '2026-11-02',
      insurance: 'yes', insuranceSince: '2024-01-01', insuranceUntil: '', employment: 'employment_contract',
      baseGrossCents: 300000, baseConfirmed: true, childrenCount: 1, childBirthDate: '2026-11-01', upfront: false, reserved: false,
      part: 1, zaZyciem: false, schoolDeferral: false, debtCents: 0, debtAsOf: '', debtArrangementCurrent: false,
      disputedInsurance: false, verified: true, specialAfterInsurance: 'none', applicantRole: 'mother', lossDate: '',
    } as Parameters<typeof evaluateApplication>[0]);
    expect(r.status).toBe('eligible');
    expect(r.amount?.baseCents).toBe(414710);
  });
});
