import { create } from 'zustand';

import type { ContentBundle } from '../types';
import type { ContentSource } from './ContentRepository';
import { getSeedBundle } from './seedRepository';

type State = {
  bundle: ContentBundle;
  source: ContentSource;
  lastSyncAt: string | null;
  syncError: string | null;
  syncing: boolean;
  setBundle: (bundle: ContentBundle, source: ContentSource) => void;
  setSyncState: (patch: Partial<Pick<State, 'lastSyncAt' | 'syncError' | 'syncing'>>) => void;
};

/** Aktualny ContentBundle. Startuje od seeda, więc aplikacja renderuje się od razu. */
export const useContentStore = create<State>()((set) => ({
  bundle: getSeedBundle(),
  source: 'seed',
  lastSyncAt: null,
  syncError: null,
  syncing: false,
  setBundle: (bundle, source) => set({ bundle, source }),
  setSyncState: (patch) => set(patch),
}));

export function useBundle(): ContentBundle {
  return useContentStore((s) => s.bundle);
}
