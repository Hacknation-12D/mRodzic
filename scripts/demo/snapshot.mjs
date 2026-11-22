import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const AS_OF = '2026-11-21';
export const VERSION = 'synthetic-2026.11.22-v2';
const DB_PATH = resolve('scripts/demo/mrodzic_zus_demo.sqlite3');
const OUTPUT = resolve('src/core/demo/generated/snapshot.json');
// Fikcyjne, ale formalnie poprawne identyfikatory płatnika (suma kontrolna NIP/REGON).
function nip(seed) {
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  for (let n = seed; ; n++) {
    const b = String(n).padStart(9, '0');
    const c = w.reduce((a, x, i) => a + x * Number(b[i]), 0) % 11;
    if (c !== 10) return b + c;
  }
}
function regon(seed) {
  const w = [8, 9, 2, 3, 4, 5, 6, 7];
  const b = String(seed).padStart(8, '0');
  const c = w.reduce((a, x, i) => a + x * Number(b[i]), 0) % 11;
  return b + (c === 10 ? 0 : c);
}
const seedOf = (id) => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 90000000, 7) + 10000000;
const periods = (parent) => parent?.work ? [{ kind: parent.employment, from: parent.work.employedSince, fixedTerm: false }] : [];
function enrich(parent, id) {
  if (!parent?.work || parent.work.zus) return;
  const work = parent.work;
  const ended = id === 'P09' && parent.id.endsWith('-M');
  const debt = id === 'P02' && parent.id.endsWith('-M') ? 72500 : 0;
  work.zus = {
    sickness: { insured: !ended, kind: parent.employment === 'employment_contract' ? 'mandatory' : 'voluntary', since: work.employedSince,
      ...(ended ? { until: '2026-10-31' } : {}), titleCode: parent.employment === 'employment_contract' ? '0110' : parent.employment === 'self_employed' ? '0510' : '0411' },
    gaps: [], periods: periods(parent).map((p) => ended ? { ...p, to: '2026-10-31' } : p), contributionBase: work.monthlyGross,
    payer: { name: `Płatnik fikcyjny ${parent.id}`, nip: nip(seedOf(parent.id)), regon: regon(seedOf(parent.id)), city: parent.city, paysBenefits: work.benefitPayer === 'employer' },
    arrears: { amount: debt / 100, checkedAt: AS_OF }, benefitHistory: [], leaveHistory: [],
  };
}
export function buildSnapshot(dbPath = DB_PATH, output = OUTPUT) {
  const rows = JSON.parse(readFileSync('src/dev/dummyData/mrodzic_compat_profiles_v1.json', 'utf8'));
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS snapshots (profile_id TEXT PRIMARY KEY, version TEXT NOT NULL, snapshot_json TEXT NOT NULL)');
  db.exec('BEGIN');
  try {
    const insert = db.prepare('INSERT INTO snapshots VALUES (?, ?, ?) ON CONFLICT(profile_id) DO UPDATE SET version=excluded.version,snapshot_json=excluded.snapshot_json');
    for (const row of rows) {
      const p = structuredClone(row.profile); const id = row.profileId;
      enrich(p.me, id); enrich(p.partner, id);
      const first = p.children[0];
      const provenance = { source: 'Generator syntetyczny mRodzic v2', asOf: AS_OF, synthetic: true };
      const snapshot = {
        profileId: id, slug: row.slug, version: VERSION, ...provenance, appProfileV1: p,
        ezla: id === 'P03' || id === 'P02' ? [{ id: `${id}-EZLA-1`, personId: p.me.id, from: '2026-11-16', to: '2026-11-30', code: 'B', ...provenance }] : [],
        hospitalizations: id === 'P05' ? p.children.map((c, i) => ({ childId: c.id, from: c.birthDate, to: i === 0 ? '2026-11-10' : '2026-11-14', birthWeightGrams: i === 0 ? 980 : 1200, gestationalWeek: 27, ...provenance })) : [],
        placement: id === 'P06' || id === 'P07' ? { kind: id === 'P06' ? 'adoption' : 'foster', childId: first.id, date: '2026-11-01', courtApplicationDate: id === 'P06' ? '2026-11-01' : null, schoolDeferral: id === 'P07', professional: false, ...provenance } : null,
        zaZyciem: id === 'P10' ? { childId: first.id, issuedOn: '2026-11-01', ...provenance } : null,
        // Rejestr USC = akty urodzenia dzieci z bazy (także martwo urodzonych – akt z adnotacją, bez PESEL).
        civilRegistry: p.children.filter((c) => c.status === 'born').map((c) => ({
          childId: c.id, birthDate: c.birthDate,
          office: c.birthRegistry?.office ?? `Urząd Stanu Cywilnego w ${p.me.city} (DEMO)`,
          recordId: c.birthRegistry?.actNumber ?? `DEMO-USC-${c.id}`, ...provenance,
        })),
        postInsuranceReason: id === 'P09' ? 'liquidation' : null,
      };
      insert.run(id, VERSION, JSON.stringify(snapshot));
    }
    db.exec('COMMIT');
    const profiles = db.prepare('SELECT snapshot_json FROM snapshots ORDER BY profile_id').all().map((r) => JSON.parse(r.snapshot_json));
    if (output) { mkdirSync(resolve(output, '..'), { recursive: true }); writeFileSync(output, JSON.stringify({ version: VERSION, asOf: AS_OF, profiles }, null, 2) + '\n'); }
    return profiles;
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  finally { db.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Generated ${buildSnapshot().length} synthetic profiles from SQLite into the offline snapshot.`);
}
