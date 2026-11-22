import { flushSupportQueue } from '../assistant/humanSupport';
import { startContentSync } from '../content/contentSync';
import { syncLegalParameters } from '../legal/legal.store';

/** Zadania w tle po hydratacji: sync treści i parametrów prawnych (Supabase) oraz kolejka zgłoszeń. Zwraca sprzątanie. */
export function runStartupTasks(): () => void {
  const stopSync = startContentSync();
  void flushSupportQueue().catch(() => undefined);
  void syncLegalParameters();
  return stopSync;
}
