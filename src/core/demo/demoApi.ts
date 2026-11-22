import { z } from 'zod';

import { env } from '../config/env';
import { ProfileSchema } from '../schemas/profile';
import { localDemoProfiles, pickLocalDemoProfile } from './localDemoProfiles';
import { DemoDataProvider } from './DemoDataProvider';

/**
 * Dane demonstracyjne: z API SQLite (`EXPO_PUBLIC_DEMO_API_URL`, patrz README_INTEGRACJA.md)
 * albo – gdy adres nie jest ustawiony – z wbudowanego `mrodzic_compat_profiles_v1.json`.
 */
const caseId = z.string().regex(/^P\d{2}$/);
const catalog = z.object({
  profiles: z.array(z.object({
    profileId: caseId,
    slug: z.string().min(1),
    label: z.string().min(1),
    sensitive: z.boolean(),
  })),
});
const snapshot = z.object({ profileId: caseId, appProfileV1: ProfileSchema });
const login = snapshot.extend({
  mobywatel: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    city: z.string().min(1),
  }),
});

/** Symulowany czas „logowania” w trybie lokalnym – żeby stan ładowania i „Anuluj” działały jak przy API. */
export const LOCAL_DEMO_DELAY_MS = 800;

async function request(path: string, options: RequestInit, baseUrl = env.demoApiUrl): Promise<unknown> {
  if (!baseUrl) throw new Error('Demo API URL is missing');
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) throw new Error(`Demo API returned HTTP ${response.status}`);
  return response.json();
}

function local<T>(produce: () => T, signal?: AbortSignal, delayMs = LOCAL_DEMO_DELAY_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('aborted'));
    const timer = setTimeout(() => {
      try {
        resolve(produce());
      } catch (error) {
        reject(error);
      }
    }, delayMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    });
  });
}

export async function listDemoProfiles(signal: AbortSignal) {
  if (!env.demoApiUrl) {
    return local(() => localDemoProfiles().map(({ profileId, slug, label, sensitive }) => ({ profileId, slug, label, sensitive })), signal, 0);
  }
  const response = await request('/api/demo-profiles', { signal });
  return catalog.parse(response).profiles;
}

export async function loginDemoProfile(profileId: string | undefined, signal: AbortSignal) {
  const response = env.demoApiUrl
    ? await request('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
        signal,
      })
    : await local(() => {
        const picked = pickLocalDemoProfile(profileId);
        return {
          profileId: picked.profileId,
          appProfileV1: picked.profile,
          mobywatel: picked.identity,
        };
      }, signal);
  const result = login.parse(response);
  if (profileId && result.profileId !== profileId) throw new Error('Unexpected demo login profile');
  return result;
}

export async function getDemoSnapshot(profileId: string, signal?: AbortSignal, baseUrl = env.demoApiUrl) {
  return (await DemoDataProvider.snapshot(profileId, signal, baseUrl)).appProfileV1;
}
