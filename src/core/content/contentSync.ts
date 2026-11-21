import { AppState } from 'react-native';

import { getSupabase } from '../supabase/client';
import { useContentStore } from './content.store';
import { loadCachedBundle, saveCachedBundle } from './contentCache';
import type { ContentRepository } from './ContentRepository';
import { getSeedBundle } from './seedRepository';
import { createSupabaseRepository } from './supabaseRepository';

const MIN_INTERVAL_MS = 15 * 60 * 1000;
let lastAttemptAt = 0;
let inFlight: Promise<void> | null = null;

function remoteRepository(): ContentRepository | null {
  const client = getSupabase();
  return client ? createSupabaseRepository(client) : null;
}

/** 1. Start: cache (jeśli nowszy niż seed) → inaczej seed. Aplikacja renderuje się od razu na seedzie. */
export async function initContent(): Promise<void> {
  const cached = await loadCachedBundle();
  const seed = getSeedBundle();
  if (cached && cached.version >= seed.version) useContentStore.getState().setBundle(cached, 'cache');
}

/** 2. Sync w tle: jeśli wersja zdalna > lokalnej → pobierz, zapisz w cache, podmień w store. */
export function syncContent({ force = false }: { force?: boolean } = {}): Promise<void> {
  const repo = remoteRepository();
  if (!repo) return Promise.resolve();
  if (inFlight) return inFlight;
  const now = Date.now();
  if (!force && now - lastAttemptAt < MIN_INTERVAL_MS) return Promise.resolve();
  lastAttemptAt = now;

  const store = useContentStore.getState();
  store.setSyncState({ syncing: true });
  inFlight = (async () => {
    try {
      const remoteVersion = await repo.getRemoteVersion();
      if (remoteVersion === null) throw new Error('offline');
      const local = useContentStore.getState().bundle;
      if (remoteVersion > local.version) {
        const bundle = await repo.fetchBundle();
        await saveCachedBundle(bundle);
        useContentStore.getState().setBundle(bundle, 'remote');
      }
      useContentStore.getState().setSyncState({ lastSyncAt: new Date().toISOString(), syncError: null });
    } catch (e) {
      useContentStore.getState().setSyncState({ syncError: e instanceof Error ? e.message : String(e) });
    } finally {
      useContentStore.getState().setSyncState({ syncing: false });
      inFlight = null;
    }
  })();
  return inFlight;
}

/** 3. Start + ponowienie przy powrocie aplikacji na pierwszy plan (max co 15 min). */
export function startContentSync(): () => void {
  void initContent().then(() => syncContent({ force: true }));
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncContent();
  });
  return () => sub.remove();
}
