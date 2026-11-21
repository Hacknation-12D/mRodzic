import { pl } from '@/shared/i18n/pl';
import { SegmentedControl } from '@/shared/ui';

import type { DocumentTab } from '../hooks/useDocumentList';

type Props = {
  value: DocumentTab;
  onChange: (tab: DocumentTab) => void;
  counts: Record<DocumentTab, number>;
};

export function DocumentTabs({ value, onChange, counts }: Props) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      accessibilityLabel={pl.documents.title}
      segments={[
        { value: 'eligible', label: pl.documents.tabEligible, badge: counts.eligible },
        { value: 'ineligible', label: pl.documents.tabIneligible, badge: counts.ineligible },
      ]}
    />
  );
}
