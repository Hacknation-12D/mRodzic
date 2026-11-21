import { getToday } from '../clock/clock';
import { useContentStore } from '../content/content.store';
import { deadlineLabel } from '../content/format';
import { getDocumentInstances } from '../content/selectors';
import { env } from '../config/env';
import { useDocumentStatusStore } from '../documents/documentStatus.store';
import { childAliases } from '../profile/anonymize';
import { useProfileStore } from '../profile/profile.store';
import { getAssistantMode } from '../settings/settings.store';
import type { AssistantService } from './AssistantService';
import { createMockAssistant } from './mockAssistant';
import { createRemoteAssistant } from './remoteAssistant';

export * from './AssistantService';
export { buildAssistantContext } from './buildContext';
export { flushSupportQueue, humanSupport, isValidContact, QUESTION_MAX, useSupportTicketsStore, type SupportTicket } from './humanSupport';

/** Termin dokumentu dla mocka – z aliasem dziecka („Dziecko 1”), bez imienia. */
function deadlineText(docId: string): string | undefined {
  const profile = useProfileStore.getState().profile;
  if (!profile) return undefined;
  const inst = getDocumentInstances(
    useContentStore.getState().bundle,
    profile,
    useDocumentStatusStore.getState().statuses,
    getToday(),
    'all',
  ).find((d) => d.id === docId && d.status === 'todo' && d.deadlineDate);
  if (!inst) return undefined;
  const alias = inst.childId ? childAliases(profile).get(inst.childId) : undefined;
  const label = deadlineLabel(inst.daysLeft, inst.deadlineDate);
  return alias ? `${label} (${alias})` : label;
}

export const mockAssistant: AssistantService = createMockAssistant({
  getBundle: () => useContentStore.getState().bundle,
  getDeadlineText: deadlineText,
});

let remote: AssistantService | null = null;

/** Wybór implementacji wg ustawień (DevPanel) / EXPO_PUBLIC_ASSISTANT_MODE. Remote tylko z Supabase. */
export function getAssistantService(): { service: AssistantService; mode: 'mock' | 'remote' } {
  if (getAssistantMode() === 'remote' && env.isSupabaseConfigured) {
    remote ??= createRemoteAssistant();
    return { service: remote, mode: 'remote' };
  }
  return { service: mockAssistant, mode: 'mock' };
}
