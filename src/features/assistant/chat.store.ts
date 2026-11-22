import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ChatMessage } from '@/core/assistant';
import { onResetAll } from '@/core/storage/resetAll';
import { persistStorage, STORAGE_PREFIX } from '@/core/storage/storage';

export const MAX_MESSAGES_PER_THREAD = 50;

/** Po jakim czasie nieobecności w czacie historia rozmów jest usuwana. Zmień tę wartość, by dostosować czas. */
export const CHAT_HISTORY_TTL_MS = 5 * 60 * 1000;

type State = {
  /** Wątek per kontekst dziecka: 'all' albo childId. Wiadomości przechowywane zanonimizowane. */
  threads: Record<string, ChatMessage[]>;
  /** Moment ostatniego wyjścia z czatu (null = użytkownik jest w czacie). */
  leftAt: number | null;
  markLeft: () => void;
  /** Wejście do czatu: czyści historię, jeśli użytkownika nie było dłużej niż CHAT_HISTORY_TTL_MS. */
  markEntered: () => void;
  append: (threadKey: string, message: ChatMessage) => void;
  clearThread: (threadKey: string) => void;
  clearAll: () => void;
};

export const useChatStore = create<State>()(
  persist(
    (set) => ({
      threads: {},
      leftAt: null,
      markLeft: () => set({ leftAt: Date.now() }),
      markEntered: () =>
        set((s) => ({
          threads: s.leftAt !== null && Date.now() - s.leftAt > CHAT_HISTORY_TTL_MS ? {} : s.threads,
          leftAt: null,
        })),
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
      clearAll: () => set({ threads: {}, leftAt: null }),
    }),
    {
      name: `${STORAGE_PREFIX}chat`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ threads: s.threads, leftAt: s.leftAt }),
      migrate: (persisted) => persisted as State,
    },
  ),
);

onResetAll(() => useChatStore.getState().clearAll());
