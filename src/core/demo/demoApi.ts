import { z } from 'zod';

import { env } from '../config/env';
import { ProfileSchema } from '../schemas/profile';

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
  mobywatel: z.object({ firstName: z.string().min(1), city: z.string().min(1) }),
});

async function request(path: string, options: RequestInit, baseUrl = env.demoApiUrl): Promise<unknown> {
  if (!baseUrl) throw new Error('Demo API URL is missing');
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) throw new Error(`Demo API returned HTTP ${response.status}`);
  return response.json();
}

export async function listDemoProfiles(signal: AbortSignal) {
  const response = await request('/api/demo-profiles', { signal });
  return catalog.parse(response).profiles;
}

export async function loginDemoProfile(profileId: string | undefined, signal: AbortSignal) {
  const response = await request('/api/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
    signal,
  });
  const result = login.parse(response);
  if (profileId && result.profileId !== profileId) throw new Error('Unexpected demo login profile');
  return result;
}

export async function getDemoSnapshot(profileId: string, signal?: AbortSignal, baseUrl = env.demoApiUrl) {
  const response = await request(`/api/demo-snapshot/${encodeURIComponent(profileId)}`, { signal }, baseUrl);
  const result = snapshot.parse(response);
  if (result.profileId !== profileId) throw new Error('Unexpected demo snapshot profile');
  return result.appProfileV1;
}
