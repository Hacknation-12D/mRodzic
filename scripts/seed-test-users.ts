import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from './lib/supabaseAdmin';

const url = process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const browserUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const annaCity = 'Łódź';
const families = [
  {
    email: 'anna.zam@example.test',
    parent: { firstName: 'Żaneta', lastName: 'Łącka', birthDate: '1990-05-14', street: 'Źródlana', houseNumber: '12A', apartmentNumber: '3', city: annaCity, postalCode: '90-001', pesel: '90051412349', employment: 'employment_contract' },
    children: [{ id: 'demo-zam-zosia', name: 'Zofia', status: 'born', birthDate: '2026-09-15', birthPlace: annaCity, sex: 'female' }],
  },
  {
    email: 'michal.zam@example.test',
    parent: { firstName: 'Michał', lastName: 'Żółciński', birthDate: '1992-02-29', street: 'Świerkowa', houseNumber: '8', city: 'Gdańsk', postalCode: '80-001', pesel: '92022954321', employment: 'self_employed' },
    children: [
      { id: 'demo-zam-jan', name: 'Jaś', status: 'born', birthDate: '2026-10-21', sex: 'male' },
      { id: 'demo-zam-lucja', name: 'Łucja', status: 'born', birthDate: '2026-10-21', sex: 'female' },
    ],
  },
];

async function findTestUser(admin: SupabaseClient, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email === email);
    if (user || data.users.length < 100) return user;
  }
}

async function main() {
  if (!url || !browserUrl || !publicKey) throw new Error('Ustaw URL i klucz publiczny Supabase w .env.');
  const target = new URL(url);
  if (target.origin !== new URL(browserUrl).origin) throw new Error('Oba adresy Supabase muszą wskazywać ten sam projekt.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  const projectRef = process.env.SUPABASE_TEST_PROJECT_REF?.trim();
  if (!local && (!projectRef || target.origin !== `https://${projectRef}.supabase.co`)) {
    throw new Error('Ustaw SUPABASE_TEST_PROJECT_REF na identyfikator projektu testowego w Supabase Online.');
  }
  const password = process.env.SUPABASE_TEST_USERS_PASSWORD?.trim() || (local ? 'ZamDemo-2026!' : '');
  if (!local && (password.length < 16 || password === 'ZamDemo-2026!')) throw new Error('Ustaw własne hasło testowe o długości co najmniej 16 znaków w SUPABASE_TEST_USERS_PASSWORD.');
  const admin = createAdminClient();
  for (const { email, parent, children } of families) {
    const existing = await findTestUser(admin, email);
    if (existing && existing.app_metadata.local_zam_demo !== true) throw new Error(`Adres ${email} jest już używany przez inne konto.`);
    if (!existing) {
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { local_zam_demo: true } });
      if (error) throw error;
    }
    const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    const { error: saveError } = await client.rpc('save_family_profile', { parent_data: parent, children_data: children });
    if (saveError) throw saveError;
    await client.auth.signOut({ scope: 'local' });
    console.log(`Zapisano konto testowe ${email} (${children.length} dzieci).`);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
