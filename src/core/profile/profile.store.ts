import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useDocumentStatusStore } from '../documents/documentStatus.store';
import { useChildFilterStore } from '../filters/childFilter.store';
import { ProfileSchema } from '../schemas/profile';
import { persistStorage, STORAGE_PREFIX } from '../storage/storage';
import type { Child, Household, Parent, Profile } from '../types';
import { nextChildColor } from './childColors';

export type NewChildInput = Omit<Child, 'id' | 'colorKey'> & { id?: string; colorKey?: Child['colorKey'] };

export type MarkBornInput = {
  birthDate: string;
  name?: string;
  sex?: Child['sex'];
  premature?: boolean;
};

type State = {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  updateMe: (patch: Partial<Omit<Parent, 'id'>>) => void;
  setPartner: (partner: Parent) => void;
  removePartner: () => void;
  updateHousehold: (patch: Partial<Household>) => void;
  addChild: (child: NewChildInput) => string | null;
  updateChild: (childId: string, patch: Partial<Omit<Child, 'id'>>) => void;
  removeChild: (childId: string) => boolean;
  /** Zachowuje to samo id → statusy dokumentów zostają. */
  markChildBorn: (childId: string, input: MarkBornInput) => void;
  resetAll: () => void;
};

const nowIso = () => new Date().toISOString();

function randomId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function touch(profile: Profile, patch: Partial<Profile>): Profile {
  return { ...profile, ...patch, updatedAt: nowIso() };
}

export const useProfileStore = create<State>()(
  persist(
    (set, get) => ({
      profile: null,

      setProfile: (profile) => set({ profile: { ...profile, updatedAt: nowIso() } }),

      updateMe: (patch) => {
        const p = get().profile;
        if (p) set({ profile: touch(p, { me: { ...p.me, ...patch } }) });
      },

      setPartner: (partner) => {
        const p = get().profile;
        if (p) set({ profile: touch(p, { partner }) });
      },

      removePartner: () => {
        const p = get().profile;
        if (p) set({ profile: touch(p, { partner: undefined }) });
      },

      updateHousehold: (patch) => {
        const p = get().profile;
        if (p) set({ profile: touch(p, { household: { ...p.household, ...patch } }) });
      },

      addChild: (input) => {
        const p = get().profile;
        if (!p) return null;
        const child: Child = {
          ...input,
          id: input.id ?? randomId('child_'),
          colorKey: input.colorKey ?? nextChildColor(p.children),
        };
        set({ profile: touch(p, { children: [...p.children, child] }) });
        return child.id;
      },

      updateChild: (childId, patch) => {
        const p = get().profile;
        if (!p) return;
        set({ profile: touch(p, { children: p.children.map((c) => (c.id === childId ? { ...c, ...patch } : c)) }) });
      },

      removeChild: (childId) => {
        const p = get().profile;
        if (!p || p.children.length <= 1) return false;
        set({ profile: touch(p, { children: p.children.filter((c) => c.id !== childId) }) });
        useDocumentStatusStore.getState().clearForChild(childId);
        const filter = useChildFilterStore.getState();
        if (filter.filter === childId) filter.setFilter('all');
        return true;
      },

      markChildBorn: (childId, input) => {
        const p = get().profile;
        if (!p) return;
        set({
          profile: touch(p, {
            children: p.children.map((c) =>
              c.id === childId
                ? {
                    ...c,
                    status: 'born',
                    birthDate: input.birthDate,
                    name: input.name?.trim() || c.name,
                    sex: input.sex ?? c.sex,
                    premature: input.premature ?? c.premature,
                  }
                : c,
            ),
          }),
        });
      },

      resetAll: () => {
        set({ profile: null });
        useDocumentStatusStore.getState().clearAll();
        useChildFilterStore.getState().setFilter('all');
      },
    }),
    {
      name: `${STORAGE_PREFIX}profile`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ profile: s.profile }),
      migrate: (persisted) => persisted as State,
      // Odporność: uszkodzony profil w storage → traktujemy jak brak profilu (onboarding).
      merge: (persisted, current) => {
        const raw = (persisted as { profile?: unknown } | undefined)?.profile;
        if (raw == null) return { ...current, profile: null };
        const parsed = ProfileSchema.safeParse(raw);
        if (!parsed.success) console.warn('Niepoprawny profil w pamięci – pomijam', parsed.error.issues.slice(0, 3));
        return { ...current, profile: parsed.success ? parsed.data : null };
      },
    },
  ),
);
