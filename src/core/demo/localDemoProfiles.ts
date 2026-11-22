import { z } from 'zod';

import { ProfileSchema } from '../schemas/profile';
import type { Profile } from '../types';

/**
 * Lokalny odpowiednik `scripts/demo/mock_server.py` – działa bez serwera, na eksporcie
 * `src/dev/dummyData/mrodzic_compat_profiles_v1.json` rejestrowanym przez `registerLocalDemoProfiles`
 * (core nie importuje z dev, więc dane podaje warstwa aplikacji – `src/app/_layout.tsx`). Tytuły scenariuszy i flaga „wrażliwy” pochodzą z README_INTEGRACJA.md
 * (tak samo jak w `build_db.py`).
 */
const SCENARIOS: Record<string, string> = {
  P01: 'Etat, zasiłek wypłaca pracodawca',
  P02: 'Własna firma z zaległościami w ZUS',
  P03: 'Umowa zlecenie od niedawna',
  P04: 'Studentka bez ubezpieczenia',
  P05: 'Bliźnięta urodzone przedwcześnie',
  P06: 'Adopcja 6-latka',
  P07: 'Rodzina zastępcza',
  P08: 'Utrata dziecka',
  P09: 'Utrata pracy w ciąży (firma zamknięta)',
  P10: 'Dziecko z ciężką chorobą (program „Za życiem”)',
};
/** Scenariusz wrażliwy – nie bierze udziału w losowaniu, można go wybrać tylko ręcznie. */
const SENSITIVE = new Set(['P08']);

const RecordSchema = z.object({
  profileId: z.string().regex(/^P\d{2}$/),
  slug: z.string().min(1),
  /** Dane „z mObywatela” pokazywane tylko przy logowaniu – nie trafiają do profilu (nazwiska i daty urodzenia rodzica nie zapisujemy). */
  mobywatel: z.object({
    lastName: z.string().min(1),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  profile: ProfileSchema,
});

export type LocalDemoProfile = {
  profileId: string;
  slug: string;
  label: string;
  sensitive: boolean;
  identity: DemoIdentity;
  profile: Profile;
};

export type DemoIdentity = { firstName: string; lastName: string; birthDate: string; city: string };

let records: unknown = null;
let cache: LocalDemoProfile[] | null = null;

/** Rejestruje surowy eksport profili (walidowany przy pierwszym użyciu). */
export function registerLocalDemoProfiles(data: unknown) {
  records = data;
  cache = null;
}

/** Walidacja przy pierwszym użyciu (nie przy imporcie modułu), żeby błąd danych nie wywracał startu aplikacji. */
export function localDemoProfiles(): LocalDemoProfile[] {
  if (records === null) throw new Error('Local demo profiles are not registered');
  cache ??= z.array(RecordSchema).min(1).parse(records).map((r) => ({
    profileId: r.profileId,
    slug: r.slug,
    label: `${r.profile.me.firstName} – ${SCENARIOS[r.profileId] ?? r.slug}`,
    sensitive: SENSITIVE.has(r.profileId),
    identity: {
      firstName: r.profile.me.firstName,
      lastName: r.mobywatel.lastName,
      birthDate: r.mobywatel.birthDate,
      city: r.profile.household.city ?? '',
    },
    profile: r.profile,
  }));
  return cache;
}

/** Jak `POST /api/demo-login`: konkretny profil albo losowy spośród niewrażliwych. */
export function pickLocalDemoProfile(profileId?: string, includeSensitive = false, random = Math.random): LocalDemoProfile {
  const all = localDemoProfiles();
  if (profileId !== undefined) {
    const found = all.find((p) => p.profileId === profileId);
    if (!found) throw new Error(`Unknown demo profile ${profileId}`);
    return found;
  }
  const pool = all.filter((p) => includeSensitive || !p.sensitive);
  return pool[Math.floor(random() * pool.length) % pool.length];
}
