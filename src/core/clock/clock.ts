import { parseISO, startOfDay } from 'date-fns';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORAGE_PREFIX } from '../storage/storage';

type ClockState = {
  /** ISO YYYY-MM-DD; null = prawdziwa data. Ustawiane w DevPanelu (demo). */
  overrideDate: string | null;
  setOverrideDate: (iso: string | null) => void;
};

export const useClockStore = create<ClockState>()(
  persist(
    (set) => ({
      overrideDate: null,
      setOverrideDate: (overrideDate) => set({ overrideDate }),
    }),
    {
      name: `${STORAGE_PREFIX}clock`,
      storage: persistStorage,
      version: 1,
      migrate: (persisted) => persisted as ClockState,
    },
  ),
);

/**
 * „Dzisiaj” (początek dnia). Cała logika używa tej funkcji (albo useToday),
 * nigdy `new Date()` bezpośrednio.
 */
export function getToday(): Date {
  const override = useClockStore.getState().overrideDate;
  return startOfDay(override ? parseISO(override) : new Date());
}

/** Znacznik czasu ISO zgodny z „dzisiaj” (data z DevPanelu + bieżąca godzina). */
export function nowIso(): string {
  const now = new Date();
  const override = useClockStore.getState().overrideDate;
  if (!override) return now.toISOString();
  const d = parseISO(override);
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  return d.toISOString();
}
