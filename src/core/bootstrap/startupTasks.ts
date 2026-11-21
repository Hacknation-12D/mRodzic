import { flushSupportQueue } from '../assistant/humanSupport';
import { startContentSync } from '../content/contentSync';

/** Zadania w tle po hydratacji: sync treści (cache → seed → Supabase) i kolejka zgłoszeń. Zwraca sprzątanie. */
export function runStartupTasks(): () => void {
  const stopSync = startContentSync();
  void flushSupportQueue().catch(() => undefined);
  return stopSync;
}
