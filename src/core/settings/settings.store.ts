import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { env, type AssistantMode } from '../config/env';
import { persistStorage, STORAGE_PREFIX } from '../storage/storage';

type State = {
  /** Nadpisanie trybu asystenta z DevPanelu; null = wartość z env. */
  assistantModeOverride: AssistantMode | null;
  setAssistantModeOverride: (mode: AssistantMode | null) => void;
  /** Nadpisanie motywu urządzenia; null = motyw systemowy. */
  themeOverride: 'light' | 'dark' | null;
  setThemeOverride: (mode: 'light' | 'dark' | null) => void;
};

export const useSettingsStore = create<State>()(
  persist(
    (set) => ({
      assistantModeOverride: null,
      setAssistantModeOverride: (assistantModeOverride) => set({ assistantModeOverride }),
      themeOverride: null,
      setThemeOverride: (themeOverride) => set({ themeOverride }),
    }),
    {
      name: `${STORAGE_PREFIX}settings`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ assistantModeOverride: s.assistantModeOverride, themeOverride: s.themeOverride }),
      migrate: (persisted) => persisted as State,
    },
  ),
);

export function getAssistantMode(): AssistantMode {
  return useSettingsStore.getState().assistantModeOverride ?? env.assistantMode;
}

export function useAssistantMode(): AssistantMode {
  return useSettingsStore((s) => s.assistantModeOverride) ?? env.assistantMode;
}
