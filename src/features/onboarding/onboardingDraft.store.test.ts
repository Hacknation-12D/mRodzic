import { beforeEach, describe, expect, it } from 'vitest';

import { MOCK_IDENTITY } from './mobywatel/mObywatelService';
import { buildProfileFromDraft, useOnboardingDraft } from './onboardingDraft.store';

describe('onboardingDraft: dane z mObywatela', () => {
  beforeEach(() => useOnboardingDraft.getState().reset());

  it('uzupełnia imię, płeć i miejscowość oraz zapamiętuje źródło', () => {
    useOnboardingDraft.getState().applyMObywatelIdentity({ ...MOCK_IDENTITY, gender: 'male' });
    const s = useOnboardingDraft.getState();
    expect(s.identitySource).toBe('mobywatel');
    expect(s.me.firstName).toBe(MOCK_IDENTITY.firstName);
    expect(s.me.gender).toBe('male');
    expect(s.household.city).toBe(MOCK_IDENTITY.city);
  });

  it('nie przenosi nazwiska ani daty urodzenia do profilu', () => {
    useOnboardingDraft.getState().applyMObywatelIdentity(MOCK_IDENTITY);
    const profile = buildProfileFromDraft(useOnboardingDraft.getState(), new Date().toISOString());
    const json = JSON.stringify(profile);
    expect(json).not.toContain(MOCK_IDENTITY.lastName);
    expect(json).not.toContain(MOCK_IDENTITY.birthDate);
    expect(profile.me.firstName).toBe(MOCK_IDENTITY.firstName);
  });

  it('zachowuje formę zatrudnienia wpisaną wcześniej', () => {
    useOnboardingDraft.getState().setMe({ firstName: '', gender: 'female', employment: 'self_employed' });
    useOnboardingDraft.getState().applyMObywatelIdentity(MOCK_IDENTITY);
    expect(useOnboardingDraft.getState().me.employment).toBe('self_employed');
  });

  it('reset wraca do ręcznego wpisywania', () => {
    useOnboardingDraft.getState().applyMObywatelIdentity(MOCK_IDENTITY);
    useOnboardingDraft.getState().reset();
    expect(useOnboardingDraft.getState().identitySource).toBe('manual');
    expect(useOnboardingDraft.getState().me.firstName).toBe('');
  });
});
