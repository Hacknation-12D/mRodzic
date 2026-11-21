import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ChatMessage } from '@/core/assistant';
import { onResetAll } from '@/core/storage/resetAll';
import { persistStorage, STORAGE_PREFIX } from '@/core/storage/storage';

export const MAX_MESSAGES_PER_THREAD = 50;

type State = {
  /** Wątek per kontekst dziecka: 'all' albo childId. Wiadomości przechowywane zanonimizowane. */
  threads: Record<string, ChatMessage[]>;
  append: (threadKey: string, message: ChatMessage) => void;
  clearThread: (threadKey: string) => void;
  clearAll: () => void;
};

export const useChatStore = create<State>()(
  persist(
    (set) => ({
      threads: {},
      append: (threadKey, message) =>
        set((s) => ({
          threads: { ...s.threads, [threadKey]: [...(s.threads[threadKey] ?? []), message].slice(-MAX_MESSAGES_PER_THREAD) },
        })),
      clearThread: (threadKey) =>
        set((s) => {
          const threads = { ...s.threads };
          delete threads[threadKey];
          return { threads };
        }),
      clearAll: () => set({ threads: {} }),
    }),
    {
      name: `${STORAGE_PREFIX}chat`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ threads: s.threads }),
      migrate: (persisted) => persisted as State,
    },
  ),
);

onResetAll(() => useChatStore.getState().clearAll());
