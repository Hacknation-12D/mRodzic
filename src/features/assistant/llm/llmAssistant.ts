import { AssistantError, type AssistantContext, type AssistantReply, type ChatMessage } from '@/core/assistant';

import { getLlmConfig } from './config';
import { buildSystemPrompt } from './systemPrompt';

const TIMEOUT_MS = 40_000;
/** Pamięć: 2 poprzednie pary pytanie–odpowiedź + bieżące pytanie. */
const MAX_HISTORY = 2 * 2 + 1;

/** Czy skonfigurowano model (settings.json). */
export const isLlmConfigured = (): boolean => getLlmConfig() !== null;

/** Wywołanie czatu zgodnego z OpenAI (OpenAI i DeepSeek używają tego samego formatu). */
export async function askLlm(history: ChatMessage[], ctx: AssistantContext, knowledge: string, signal?: AbortSignal): Promise<AssistantReply> {
  const cfg = getLlmConfig();
  if (!cfg) throw new AssistantError('config', 'AI provider not configured');

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.3,
        stream: false,
        messages: [
          { role: 'system', content: buildSystemPrompt(ctx, knowledge) },
          ...history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.text.slice(0, 2000) })),
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AssistantError('server', `HTTP ${res.status}`, res.status);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new AssistantError('invalid_response', 'Empty model response');
    return { text: raw, sources: [] };
  } catch (e) {
    if (e instanceof AssistantError) throw e;
    if (signal?.aborted) throw new AssistantError('aborted', 'aborted');
    if (timedOut) throw new AssistantError('timeout', 'timeout');
    throw new AssistantError('network', e instanceof Error ? e.message : 'network error');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
