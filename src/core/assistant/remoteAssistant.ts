import { z } from 'zod';

import { env } from '../config/env';
import { AssistantError, type AssistantContext, type AssistantReply, type AssistantService, type ChatMessage } from './AssistantService';

const TIMEOUT_MS = 40_000;
const MAX_MESSAGES = 12;

const ReplySchema = z.object({
  text: z.string(),
  sources: z.array(z.object({ name: z.string().optional(), url: z.string().optional(), asOf: z.string().optional() })).default([]),
});

/** Woła Supabase Edge Function `assistant` (OpenAI po stronie serwera). */
export function createRemoteAssistant(): AssistantService {
  return {
    async ask(history: ChatMessage[], ctx: AssistantContext, signal?: AbortSignal): Promise<AssistantReply> {
      if (!env.supabaseUrl || !env.supabaseAnonKey) throw new AssistantError('config', 'Supabase is not configured');

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, TIMEOUT_MS);
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);

      try {
        const res = await fetch(`${env.supabaseUrl}/functions/v1/assistant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: env.supabaseAnonKey,
            Authorization: `Bearer ${env.supabaseAnonKey}`,
          },
          body: JSON.stringify({
            messages: history.slice(-MAX_MESSAGES).map((m) => ({ role: m.role, text: m.text.slice(0, 2000) })),
            context: ctx,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new AssistantError('server', `HTTP ${res.status}`, res.status);
        const parsed = ReplySchema.safeParse(await res.json());
        if (!parsed.success) throw new AssistantError('invalid_response', 'Invalid assistant response');
        return {
          text: parsed.data.text,
          sources: parsed.data.sources.map((s) => ({ name: s.name ?? s.url ?? '', url: s.url, asOf: s.asOf ?? '' })).filter((s) => s.name),
        };
      } catch (e) {
        if (e instanceof AssistantError) throw e;
        if (signal?.aborted) throw new AssistantError('aborted', 'aborted');
        if (timedOut) throw new AssistantError('timeout', 'timeout');
        throw new AssistantError('network', e instanceof Error ? e.message : 'network error');
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
