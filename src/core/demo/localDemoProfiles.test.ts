import { beforeAll, describe, expect, it, vi } from 'vitest';

import demoProfiles from '../../dev/dummyData/mrodzic_compat_profiles_v1.json';
import { peselMatches } from '../profile/pesel';
import { loginDemoProfile } from './demoApi';
import { localDemoProfiles, pickLocalDemoProfile, registerLocalDemoProfiles } from './localDemoProfiles';

vi.mock('../config/env', () => ({ env: { demoApiUrl: undefined } }));

beforeAll(() => registerLocalDemoProfiles(demoProfiles));

describe('local demo profiles', () => {
  it('validates all 10 profiles and flags only P08 as sensitive', () => {
    const all = localDemoProfiles();
    expect(all).toHaveLength(10);
    expect(all.filter((p) => p.sensitive).map((p) => p.profileId)).toEqual(['P08']);
    expect(all[0].label).toBe('Anna – Etat, zasiłek wypłaca pracodawca');
  });

  it('every parent has surname, date of birth, matching PESEL and a full home address', () => {
    for (const { profileId, profile } of localDemoProfiles()) {
      for (const parent of [profile.me, profile.partner].filter((p) => p !== undefined)) {
        const who = `${profileId} ${parent.firstName}`;
        for (const key of ['lastName', 'birthDate', 'pesel', 'street', 'houseNumber', 'postalCode', 'city'] as const) {
          expect(parent[key], `${who}: ${key}`).toBeTruthy();
        }
        expect(peselMatches(parent.pesel ?? '', parent.birthDate ?? '', parent.gender), who).toBe(true);
      }
      expect(profile.household.city, `${profileId}: city comes from the address`).toBeUndefined();
      expect(profile.partner?.city ?? profile.me.city).toBe(profile.me.city);
    }
  });

  it('rejects a parent without the mandatory data', () => {
    const broken = structuredClone(demoProfiles);
    delete (broken[0].profile.me as { pesel?: string }).pesel;
    registerLocalDemoProfiles(broken);
    expect(() => localDemoProfiles()).toThrow(/pesel/);
    registerLocalDemoProfiles(demoProfiles);
  });

  it('picks randomly among the 9 non-sensitive profiles', () => {
    const picked = new Set(Array.from({ length: 9 }, (_, i) => pickLocalDemoProfile(undefined, false, () => i / 9).profileId));
    expect(picked.size).toBe(9);
    expect(picked.has('P08')).toBe(false);
    expect(pickLocalDemoProfile(undefined, false, () => 0.999999).profileId).toBe('P10');
  });

  it('returns a specific profile, including the sensitive one, on request', () => {
    expect(pickLocalDemoProfile('P08').profileId).toBe('P08');
    expect(() => pickLocalDemoProfile('P99')).toThrow();
  });

  it('logs in without a server using the same response shape as the API', async () => {
    vi.useFakeTimers();
    const pending = loginDemoProfile('P05', new AbortController().signal);
    await vi.runAllTimersAsync();
    const result = await pending;
    vi.useRealTimers();
    expect(result.profileId).toBe('P05');
    expect(result.mobywatel).toEqual({ firstName: 'Iga', lastName: 'Dąbrowska', birthDate: '1994-11-02', city: 'Wrocław' });
    expect(result.appProfileV1.children).toHaveLength(2);
  });
});
