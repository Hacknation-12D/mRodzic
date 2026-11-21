import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { nowIso } from '../clock/clock';
import { persistStorage, STORAGE_PREFIX } from '../storage/storage';
import { onResetAll } from '../storage/resetAll';
import { getSupabase } from '../supabase/client';
import type { AssistantContext, HumanSupportService } from './AssistantService';

export type SupportTicket = {
  id: string;
  question: string;
  contact: string;
  context: AssistantContext;
  createdAt: string;
  status: 'sent' | 'queued';
};

type State = {
  tickets: SupportTicket[];
  add: (t: SupportTicket) => void;
  markSent: (id: string) => void;
  clear: () => void;
};

/** Zgłoszenia zapisane na urządzeniu (także te czekające na wysłanie). */
export const useSupportTicketsStore = create<State>()(
  persist(
    (set) => ({
      tickets: [],
      add: (t) => set((s) => ({ tickets: [t, ...s.tickets].slice(0, 50) })),
      markSent: (id) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status: 'sent' } : t)) })),
      clear: () => set({ tickets: [] }),
    }),
    {
      name: `${STORAGE_PREFIX}support-tickets`,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ tickets: s.tickets }),
      migrate: (persisted) => persisted as State,
    },
  ),
);

onResetAll(() => useSupportTicketsStore.getState().clear());

export const QUESTION_MAX = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s-]{9,16}$/;

export function isValidContact(contact: string): boolean {
  const v = contact.trim();
  return EMAIL.test(v) || PHONE.test(v);
}

function ticketId(): string {
  return `ZG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function send(ticket: SupportTicket): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  // anon ma tylko INSERT (bez SELECT) – numer zgłoszenia generujemy lokalnie i zapisujemy w context.
  const { error } = await supabase.from('support_requests').insert({
    question: ticket.question.slice(0, QUESTION_MAX),
    contact: ticket.contact.slice(0, 200),
    context: { ...ticket.context, ticketId: ticket.id },
  });
  if (error) throw new Error(error.message);
}

/** Wysyłka do Supabase `support_requests`; bez połączenia/konfiguracji → kolejka lokalna. */
export const humanSupport: HumanSupportService = {
  async submit({ question, contact, context }) {
    const ticket: SupportTicket = { id: ticketId(), question: question.trim(), contact: contact.trim(), context, createdAt: nowIso(), status: 'queued' };
    useSupportTicketsStore.getState().add(ticket);
    try {
      await send(ticket);
      useSupportTicketsStore.getState().markSent(ticket.id);
      return { ticketId: ticket.id, queued: false };
    } catch (e) {
      console.warn('Zgłoszenie zapisane lokalnie (kolejka)', e instanceof Error ? e.message : e);
      return { ticketId: ticket.id, queued: true };
    }
  },
};

/** Ponawia wysyłkę zgłoszeń z kolejki (przy starcie aplikacji). */
export async function flushSupportQueue(): Promise<number> {
  if (!getSupabase()) return 0;
  let sent = 0;
  for (const t of useSupportTicketsStore.getState().tickets.filter((x) => x.status === 'queued')) {
    try {
      await send(t);
      useSupportTicketsStore.getState().markSent(t.id);
      sent++;
    } catch {
      break; // nadal offline – spróbujemy przy następnym starcie
    }
  }
  return sent;
}
