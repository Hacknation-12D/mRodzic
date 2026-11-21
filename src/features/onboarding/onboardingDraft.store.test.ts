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

  it('zapisuje nazwisko z symulacji w profilu', () => {
    useOnboardingDraft.getState().applyMObywatelIdentity(MOCK_IDENTITY);
    const profile = buildProfileFromDraft(useOnboardingDraft.getState(), new Date().toISOString());
    const json = JSON.stringify(profile);
    expect(profile.me.lastName).toBe(MOCK_IDENTITY.lastName);
    expect(json).not.toContain(MOCK_IDENTITY.birthDate);
    expect(profile.me.firstName).toBe(MOCK_IDENTITY.firstName);
  });

  it('zachowuje formę zatrudnienia wpisaną wcześniej', () => {
    useOnboardingDraft.getState().setMe({ firstName: '', gender: 'female', employment: 'self_employed' });
    useOnboardingDraft.getState().applyMObywatelIdentity(MOCK_IDENTITY);
    expect(useOnboardingDraft.getState().me.employment).toBe('self_employed');
  });

  it('przenosi dane wpisane ręcznie do profilu rodzica', () => {
    const parent = {
      firstName: 'Anna', lastName: 'Żółć', gender: 'female' as const, birthDate: '1944-05-14',
      street: 'Łąkowa', houseNumber: '4', city: 'Łódź', postalCode: '90-001',
      pesel: '44051401458', employment: 'employment_contract' as const,
    };
    useOnboardingDraft.getState().setMe(parent);
    const profile = buildProfileFromDraft(useOnboardingDraft.getState(), new Date().toISOString());
    expect(profile.me).toMatchObject(parent);
    expect(profile.household.city).toBe('Łódź');
  });

  it('reset wraca do ręcznego wpisywania', () => {
    useOnboardingDraft.getState().applyMObywatelIdentity(MOCK_IDENTITY);
    useOnboardingDraft.getState().reset();
    expect(useOnboardingDraft.getState().identitySource).toBe('manual');
    expect(useOnboardingDraft.getState().me.firstName).toBe('');
  });
});
