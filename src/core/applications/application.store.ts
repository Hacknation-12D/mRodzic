import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

import { persistStorage, STORAGE_PREFIX } from '../storage/storage';
import { ApplicationDraftSchema, type ApplicationDraft } from './model';

type State = { drafts: ApplicationDraft[]; put: (draft: ApplicationDraft) => void; clear: () => void };
export const useApplicationStore = create<State>()(persist((set) => ({
  drafts: [],
  put: (draft) => set((s) => ({ drafts: [...s.drafts.filter((d) => d.id !== draft.id), ApplicationDraftSchema.parse(draft)] })),
  clear: () => set({ drafts: [] }),
}), {
  name: `${STORAGE_PREFIX}applications-v1`, storage: persistStorage, version: 1,
  partialize: (s) => ({ drafts: s.drafts }),
  merge: (saved, current) => {
    const parsed = z.object({ drafts: z.array(ApplicationDraftSchema) }).safeParse(saved);
    return { ...current, drafts: parsed.success ? parsed.data.drafts : [] };
  },
}));
