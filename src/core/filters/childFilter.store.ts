import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORAGE_PREFIX } from '../storage/storage';
import type { ChildFilter } from '../types';

type State = {
  /** Wspólny filtr Kalendarza i Dokumentów: 'all' albo childId. */
  filter: ChildFilter;
  setFilter: (filter: ChildFilter) => void;
};

export const useChildFilterStore = create<State>()(
  persist(
    (set) => ({
      filter: 'all',
      setFilter: (filter) => set({ filter }),
    }),
    {
      name: `${STORAGE_PREFIX}child-filter`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ filter: s.filter }),
      migrate: (persisted) => persisted as State,
    },
  ),
);
