import { deadlineLabel, urgencyTone } from '@/core/content/format';
import type { Urgency } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { Badge } from '@/shared/ui';

type Props = { daysLeft?: number; deadlineDate?: Date; urgency: Urgency };

export function DeadlineBadge({ daysLeft, deadlineDate, urgency }: Props) {
  const label = deadlineLabel(daysLeft, deadlineDate);
  return (
    <Badge
      label={label}
      tone={urgencyTone(urgency)}
      icon={urgency === 'overdue' ? 'alert-circle' : 'time-outline'}
      accessibilityLabel={`${pl.documents.deadlineLabel}: ${label}`}
    />
  );
}
