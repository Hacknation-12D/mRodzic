import { beforeEach, describe, expect, it } from 'vitest';

import { MOCK_EMPLOYER, MOCK_IDENTITY, mockChildren, mockPue } from './mobywatel/mObywatelService';
import { buildProfileFromDraft, useOnboardingDraft } from './onboardingDraft.store';

describe('onboardingDraft: dane z mObywatela', () => {
  beforeEach(() => useOnboardingDraft.getState().reset());

  it('uzupełnia imię, płeć i miejscowość oraz zapamiętuje źródło', () => {
    useOnboardingDraft.getState().applyMObywatelData({
      identity: { ...MOCK_IDENTITY, gender: 'male' },
      children: [],
    });
    const s = useOnboardingDraft.getState();
    expect(s.identitySource).toBe('mobywatel');
    expect(s.me.firstName).toBe(MOCK_IDENTITY.firstName);
    expect(s.me.gender).toBe('male');
    expect(s.household.city).toBe(MOCK_IDENTITY.city);
  });

  it('zapisuje nazwisko z symulacji w profilu, ale nie datę urodzenia', () => {
    useOnboardingDraft.getState().applyMObywatelData({ identity: MOCK_IDENTITY, children: [] });
    const profile = buildProfileFromDraft(useOnboardingDraft.getState(), new Date().toISOString());
    const json = JSON.stringify(profile);
    expect(profile.me.lastName).toBe(MOCK_IDENTITY.lastName);
    expect(json).not.toContain(MOCK_IDENTITY.birthDate);
    expect(profile.me.firstName).toBe(MOCK_IDENTITY.firstName);
  });

  it('zachowuje formę zatrudnienia wpisaną wcześniej', () => {
    useOnboardingDraft.getState().setMe({ firstName: '', gender: 'female', employment: 'self_employed' });
    useOnboardingDraft.getState().applyMObywatelData({ identity: MOCK_IDENTITY, children: [] });
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

  it('dane z PUE trafiają do profilu (z płatnikiem), bez daty urodzenia rodzica', () => {
    const children = mockChildren();
    useOnboardingDraft.getState().applyMObywatelData({ identity: MOCK_IDENTITY, children, pue: mockPue(children) });
    const profile = buildProfileFromDraft(useOnboardingDraft.getState(), new Date().toISOString());
    expect(profile.me.employment).toBe('employment_contract');
    expect(profile.me.work?.benefitPayer).toBe('zus');
    expect(profile.me.work?.maternityLeave?.weeks).toBe(20);
    expect(profile.me.work?.zus?.payer.nip).toBe(MOCK_EMPLOYER.nip);
    expect(profile.me.lastName).toBe(MOCK_IDENTITY.lastName);
    expect(JSON.stringify(profile)).not.toContain(MOCK_IDENTITY.birthDate);
  });

  it('dochód na osobę wylicza się z PUE (netto / liczba osób), a przy partnerze zostaje nieznany', () => {
    const children = mockChildren();
    const store = useOnboardingDraft.getState();
    store.applyMObywatelData({ identity: MOCK_IDENTITY, children, pue: mockPue(children) });
    const now = new Date().toISOString();
    // Anna + 2 dzieci = 3 osoby: 4966 / 3 ≈ 1655
    expect(buildProfileFromDraft(useOnboardingDraft.getState(), now).household.incomePerPersonNet).toBe(1655);
    useOnboardingDraft.getState().setPartnerEnabled(true);
    expect(buildProfileFromDraft(useOnboardingDraft.getState(), now).household.incomePerPersonNet).toBeUndefined();
  });

  it('reset wraca do ręcznego wpisywania', () => {
    useOnboardingDraft.getState().applyMObywatelData({ identity: MOCK_IDENTITY, children: [] });
    useOnboardingDraft.getState().reset();
    expect(useOnboardingDraft.getState().identitySource).toBe('manual');
    expect(useOnboardingDraft.getState().me.firstName).toBe('');
  });

  it('pobrane dzieci trafiają do szkicu i wyłączają ręczne wpisywanie', () => {
    useOnboardingDraft.getState().applyMObywatelData({
      identity: MOCK_IDENTITY,
      children: mockChildren(),
    });
    const s = useOnboardingDraft.getState();
    expect(s.childrenSource).toBe('mobywatel');
    expect(s.children.map((c) => [c.name, c.status])).toEqual([
      ['Kasia', 'born'],
      ['Kamil', 'born'],
    ]);
    expect(s.childrenCount).toBe(2);
    const profile = buildProfileFromDraft(s, new Date().toISOString());
    expect(profile.children.map((c) => c.name)).toEqual(['Kasia', 'Kamil']);
  });

  it('brak dzieci w rejestrze zostawia ręczne wpisywanie', () => {
    useOnboardingDraft.getState().applyMObywatelData({ identity: MOCK_IDENTITY, children: [] });
    expect(useOnboardingDraft.getState().childrenSource).toBe('manual');
  });

  it('ponowne logowanie bez dzieci czyści wcześniej pobrane', () => {
    useOnboardingDraft.getState().applyMObywatelData({
      identity: MOCK_IDENTITY,
      children: mockChildren(),
    });
    useOnboardingDraft.getState().applyMObywatelData({ identity: MOCK_IDENTITY, children: [] });
    const s = useOnboardingDraft.getState();
    expect(s.childrenSource).toBe('manual');
    expect(s.children).toHaveLength(1);
    expect(s.children[0].name).toBe('');
  });
});
