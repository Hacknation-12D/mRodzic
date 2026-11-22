import { expect, it, vi } from 'vitest';

import { useDocumentStatusStore } from '../documents/documentStatus.store';
import { useChildFilterStore } from '../filters/childFilter.store';
import { ProfileSchema } from '../schemas/profile';
import { STORAGE_PREFIX } from '../storage/storage';
import demoProfiles from '../../dev/dummyData/mrodzic_compat_profiles_v1.json';
import { useProfileStore } from './profile.store';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
    removeItem: async (key: string) => { storage.delete(key); },
  },
}));

it('restores old and demo profiles, and clears the case when replacing the household', async () => {
  const storageKey = `${STORAGE_PREFIX}profile`;
  const profile = ProfileSchema.parse(demoProfiles[0].profile);
  const { setProfile, setDemoProfile } = useProfileStore.getState();
  storage.set(storageKey, JSON.stringify({ version: 1, state: { profile } }));
  await useProfileStore.persist.rehydrate();
  expect(useProfileStore.getState()).toMatchObject({ profile, demoProfileId: null });

  useDocumentStatusStore.getState().setStatus('doc:household', 'done', profile.createdAt);
  useChildFilterStore.getState().setFilter('old-child');
  setDemoProfile('P01', profile);
  expect(useChildFilterStore.getState().filter).toBe('all');
  expect(useDocumentStatusStore.getState().statuses).toEqual({});
  useProfileStore.getState().updateMe({ firstName: 'Ania' });
  const saved = storage.get(storageKey)!;
  useProfileStore.getState().resetAll();
  expect(useProfileStore.getState().demoProfileId).toBeNull();
  storage.set(storageKey, saved);
  await useProfileStore.persist.rehydrate();
  expect(useProfileStore.getState()).toMatchObject({ profile: { me: { firstName: 'Ania' } }, demoProfileId: 'P01' });
  setProfile(profile);
  expect(useProfileStore.getState().demoProfileId).toBeNull();
});
