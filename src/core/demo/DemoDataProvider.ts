import { z } from 'zod';
import { ProfileSchema } from '../schemas/profile';
import { env } from '../config/env';
import generated from './generated/snapshot.json';
const source = { source: z.string(), asOf: z.string(), synthetic: z.literal(true) };
export const DemoSnapshotSchema = z.object({
  profileId: z.string().regex(/^P\d{2}$/), slug: z.string(), version: z.string(), ...source, appProfileV1: ProfileSchema,
  ezla: z.array(z.object({ id: z.string(), personId: z.string(), from: z.string(), to: z.string(), code: z.string(), ...source })),
  hospitalizations: z.array(z.object({ childId: z.string(), from: z.string(), to: z.string(), birthWeightGrams: z.number(), gestationalWeek: z.number(), ...source })),
  placement: z.object({ kind: z.enum(['adoption', 'foster']), childId: z.string(), date: z.string(), courtApplicationDate: z.string().nullable(), schoolDeferral: z.boolean(), professional: z.boolean(), ...source }).nullable(),
  zaZyciem: z.object({ childId: z.string(), issuedOn: z.string(), ...source }).nullable(),
  civilRegistry: z.array(z.object({ childId: z.string(), birthDate: z.string(), office: z.string(), recordId: z.string(), ...source })),
  postInsuranceReason: z.string().nullable(),
});
export type DemoSnapshot = z.infer<typeof DemoSnapshotSchema>;
const snapshots = generated.profiles.map((p) => DemoSnapshotSchema.parse(p));
export const offlineProfiles = snapshots.map((p) => ({ profileId: p.profileId, slug: p.slug, profile: p.appProfileV1 }));
export function offlineSnapshot(profileId: string) {
  const record = snapshots.find((s) => s.profileId === profileId);
  if (!record) throw new Error('Nieznany profil DEMO');
  return structuredClone(record);
}
export const DemoDataProvider = {
  async snapshot(profileId: string, signal?: AbortSignal, url = env.demoApiUrl): Promise<DemoSnapshot> {
    if (!url) return offlineSnapshot(profileId);
    const response = await fetch(`${url}/api/demo-snapshot/${encodeURIComponent(profileId)}`, { signal });
    if (!response.ok) throw new Error('Nie udało się pobrać danych DEMO.');
    const parsed = DemoSnapshotSchema.parse(await response.json());
    if (parsed.profileId !== profileId) throw new Error('Niezgodny profil snapshotu');
    return parsed;
  },
};
