import { pl } from '../../shared/i18n/pl';
import { formatShortDate } from '../../shared/lib/date';
import type { BadgeTone } from '../../shared/ui/Badge';
import type { RuleResult, Urgency } from '../types';

/** „za 4 dni”, „dziś”, „jutro”, „po terminie 3 dni”, „do 12.05.2027”. */
export function deadlineLabel(daysLeft: number | undefined, deadlineDate: Date | undefined): string {
  if (daysLeft === undefined || !deadlineDate) return pl.deadline.none;
  if (daysLeft < 0) return pl.deadline.overdue(-daysLeft);
  if (daysLeft === 0) return pl.deadline.today;
  if (daysLeft === 1) return pl.deadline.tomorrow;
  if (daysLeft <= 30) return pl.deadline.inDays(daysLeft);
  return pl.deadline.until(formatShortDate(deadlineDate));
}

export function urgencyTone(urgency: Urgency): BadgeTone {
  switch (urgency) {
    case 'overdue':
      return 'danger';
    case 'urgent':
      return 'warning';
    case 'soon':
      return 'info';
    default:
      return 'neutral';
  }
}

export function eligibilityLabel(result: RuleResult): string {
  return result === 'met' ? pl.documents.eligibilityMet : result === 'unmet' ? pl.documents.eligibilityUnmet : pl.documents.eligibilityUnknown;
}

export function eligibilityTone(result: RuleResult): BadgeTone {
  return result === 'met' ? 'success' : result === 'unmet' ? 'danger' : 'warning';
}
