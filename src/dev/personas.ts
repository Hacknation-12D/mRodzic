import { addDays, format, subMonths, subWeeks, subYears } from 'date-fns';

import type { Profile } from '@/core/types';

/**
 * Persony demo. Daty liczone względem „dzisiaj”, więc demo zawsze działa.
 * Wczytywane z DevPanelu albo przez EXPO_PUBLIC_SEED_PERSONA.
 */
export type PersonaId = 'ania' | 'magda' | 'kasia';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const annaIdentity = {
  id: 'p_ania', lastName: 'Łącka', city: 'Łódź', birthDate: '1990-05-14',
  pesel: '90051412349', street: 'Źródlana', houseNumber: '12A', apartmentNumber: '3', postalCode: '90-001',
};

export function prepareDemoProfile(profile: Profile | null, seed: PersonaId | undefined, today: Date): Profile | null {
  if (!profile) return seed ? buildPersona(seed, today) : null;
  const { me, household } = profile;
  const city = me.city ?? household.city ?? annaIdentity.city;
  if (me.id !== annaIdentity.id) {
    // Starszy zapis scenariusza testowego z symulacji mObywatela ma losowe ID rodzica.
    const hasDemoChild = profile.children.some((child) =>
      ['paweł', 'pawel'].includes(child.name.trim().toLowerCase()) && child.birthDate === '2026-10-01',
    );
    if (me.firstName.trim().toLowerCase() !== 'anna' || city.trim().toLowerCase() !== 'warszawa' || !hasDemoChild
      || (me.lastName && me.lastName.trim().toLowerCase() !== annaIdentity.lastName.toLowerCase())) return null;
  }

  const defaults = {
    lastName: annaIdentity.lastName, city, birthDate: annaIdentity.birthDate, pesel: annaIdentity.pesel,
    street: annaIdentity.street, houseNumber: annaIdentity.houseNumber, apartmentNumber: annaIdentity.apartmentNumber,
    postalCode: household.postalCode || (city.trim().toLowerCase() === 'warszawa' ? '00-001' : annaIdentity.postalCode),
  };
  const missing = Object.entries(defaults).filter(([key]) => !me[key as keyof typeof defaults]);
  return missing.length ? { ...profile, me: { ...me, ...Object.fromEntries(missing) } } : null;
}

function meta(today: Date) {
  const now = today.toISOString();
  return { schemaVersion: 1 as const, createdAt: now, updatedAt: now };
}

export function buildPersona(id: PersonaId, today: Date): Profile {
  switch (id) {
    case 'ania':
      // Anna (umowa o pracę) + Tomek (JDG), Zosia urodzona 3 miesiące temu, dochód nieznany.
      return {
        ...meta(today),
        me: { ...annaIdentity, firstName: 'Anna', gender: 'female', employment: 'employment_contract' },
        partner: { id: 'p_tomek', firstName: 'Tomek', gender: 'male', employment: 'self_employed' },
        children: [
          { id: 'c_zosia', name: 'Zosia', status: 'born', birthDate: iso(subMonths(today, 3)), sex: 'female', premature: false, colorKey: 'coral' },
        ],
        household: {},
      };
    case 'magda':
      // Samotna mama (umowa zlecenie), bliźnięta – wcześniaki urodzone 5 tygodni temu, dochód 1500 zł/os.
      return {
        ...meta(today),
        me: { id: 'p_magda', firstName: 'Magda', gender: 'female', employment: 'civil_contract' },
        children: [
          { id: 'c_jas', name: 'Jaś', status: 'born', birthDate: iso(subWeeks(today, 5)), sex: 'male', premature: true, multipleBirthGroupId: 'twins_1', colorKey: 'coral' },
          { id: 'c_stas', name: 'Staś', status: 'born', birthDate: iso(subWeeks(today, 5)), sex: 'male', premature: true, multipleBirthGroupId: 'twins_1', colorKey: 'teal' },
        ],
        household: { incomePerPersonNet: 1500, singleParent: true },
      };
    case 'kasia':
      // Kasia (bez pracy) + Marek (umowa o pracę), troje dzieci: 4 lata, 18 miesięcy i dziecko w drodze (24. tydzień).
      return {
        ...meta(today),
        me: { id: 'p_kasia', firstName: 'Kasia', gender: 'female', employment: 'unemployed' },
        partner: { id: 'p_marek', firstName: 'Marek', gender: 'male', employment: 'employment_contract' },
        children: [
          { id: 'c_ola', name: 'Ola', status: 'born', birthDate: iso(subYears(today, 4)), sex: 'female', premature: false, colorKey: 'coral' },
          { id: 'c_kuba', name: 'Kuba', status: 'born', birthDate: iso(subMonths(today, 18)), sex: 'male', premature: false, colorKey: 'teal' },
          // 24. tydzień → do terminu zostało (40 − 24) × 7 = 112 dni
          { id: 'c_maluszek', name: 'Maluszek', status: 'expected', dueDate: iso(addDays(today, 112)), colorKey: 'violet' },
        ],
        household: {},
      };
  }
}

