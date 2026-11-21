import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Wspólny storage dla store'ów z `persist`. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

/** Prefiks kluczy – ułatwia „Wyczyść wszystko”. */
export const STORAGE_PREFIX = 'rodzic:';

type PersistApi = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
};

/** Czeka, aż wszystkie podane store'y wczytają dane z AsyncStorage. */
export function waitForHydration(stores: PersistApi[]): Promise<void> {
  return Promise.all(
    stores.map(
      (s) =>
        new Promise<void>((resolve) => {
          if (s.persist.hasHydrated()) return resolve();
          const unsub = s.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        }),
    ),
  ).then(() => undefined);
}
