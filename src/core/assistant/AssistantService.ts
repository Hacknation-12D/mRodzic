import type { Source } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  sources?: Source[];
  /** Odpowiedź z mocka, bo tryb remote nie odpowiedział. */
  usedFallback?: boolean;
  /** Asystent nie znalazł odpowiedzi – UI proponuje „Zapytaj człowieka”. */
  suggestHuman?: boolean;
}

export interface AssistantContext {
  /** Z anonymize.ts – bez imion i dat. */
  profileSummary: string;
  /** „Dziecko 1: 4. miesiąc życia” (bez imienia). */
  childLabel?: string;
  focusDocumentId?: string;
  /** 5–8 dokumentów z najbliższym terminem dla wybranego kontekstu. */
  relevantDocumentIds: string[];
  contentVersion: number;
}

export interface AssistantReply {
  text: string;
  sources: Source[];
  usedFallback?: boolean;
  suggestHuman?: boolean;
}

export interface AssistantService {
  ask(history: ChatMessage[], ctx: AssistantContext, signal?: AbortSignal): Promise<AssistantReply>;
}

export interface HumanSupportService {
  submit(q: { question: string; contact: string; context: AssistantContext }): Promise<{ ticketId: string; queued: boolean }>;
}

export type AssistantErrorKind = 'network' | 'timeout' | 'server' | 'aborted' | 'config' | 'invalid_response';

export class AssistantError extends Error {
  constructor(
    public readonly kind: AssistantErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AssistantError';
  }
}

export function isAbortError(e: unknown): boolean {
  return (e instanceof AssistantError && e.kind === 'aborted') || (e instanceof Error && e.name === 'AbortError');
}
