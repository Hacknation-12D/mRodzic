import { router } from 'expo-router';

/**
 * Jedyny sposób nawigacji między widokami (features nie importują się nawzajem).
 * Parametry tras to kontrakt – zmiany zgłaszaj zespołowi.
 */

type Params = Record<string, string>;

function clean(params: Record<string, string | undefined | null>): Params {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => typeof v === 'string' && v.length > 0)) as Params;
}

export type AssistantRouteParams = { docId?: string; childId?: string };
export type DocumentRouteParams = { docId: string; childId?: string };

export function goToDocument(docId: string, childId?: string) {
  router.push({ pathname: '/document/[docId]', params: clean({ docId, childId }) });
}

export function goToAssistant(params: AssistantRouteParams = {}) {
  router.navigate({ pathname: '/assistant', params: clean(params) });
}

/** Wraca do istniejących zakładek (onboarding leży nad nimi w głównym stosie). */
export function goToHome() {
  router.navigate('/');
}

export function goToDocuments() {
  router.navigate('/documents');
}

export function goToProfile() {
  router.push('/profile');
}

export function goToChildEdit(childId: string) {
  router.push({ pathname: '/profile/child/[childId]', params: { childId } });
}

export function goToCalculator() {
  router.push('/calculator');
}

export function goToApplications() {
  router.push('/applications');
}

export function goToFamilyPlan() { router.push('/family-plan'); }

export function goToChildNew() {
  router.push('/profile/child/new');
}

export function goToDevPanel() {
  router.push('/dev');
}

export type OnboardingStep = 'login' | 'partner' | 'children' | 'household';
export const ONBOARDING_STEPS: OnboardingStep[] = ['login', 'partner', 'children', 'household'];

export function goToOnboardingStep(step: OnboardingStep) {
  router.push(step === 'login' ? '/onboarding' : `/onboarding/${step}`);
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
