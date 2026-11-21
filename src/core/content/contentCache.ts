import AsyncStorage from '@react-native-async-storage/async-storage';

import { ContentBundleSchema } from '../schemas/content';
import { STORAGE_PREFIX } from '../storage/storage';
import type { ContentBundle } from '../types';

/** Klucz zawiera wersję SCHEMATU – po zmianie schematu stary cache jest ignorowany. */
export const CONTENT_CACHE_SCHEMA_VERSION = 1;
const KEY = `${STORAGE_PREFIX}content-bundle:v${CONTENT_CACHE_SCHEMA_VERSION}`;

export async function loadCachedBundle(): Promise<ContentBundle | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = ContentBundleSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveCachedBundle(bundle: ContentBundle): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(bundle));
  } catch (e) {
    console.warn('[content] Nie udało się zapisać cache', e);
  }
}

export async function clearCachedBundle(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
