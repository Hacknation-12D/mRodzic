import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomInt } from 'node:crypto';
import { buildSnapshot } from './snapshot.mjs';
export function startServer(port = 8765, database = 'scripts/demo/mrodzic_zus_demo.sqlite3') {
  buildSnapshot(database);
  const db = new DatabaseSync(database, { readOnly: true });
  const origins = new Set((process.env.DEMO_ORIGINS ?? 'http://localhost:8081,http://localhost:8082,http://localhost:4173').split(','));
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origin && origins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } : {}) }); res.end(JSON.stringify(body)); };
    if (origin && !origins.has(origin)) return respond(403, { error: 'Origin denied' });
    if (req.method === 'OPTIONS') return respond(204, null);
    const records = db.prepare('SELECT snapshot_json FROM snapshots ORDER BY profile_id').all().map((r) => JSON.parse(r.snapshot_json));
    const identity = (s) => { const p = s.appProfileV1.me; return { firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate, city: p.city }; };
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') return respond(200, { status: 'simulation', profiles: records.length });
    if (req.method === 'GET' && path === '/api/demo-profiles') return respond(200, { profiles: records.map((r) => ({ profileId: r.profileId, slug: r.slug, label: `${r.profileId} – ${r.appProfileV1.me.firstName}`, sensitive: r.profileId === 'P08' })) });
    const match = path.match(/^\/api\/(demo-snapshot|mock\/(?:zus|pue|ezla|usc|mobywatel))\/(P\d{2})$/);
    if (req.method === 'GET' && match) {
      const s = records.find((r) => r.profileId === match[2]); if (!s) return respond(404, { error: 'Profile not found' });
      return respond(200, match[1] === 'mock/mobywatel' ? identity(s) : match[1] === 'mock/ezla' ? { ...s, records: s.ezla } : match[1] === 'mock/usc' ? { ...s, records: s.civilRegistry } : s);
    }
    if (req.method === 'POST' && path === '/api/demo-login') {
      let text = '';
      for await (const chunk of req) { text += chunk; if (text.length > 4096) return respond(413, { error: 'Body too large' }); }
      try {
        const body = JSON.parse(text || '{}');
        if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some((k) => k !== 'profileId')) return respond(400, { error: 'Expected profileId' });
        const pool = records.filter((r) => r.profileId !== 'P08');
        const s = body.profileId === undefined ? pool[randomInt(pool.length)] : records.find((r) => r.profileId === body.profileId);
        if (!s) return respond(404, { error: 'Profile not found' });
        return respond(200, { ...s, mobywatel: identity(s) });
      } catch { return respond(400, { error: 'Invalid JSON' }); }
    }
    return respond(404, { error: 'No real submission endpoints' });
  });
  server.on('close', () => db.close()); server.listen(port, '127.0.0.1'); return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) { startServer(); console.log('Synthetic SQLite API: http://127.0.0.1:8765'); }
