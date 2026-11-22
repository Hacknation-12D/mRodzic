import { useEffect, useState } from 'react';
import { useApplicationStore } from '../applications/application.store';

import { useClockStore } from '../clock/clock';
import { useLegalStore } from '../legal/legal.store';
import { useRequestsStore } from '../requests/requests.store';
import { useDocumentStatusStore } from '../documents/documentStatus.store';
import { useChildFilterStore } from '../filters/childFilter.store';
import { useProfileStore } from '../profile/profile.store';
import { useSettingsStore } from '../settings/settings.store';
import { waitForHydration } from '../storage/storage';
import type { Profile } from '../types';
import { runStartupTasks } from './startupTasks';

type Options = {
  /** Tworzy profil demo lub uzupełnia brakujące dane zapisanej persony. */
  prepareProfile?: (profile: Profile | null) => Profile | null;
};

/**
 * Hydratacja store'ów z AsyncStorage, opcjonalne wczytanie persony,
 * uruchomienie synchronizacji treści i kolejki zgłoszeń.
 */
export function useAppBootstrap({ prepareProfile }: Options = {}): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stopTasks: (() => void) | undefined;

    waitForHydration([useProfileStore, useApplicationStore, useDocumentStatusStore, useChildFilterStore, useClockStore, useSettingsStore, useLegalStore, useRequestsStore])
      .then(() => {
        if (cancelled) return;
        const { profile, setProfile, demoProfileId } = useProfileStore.getState();
        const prepared = demoProfileId ? null : prepareProfile?.(profile);
        if (prepared) setProfile(prepared);
        stopTasks = runStartupTasks();
      })
      .catch((e) => console.warn('Bootstrap error', e))
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      stopTasks?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uruchamiamy raz przy starcie
  }, []);

  return ready;
}
