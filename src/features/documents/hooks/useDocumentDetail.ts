import { useMemo } from 'react';

import { nowIso } from '@/core/clock/clock';
import { getDocumentInstance } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';
import { useDocumentStatusStore } from '@/core/documents/documentStatus.store';
import { useChildViews } from '@/core/profile/useChildViews';
import type { DocumentStatus } from '@/core/types';

export function useDocumentDetail(docId: string | undefined, childId: string | undefined) {
  const { bundle, profile, statuses, today } = useContentData();
  const setStatus = useDocumentStatusStore((s) => s.setStatus);
  const children = useChildViews(today);

  const instance = useMemo(
    () => (profile && docId ? getDocumentInstance(bundle, profile, statuses, today, docId, childId) : undefined),
    [bundle, profile, statuses, today, docId, childId],
  );
  const child = instance?.childId ? children.find((c) => c.id === instance.childId) : undefined;

  return {
    instance,
    child,
    changeStatus: (status: DocumentStatus) => {
      if (instance) setStatus(instance.key, status, nowIso());
    },
  };
}
