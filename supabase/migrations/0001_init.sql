-- =====================================================================
-- 0001_init: treści aplikacji (content_*), wersja treści, zgłoszenia.
-- Kolumny odpowiadają schematom zod z src/core/schemas/content.ts
-- (camelCase w aplikacji ↔ snake_case w bazie; pola złożone jako jsonb,
--  w środku jsonb zostaje camelCase).
-- =====================================================================

-- ---------- Wersja treści ----------
create table if not exists public.content_meta (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.content_meta (id, version) values (1, 0) on conflict (id) do nothing;

-- ---------- Dokumenty ----------
create table if not exists public.content_documents (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  scope text not null check (scope in ('child', 'household')),
  category text not null check (category in ('benefit', 'registry', 'work', 'health', 'education', 'other')),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 400),
  body_md text not null,
  timing jsonb not null,
  visible_when jsonb,
  requirements jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  checklist jsonb,
  assistant_prompts jsonb not null default '[]'::jsonb,
  amount_label text check (amount_label is null or char_length(amount_label) <= 80),
  tags jsonb not null default '[]'::jsonb,
  source jsonb not null,
  needs_review boolean not null default true,
  priority int not null default 3 check (priority between 1 and 5),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- Poradniki ----------
create table if not exists public.content_tips (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  summary_md text not null check (char_length(summary_md) between 1 and 600),
  body_md text,
  timing jsonb not null,
  visible_when jsonb,
  tags jsonb not null default '[]'::jsonb,
  source jsonb,
  priority int not null default 3 check (priority between 1 and 5),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- Zadania „co warto zrobić” ----------
create table if not exists public.content_todos (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description_md text,
  timing jsonb not null,
  visible_when jsonb,
  category text not null check (category in ('health', 'home', 'work', 'registry', 'education', 'other')),
  related_document_id text references public.content_documents (id) on delete set null,
  source jsonb,
  priority int not null default 3 check (priority between 1 and 5),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- Podpowiedzi czatu ----------
create table if not exists public.content_prompts (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  text text not null check (char_length(text) between 1 and 200),
  timing jsonb not null,
  visible_when jsonb,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- Zgłoszenia do człowieka ----------
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question text not null check (char_length(question) between 1 and 2000),
  contact text not null check (char_length(contact) between 3 and 200),
  context jsonb not null default '{}'::jsonb check (pg_column_size(context) <= 16384),
  status text not null default 'new' check (status in ('new', 'in_progress', 'answered', 'closed'))
);

-- ---------- updated_at + wersja treści ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.bump_content_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.content_meta set version = version + 1, updated_at = now() where id = 1;
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['content_documents', 'content_tips', 'content_todos', 'content_prompts'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('drop trigger if exists %I_version on public.%I', t, t);
    execute format('create trigger %I_version after insert or update or delete on public.%I for each statement execute function public.bump_content_version()', t, t);
  end loop;
end;
$$;

-- ---------- RLS ----------
-- anon: tylko odczyt opublikowanych treści i content_meta, tylko INSERT do support_requests.
-- Zapis treści wyłącznie przez service_role (omija RLS) – skrypt content:import.
alter table public.content_meta enable row level security;
alter table public.content_documents enable row level security;
alter table public.content_tips enable row level security;
alter table public.content_todos enable row level security;
alter table public.content_prompts enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists "read meta" on public.content_meta;
create policy "read meta" on public.content_meta for select to anon, authenticated using (true);

drop policy if exists "read published documents" on public.content_documents;
create policy "read published documents" on public.content_documents for select to anon, authenticated using (published = true);

drop policy if exists "read published tips" on public.content_tips;
create policy "read published tips" on public.content_tips for select to anon, authenticated using (published = true);

drop policy if exists "read published todos" on public.content_todos;
create policy "read published todos" on public.content_todos for select to anon, authenticated using (published = true);

drop policy if exists "read published prompts" on public.content_prompts;
create policy "read published prompts" on public.content_prompts for select to anon, authenticated using (published = true);

drop policy if exists "insert support requests" on public.support_requests;
create policy "insert support requests" on public.support_requests for insert to anon, authenticated
  with check (status = 'new' and char_length(question) <= 2000 and char_length(contact) <= 200);

-- Uprawnienia na poziomie tabel (RLS filtruje wiersze).
revoke all on public.content_meta, public.content_documents, public.content_tips, public.content_todos, public.content_prompts, public.support_requests from anon, authenticated;
grant select on public.content_meta, public.content_documents, public.content_tips, public.content_todos, public.content_prompts to anon, authenticated;
grant insert (question, contact, context) on public.support_requests to anon, authenticated;
