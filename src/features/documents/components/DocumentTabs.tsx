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
        { value: 'upcoming', label: pl.documents.tabUpcoming, badge: counts.upcoming },
        { value: 'done', label: pl.documents.tabDone, badge: counts.done },
        { value: 'hidden', label: pl.documents.tabHidden, badge: counts.hidden },
      ]}
    />
  );
}
