import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

import { persistStorage, STORAGE_PREFIX } from '../storage/storage';

const SentRequestSchema = z.object({
  id: z.string(),
  owner: z.string(),
  title: z.string(),
  recipient: z.enum(['employer', 'usc', 'zus']),
  sentAt: z.string(),
  summary: z.string(),
});
export type SentRequest = z.infer<typeof SentRequestSchema>;

type State = { sent: SentRequest[]; add: (r: SentRequest) => void; clear: () => void };

/** Historia symulowanych wysyłek wniosków (do pracodawcy, USC, ZUS). Nic nie opuszcza urządzenia. */
export const useRequestsStore = create<State>()(
  persist(
    (set) => ({
      sent: [],
      add: (r) => set((s) => ({ sent: [SentRequestSchema.parse(r), ...s.sent].slice(0, 100) })),
      clear: () => set({ sent: [] }),
    }),
    {
      name: `${STORAGE_PREFIX}requests-v1`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ sent: s.sent }),
      merge: (saved, current) => {
        const parsed = z.object({ sent: z.array(SentRequestSchema) }).safeParse(saved);
        return { ...current, sent: parsed.success ? parsed.data.sent : [] };
      },
    },
  ),
);
