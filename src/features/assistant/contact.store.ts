import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { onResetAll } from '@/core/storage/resetAll';
import { persistStorage, STORAGE_PREFIX } from '@/core/storage/storage';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (v: string): boolean => EMAIL.test(v.trim());

type State = {
  /** E-mail do odpowiedzi zespołu – podany raz, zapisany lokalnie (profil nie zawiera adresu e-mail). */
  email: string | null;
  setEmail: (email: string | null) => void;
};

export const useContactStore = create<State>()(
  persist(
    (set) => ({ email: null, setEmail: (email) => set({ email: email?.trim() || null }) }),
    {
      name: `${STORAGE_PREFIX}assistant-contact`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ email: s.email }),
      migrate: (persisted) => persisted as State,
    },
  ),
);

onResetAll(() => useContactStore.getState().setEmail(null));
