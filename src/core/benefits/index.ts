/**
 * Kalkulatory zasiłków (stan prawny 2026). Każdy plik = jeden kalkulator, czyste funkcje bez UI.
 * Błędne dane wejściowe → wyjątek BenefitInputError (z polem `field`).
 *
 * Typowy przepływ:
 *   calculateBenefitBase → base
 *   calculateMaternityLeave / calculateParentalLeave / ... → tygodnie
 *   calculateMaternityBenefitAmount({ benefitBase: base, segments, upfrontApplication }) → kwoty
 */
export * from './common';
export * from './benefitBase';
export * from './sicknessPregnancy';
export * from './maternityLeave';
export * from './adoptionMaternityLeave';
export * from './supplementaryMaternityLeave';
export * from './parentalLeave';
export * from './paternityLeave';
export * from './maternityBenefitAmount';
export * from './scenario';
export * from './scenarioDefaults';
