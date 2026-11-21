// Supabase Edge Function (Deno): asystent AI oparty o OpenAI Responses API.
// Deploy:  supabase functions deploy assistant
// Sekrety: supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=... [OPENAI_WEB_SEARCH=true]
//
// Klucz OpenAI istnieje WYŁĄCZNIE tutaj (po stronie serwera). Aplikacja wysyła tylko
// zanonimizowany kontekst (bez imion i dat) i ostatnie ≤ 12 wiadomości.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

// ---------- Konfiguracja ----------
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
// Celowo bez domyślnego modelu – ustaw aktualny model sekretem OPENAI_MODEL (patrz README).
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? '';
const OPENAI_WEB_SEARCH = (Deno.env.get('OPENAI_WEB_SEARCH') ?? 'false').toLowerCase() === 'true';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// TODO(verify): w nowych projektach Supabase klucz może nazywać się SUPABASE_PUBLISHABLE_KEY.
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const RATE_LIMIT_PER_MINUTE = 10;
const MAX_BODY_CHARS_PER_DOC = 2500;
const OPENAI_TIMEOUT_MS = 25_000;

const PREFERRED_DOMAINS = ['gov.pl', 'zus.pl', 'nfz.gov.pl', 'biznes.gov.pl', 'mrips.gov.pl'];

const SYSTEM_PROMPT = `Jesteś asystentem aplikacji pomagającej rodzicom w Polsce w sprawach świadczeń, urlopów i formalności związanych z ciążą i dziećmi.
Zasady:
- Odpowiadaj po polsku, prosto i konkretnie, maks. ok. 200 słów, chyba że użytkownik prosi o więcej. Używaj krótkich list kroków.
- Opieraj się przede wszystkim na sekcji KONTEKST (treści aplikacji ze stanem prawnym „stan na”). Jeśli czegoś w niej nie ma, powiedz to wprost; możesz podać wiedzę ogólną, ale wyraźnie oznacz ją jako niezweryfikowaną.
- Nigdy nie wymyślaj kwot, progów ani terminów. Podając kwotę lub termin, podaj źródło i datę „stan na”.
- Dopasuj odpowiedź do PROFILU i etapu dziecka. Jeśli brakuje danych do oceny uprawnień, wymień, czego brakuje.
- Nie udzielasz porad prawnych ani medycznych. W sprawach zdrowia odsyłaj do lekarza/położnej, w sprawach indywidualnych do ZUS, urzędu gminy/MOPS lub prawnika.
- Na końcu, jeśli to pomocne, zaproponuj następny krok w aplikacji (np. „Otwórz dokument X”, „Zapytaj człowieka”).
PROFIL: {profileSummary}
KONTEKST DZIECKA: {childLabel}
KONTEKST (treści aplikacji): {documents}`;

const WEB_SEARCH_NOTE = `\nJeśli korzystasz z wyszukiwania w sieci, preferuj oficjalne źródła: ${PREFERRED_DOMAINS.join(', ')}. Zawsze podawaj link do źródła.`;

// ---------- Walidacja wejścia ----------
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const RequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1).max(2000) }))
    .min(1)
    .max(12),
  context: z.object({
    profileSummary: z.string().max(2000),
    childLabel: z.string().max(300).optional(),
    focusDocumentId: Slug.optional(),
    relevantDocumentIds: z.array(Slug).max(10),
    contentVersion: z.number(),
  }),
});

type Source = { name: string; url?: string; asOf?: string };

// ---------- CORS ----------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

// ---------- Limit zapytań (best-effort) ----------
// Pamięć pojedynczej instancji funkcji – resetuje się przy zimnym starcie i nie jest współdzielona
// między instancjami. Porządnie: tabela w Postgresie / Upstash Redis z kluczem IP+okno czasowe,
// albo limit na poziomie API Gateway.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT_PER_MINUTE;
}

// ---------- Kontekst z bazy ----------
type DocRow = {
  id: string;
  title: string;
  summary: string;
  body_md: string;
  amount_label: string | null;
  timing: { deadlineNote?: string } | null;
  source: Source;
};
type TipRow = { id: string; title: string; summary_md: string; tags: string[]; source: Source | null };

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

async function loadContext(focusId: string | undefined, relevantIds: string[], question: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const ids = [...new Set([...(focusId ? [focusId] : []), ...relevantIds])];
  const docs: DocRow[] = [];
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from('content_documents')
      .select('id, title, summary, body_md, amount_label, timing, source')
      .in('id', ids)
      .eq('published', true);
    if (error) throw new Error(`db_documents: ${error.code ?? 'error'}`);
    // kolejność: focus pierwszy, potem wg relevantIds
    docs.push(...((data ?? []) as DocRow[]).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)));
  }

  // Dopasowane porady (proste dopasowanie tagów do pytania).
  const q = normalize(question);
  const { data: tipsData } = await supabase.from('content_tips').select('id, title, summary_md, tags, source').eq('published', true);
  const tips = ((tipsData ?? []) as TipRow[])
    .filter((t) => t.tags.some((tag) => q.includes(normalize(tag))) || q.includes(normalize(t.title)))
    .slice(0, 3);

  return { docs, tips };
}

