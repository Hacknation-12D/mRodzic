import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORAGE_PREFIX } from '../storage/storage';
import type { DocumentStatus, StatusMap } from '../types';

type State = {
  /** Klucz instancji: `${docId}:${childId}` albo `${docId}:household`. Brak wpisu = todo. */
  statuses: StatusMap;
  setStatus: (key: string, status: DocumentStatus, nowIso: string) => void;
  clearForChild: (childId: string) => void;
  clearAll: () => void;
};

export { instanceKey } from './documentKey';

export const useDocumentStatusStore = create<State>()(
  persist(
    (set) => ({
      statuses: {},
      setStatus: (key, status, nowIso) =>
        set((s) => {
          const next = { ...s.statuses };
          if (status === 'todo') delete next[key];
          else next[key] = { status, updatedAt: nowIso };
          return { statuses: next };
        }),
      clearForChild: (childId) =>
        set((s) => ({
          statuses: Object.fromEntries(Object.entries(s.statuses).filter(([k]) => !k.endsWith(`:${childId}`))),
        })),
      clearAll: () => set({ statuses: {} }),
    }),
    {
      name: `${STORAGE_PREFIX}document-status`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ statuses: s.statuses }),
      migrate: (persisted) => persisted as State,
    },
  ),
);
