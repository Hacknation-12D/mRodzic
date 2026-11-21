import settings from '../../../../settings.json';

export type AiProvider = 'openai' | 'deepseek';

type Resolved = { provider: AiProvider; apiKey: string; model: string; baseUrl: string };

const s = settings as Record<string, string | undefined>;

// Expo podmienia EXPO_PUBLIC_* statycznie – klucze czytamy literalnie, z .env.
const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

/**
 * Dostawca i modele z `settings.json` (główny folder), klucze z `.env`.
 * UWAGA: EXPO_PUBLIC_* trafia do bundla aplikacji – klucze używaj wyłącznie na czas testów.
 * Zwraca null, gdy brak klucza (wtedy asystent działa jak dotąd: mock / remote).
 */
export function getLlmConfig(): Resolved | null {
  const provider: AiProvider = s.AI_PROVIDER?.trim().toLowerCase() === 'openai' ? 'openai' : 'deepseek';
  const apiKey = (provider === 'openai' ? OPENAI_API_KEY : DEEPSEEK_API_KEY)?.trim();
  if (!apiKey) return null;
  return provider === 'openai'
    ? { provider, apiKey, model: s.OPENAI_MODEL?.trim() || 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1' }
    : { provider, apiKey, model: s.DEEPSEEK_MODEL?.trim() || 'deepseek-flash', baseUrl: 'https://api.deepseek.com' };
}
