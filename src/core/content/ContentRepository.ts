import type { ContentBundle } from '../types';

export interface ContentRepository {
  /** Aktualna wersja treści po stronie źródła; null = niedostępne (offline / brak konfiguracji). */
  getRemoteVersion(): Promise<number | null>;
  fetchBundle(): Promise<ContentBundle>;
}

export type ContentSource = 'seed' | 'cache' | 'remote';
