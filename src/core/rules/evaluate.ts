import type { Op, Rule, RuleResult, RuleValue } from '../types';
import { UNKNOWN_ITEM, type FactValue, type Facts } from './buildFacts';

type Scalar = string | number | boolean;

/** AND trójwartościowy: unmet > unknown > met. Pusta lista = met. */
export function combineAll(results: RuleResult[]): RuleResult {
  if (results.includes('unmet')) return 'unmet';
  if (results.includes('unknown')) return 'unknown';
  return 'met';
}

/** OR trójwartościowy: met > unknown > unmet. Pusta lista = unmet. */
export function combineAny(results: RuleResult[]): RuleResult {
  if (results.includes('met')) return 'met';
  if (results.includes('unknown')) return 'unknown';
  return 'unmet';
}

export function negate(result: RuleResult): RuleResult {
  return result === 'met' ? 'unmet' : result === 'unmet' ? 'met' : 'unknown';
}

const bool = (b: boolean): RuleResult => (b ? 'met' : 'unmet');

function compareScalar(actual: Scalar, op: Exclude<Op, 'exists' | 'notExists'>, expected: RuleValue | undefined): RuleResult | null {
  switch (op) {
    case 'eq':
      return bool(actual === expected);
    case 'neq':
      return bool(actual !== expected);
    case 'in':
      return Array.isArray(expected) ? bool(expected.includes(actual)) : null;
    case 'notIn':
      return Array.isArray(expected) ? bool(!expected.includes(actual)) : null;
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      if (typeof actual !== 'number' || typeof expected !== 'number') return null;
      if (op === 'lt') return bool(actual < expected);
      if (op === 'lte') return bool(actual <= expected);
      if (op === 'gt') return bool(actual > expected);
      return bool(actual >= expected);
    }
  }
}

function evaluateLeaf(value: FactValue | undefined, op: Op, expected: RuleValue | undefined): RuleResult {
  const missing = value === undefined || (Array.isArray(value) && value.length === 0);
  if (op === 'exists') return bool(!missing);
  if (op === 'notExists') return bool(missing);
  if (missing) return 'unknown';

  if (Array.isArray(value)) {
    // Listy (np. anyParent.employment): eq/in/lt… = „którykolwiek element pasuje”,
    // neq/notIn = „żaden element nie pasuje”. Element UNKNOWN_ITEM = brak danych o jednym z rodziców.
    const known = value.filter((v) => v !== UNKNOWN_ITEM);
    const hasUnknown = known.length !== value.length;
    const negative = op === 'neq' || op === 'notIn';
    const positiveOp = op === 'neq' ? 'eq' : op === 'notIn' ? 'in' : op;
    const matches = known.map((v) => compareScalar(v, positiveOp, expected));
    if (matches.includes(null)) return 'unknown';
    const anyMatch = matches.includes('met');
    if (anyMatch) return negative ? 'unmet' : 'met';
    if (hasUnknown) return 'unknown';
    return negative ? 'met' : 'unmet';
  }

  return compareScalar(value, op, expected) ?? 'unknown';
}

/** Ewaluacja reguły w logice trójwartościowej (met / unmet / unknown). */
export function evaluate(rule: Rule, facts: Facts): RuleResult {
  if ('all' in rule) return combineAll(rule.all.map((r) => evaluate(r, facts)));
  if ('any' in rule) return combineAny(rule.any.map((r) => evaluate(r, facts)));
  if ('not' in rule) return negate(evaluate(rule.not, facts));
  return evaluateLeaf(facts[rule.fact], rule.op, rule.value);
}

/** Brak reguły = met. */
export function evaluateOptional(rule: Rule | undefined, facts: Facts): RuleResult {
  return rule ? evaluate(rule, facts) : 'met';
}
