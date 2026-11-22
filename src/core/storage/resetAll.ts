import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRequestsStore } from '../requests/requests.store';
import { useApplicationStore } from '../applications/application.store';

import { useClockStore } from '../clock/clock';
import { useDocumentStatusStore } from '../documents/documentStatus.store';
import { useChildFilterStore } from '../filters/childFilter.store';
import { useProfileStore } from '../profile/profile.store';
import { useSettingsStore } from '../settings/settings.store';
import { clearFamilySession } from '../supabase/client';
import { STORAGE_PREFIX } from './storage';

type Listener = () => void;
const listeners = new Set<Listener>();

/** Store'y w features (np. historia czatu) rejestrują się tu, żeby wyczyścić się przy „Usuń wszystkie dane”. */
export function onResetAll(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Usuwa profil, statusy, ustawienia i wszystkie dane aplikacji z AsyncStorage. */
export async function resetAllData(options: { keepDevSettings?: boolean } = {}): Promise<void> {
  clearFamilySession();
  useProfileStore.getState().resetAll();
  useApplicationStore.getState().clear();
  useRequestsStore.getState().clear();
  useDocumentStatusStore.getState().clearAll();
  useChildFilterStore.getState().setFilter('all');
  if (!options.keepDevSettings) {
    useClockStore.getState().setOverrideDate(null);
    useSettingsStore.getState().setAssistantModeOverride(null);
  }
  listeners.forEach((l) => l());
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
    const toRemove = options.keepDevSettings ? ours.filter((k) => !k.endsWith('clock') && !k.endsWith('settings')) : ours;
    await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn('resetAllData: AsyncStorage error', e);
  }
}
