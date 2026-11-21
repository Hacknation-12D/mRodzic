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
  P01: 'Etat i duży płatnik',
  P02: 'JDG i zaległości',
  P03: 'Umowa zlecenia',
  P04: 'Studia',
  P05: 'Wcześniacze bliźnięta',
  P06: 'Adopcja',
  P07: 'Rodzina zastępcza',
  P08: 'Utrata dziecka',
  P09: 'Likwidacja pracodawcy',
  P10: 'Za życiem',
};
/** Scenariusz wrażliwy – nie bierze udziału w losowaniu, można go wybrać tylko ręcznie. */
const SENSITIVE = new Set(['P08']);

const RecordSchema = z.object({
  profileId: z.string().regex(/^P\d{2}$/),
  slug: z.string().min(1),
  profile: ProfileSchema,
});

export type LocalDemoProfile = {
  profileId: string;
  slug: string;
  label: string;
  sensitive: boolean;
  profile: Profile;
};

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
