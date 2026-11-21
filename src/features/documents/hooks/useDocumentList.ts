import { useMemo } from 'react';

import { nowIso } from '@/core/clock/clock';
import { getDocumentInstances } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';
import { useDocumentStatusStore } from '@/core/documents/documentStatus.store';
import { useChildViews, type ChildView } from '@/core/profile/useChildViews';
import type { DocumentInstance, DocumentStatus, Urgency } from '@/core/types';
import { pl } from '@/shared/i18n/pl';

export type DocumentTab = 'upcoming' | 'done' | 'hidden';
export type TimelineSection = { key: Urgency; title: string; data: DocumentInstance[] };

const SECTION_TITLES: Record<Urgency, string> = {
  overdue: pl.documents.groupOverdue,
  urgent: pl.documents.groupThisWeek,
  soon: pl.documents.groupThisMonth,
  later: pl.documents.groupLater,
  none: pl.documents.groupNoDeadline,
};
const SECTION_ORDER: Urgency[] = ['overdue', 'urgent', 'soon', 'later', 'none'];

export function useDocumentList() {
  const { bundle, profile, statuses, today, filter, setFilter } = useContentData();
  const setStatus = useDocumentStatusStore((s) => s.setStatus);
  const children = useChildViews(today);

  const instances = useMemo(
    () => (profile ? getDocumentInstances(bundle, profile, statuses, today, filter) : []),
    // bundle.version / profile.updatedAt zmieniają referencje obiektów – wystarczą same obiekty
    [bundle, profile, statuses, today, filter],
  );

  const byTab = useMemo(() => {
    const upcoming = instances.filter((d) => d.status === 'todo');
    const byDate = (a: DocumentInstance, b: DocumentInstance) => (b.statusUpdatedAt ?? '').localeCompare(a.statusUpdatedAt ?? '');
    return {
      upcoming,
      done: instances.filter((d) => d.status === 'done').sort(byDate),
      hidden: instances.filter((d) => d.status === 'hidden').sort(byDate),
    };
  }, [instances]);

  const sections: TimelineSection[] = useMemo(
    () =>
      SECTION_ORDER.map((key) => ({ key, title: SECTION_TITLES[key], data: byTab.upcoming.filter((d) => d.urgency === key) })).filter(
        (s) => s.data.length > 0,
      ),
    [byTab.upcoming],
  );

  const childById = useMemo(() => new Map<string, ChildView>(children.map((c) => [c.id, c])), [children]);

  return {
    children,
    childById,
    filter,
    setFilter,
    byTab,
    sections,
    changeStatus: (instance: DocumentInstance, status: DocumentStatus) => setStatus(instance.key, status, nowIso()),
  };
}
