import { eligibilityLabel, eligibilityTone } from '@/core/content/format';
import type { RuleResult } from '@/core/types';
import { Badge } from '@/shared/ui';

const ICONS = { met: 'checkmark-circle', unmet: 'close-circle', unknown: 'help-circle' } as const;

export function EligibilityBadge({ result }: { result: RuleResult }) {
  return <Badge label={eligibilityLabel(result)} tone={eligibilityTone(result)} icon={ICONS[result]} />;
}
