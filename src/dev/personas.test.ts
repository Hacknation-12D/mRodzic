import { describe, expect, it } from 'vitest';

import { buildPersona, prepareDemoProfile } from './personas';

describe('dane testowe Anny', () => {
  const today = new Date(2026, 10, 21);

  it('wczytuje nazwisko i miasto przy pierwszym starcie', () => {
    expect(prepareDemoProfile(null, 'ania', today)?.me).toMatchObject({ firstName: 'Anna', lastName: 'Łącka', city: 'Łódź' });
  });

  it('uzupełnia stary profil Anny z dzieckiem Paweł', () => {
    const profile = buildPersona('ania', today);
    profile.me.lastName = undefined;
    profile.me.city = undefined;
    profile.children[0].name = 'Paweł';
    const updated = prepareDemoProfile(profile, undefined, today);
    expect(updated?.me).toMatchObject({ lastName: 'Łącka', city: 'Łódź' });
    expect(updated?.children).toEqual(profile.children);
  });

  it('uzupełnia nazwisko w zapisanym scenariuszu Anny z Warszawy i pozostawia własne nazwisko', () => {
    const profile = buildPersona('ania', today);
    profile.me = {
      id: 'parent_test', firstName: 'Anna', lastName: 'łącka', gender: 'female',
      houseNumber: '7',
    };
    profile.household.city = 'Warszawa';
    profile.children[0] = { ...profile.children[0], name: 'pawel', birthDate: '2026-10-01' };
    expect(prepareDemoProfile(profile, undefined, today)?.me).toMatchObject({
      lastName: 'łącka', city: 'Warszawa', pesel: '90051412349', street: 'Źródlana',
      houseNumber: '7', apartmentNumber: '3', postalCode: '00-001',
    });
    profile.me.lastName = 'Nowak';
    expect(prepareDemoProfile(profile, undefined, today)).toBeNull();
  });
});
