import { addDays, format, subMonths, subWeeks, subYears } from 'date-fns';

import type { Profile } from '@/core/types';

/**
 * Persony demo. Daty liczone względem „dzisiaj”, więc demo zawsze działa.
 * Wczytywane z DevPanelu albo przez EXPO_PUBLIC_SEED_PERSONA.
 */
export type PersonaId = 'ania' | 'magda' | 'kasia';
export const PERSONA_IDS: PersonaId[] = ['ania', 'magda', 'kasia'];

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

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
        me: { id: 'p_ania', firstName: 'Anna', gender: 'female', employment: 'employment_contract' },
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

