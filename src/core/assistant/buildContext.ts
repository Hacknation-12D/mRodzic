import { getRelevantDocumentIds } from '../content/selectors';
import { describeChildAnonymously, toAnonymousSummary } from '../profile/anonymize';
import type { ContentBundle, Profile, StatusMap } from '../types';
import type { AssistantContext } from './AssistantService';

/** Kontekst dla asystenta – wyłącznie zanonimizowany (bez imion, dat, miejscowości). */
export function buildAssistantContext(params: {
  bundle: ContentBundle;
  profile: Profile;
  statuses: StatusMap;
  today: Date;
  childId: string | null;
  focusDocumentId?: string;
}): AssistantContext {
  const { bundle, profile, statuses, today, childId, focusDocumentId } = params;
  const child = childId ? profile.children.find((c) => c.id === childId) : undefined;
  return {
    profileSummary: toAnonymousSummary(profile, today),
    childLabel: child ? describeChildAnonymously(profile, child, today) : undefined,
    focusDocumentId: focusDocumentId && bundle.documents.some((d) => d.id === focusDocumentId) ? focusDocumentId : undefined,
    relevantDocumentIds: getRelevantDocumentIds(bundle, profile, statuses, today, child?.id ?? null, 8),
    contentVersion: bundle.version,
  };
}