function contextMarkdown(docs: DocRow[], tips: TipRow[]): string {
  if (docs.length === 0 && tips.length === 0) return '(brak dopasowanych treści)';
  const parts = docs.map((d) =>
    [
      `### ${d.title} [${d.id}]`,
      d.summary,
      d.amount_label ? `Kwota: ${d.amount_label}` : '',
      d.timing?.deadlineNote ? `Termin: ${d.timing.deadlineNote}` : '',
      d.body_md.slice(0, MAX_BODY_CHARS_PER_DOC),
      `Źródło: ${d.source.name}${d.source.url ? ` (${d.source.url})` : ''}, stan na ${d.source.asOf}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  for (const t of tips) {
    parts.push(`### Poradnik: ${t.title}\n${t.summary_md}${t.source ? `\nŹródło: ${t.source.name}, stan na ${t.source.asOf}` : ''}`);
  }
  return parts.join('\n\n');
}

// ---------- OpenAI Responses API ----------
type ResponsesOutput = {
  output?: {
    type: string;
    content?: { type: string; text?: string; annotations?: { type: string; url?: string; title?: string }[] }[];
  }[];
  output_text?: string;
};

async function callOpenAI(instructions: string, messages: { role: 'user' | 'assistant'; text: string }[]) {
  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    instructions,
    input: messages.map((m) => ({ role: m.role, content: m.text })),
    max_output_tokens: 900,
  };
  if (OPENAI_WEB_SEARCH) {
    // TODO(verify): aktualna nazwa narzędzia i parametry filtrowania domen w dokumentacji OpenAI
    // (wcześniej „web_search_preview”; filtr domen np. filters.allowed_domains).
    body.tools = [{ type: 'web_search' }];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`openai_http_${res.status}`);
    const data = (await res.json()) as ResponsesOutput;

    let text = '';
    const citations: Source[] = [];
    for (const item of data.output ?? []) {
      if (item.type !== 'message') continue;
      for (const part of item.content ?? []) {
        if (part.type === 'output_text' && part.text) text += part.text;
        for (const a of part.annotations ?? []) {
          if (a.type === 'url_citation' && a.url) citations.push({ name: a.title || a.url, url: a.url });
        }
      }
    }
    if (!text && typeof data.output_text === 'string') text = data.output_text;
    if (!text) throw new Error('openai_empty');
    return { text, citations };
  } finally {
    clearTimeout(timer);
  }
}

function dedupe(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = s.url ?? s.name;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const started = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return json({ error: 'rate_limited' }, 429);

  if (!OPENAI_API_KEY || !OPENAI_MODEL) {
    console.error(JSON.stringify({ event: 'assistant_config_missing' }));
    return json({ error: 'not_configured' }, 500);
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'invalid_request' }, 400);
    input = parsed.data;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  try {
    const lastQuestion = [...input.messages].reverse().find((m) => m.role === 'user')?.text ?? '';
    const { docs, tips } = await loadContext(input.context.focusDocumentId, input.context.relevantDocumentIds, lastQuestion);

    const instructions =
      SYSTEM_PROMPT.replace('{profileSummary}', input.context.profileSummary || '(brak)')
        .replace('{childLabel}', input.context.childLabel ?? 'wszystkie dzieci')
        .replace('{documents}', contextMarkdown(docs, tips)) + (OPENAI_WEB_SEARCH ? WEB_SEARCH_NOTE : '');

    const { text, citations } = await callOpenAI(instructions, input.messages);
    const sources = dedupe([
      ...docs.map((d) => d.source),
      ...tips.flatMap((t) => (t.source ? [t.source] : [])),
      ...citations,
    ]);

    // Logi bez treści rozmów – tylko długości, czasy, kody.
    console.log(
      JSON.stringify({
        event: 'assistant_ok',
        messages: input.messages.length,
        inputChars: input.messages.reduce((n, m) => n + m.text.length, 0),
        outputChars: text.length,
        docs: docs.length,
        ms: Date.now() - started,
      }),
    );
    return json({ text, sources });
  } catch (e) {
    const code = e instanceof Error ? e.message.slice(0, 60) : 'unknown';
    console.error(JSON.stringify({ event: 'assistant_error', code, ms: Date.now() - started }));
    return json({ error: 'upstream_error' }, 502);
  }
});
