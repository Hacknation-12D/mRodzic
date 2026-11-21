import { useToday } from '../clock/useToday';
import { useDocumentStatusStore } from '../documents/documentStatus.store';
import { useChildFilterStore } from '../filters/childFilter.store';
import { useProfileStore } from '../profile/profile.store';
import type { ChildFilter, ContentBundle, Profile, StatusMap } from '../types';
import { useBundle } from './content.store';

export type ContentData = {
  bundle: ContentBundle;
  profile: Profile | null;
  statuses: StatusMap;
  today: Date;
  filter: ChildFilter;
  setFilter: (filter: ChildFilter) => void;
};

/** Wszystkie wejścia selektorów w jednym miejscu (dla hooków w features). */
export function useContentData(): ContentData {
  const bundle = useBundle();
  const profile = useProfileStore((s) => s.profile);
  const statuses = useDocumentStatusStore((s) => s.statuses);
  const today = useToday();
  const rawFilter = useChildFilterStore((s) => s.filter);
  const setFilter = useChildFilterStore((s) => s.setFilter);
  // filtr wskazujący nieistniejące dziecko traktujemy jak „wszystkie”
  const filter = rawFilter !== 'all' && !profile?.children.some((c) => c.id === rawFilter) ? 'all' : rawFilter;
  return { bundle, profile, statuses, today, filter, setFilter };
}
