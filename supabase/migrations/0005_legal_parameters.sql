-- Parametry prawne kalkulatorów (stawki, wymiary urlopów, kwoty roczne) – wersjonowane.
-- Aplikacja pobiera najnowszy opublikowany zestaw (published = true, największe effective_from).
-- Treść kolumny params waliduje schemat zod LegalParametersSchema (src/core/legal/parameters.ts).

create table if not exists public.legal_parameters (
  id bigint generated always as identity primary key,
  version text not null unique check (char_length(version) between 1 and 40),
  effective_from date not null,
  effective_to date not null check (effective_to >= effective_from),
  params jsonb not null,
  note text not null default '' check (char_length(note) <= 500),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists legal_parameters_published_idx on public.legal_parameters (published, effective_from desc);

alter table public.legal_parameters enable row level security;

-- Odczyt: wszyscy (także anon) widzą tylko opublikowane zestawy.
drop policy if exists legal_parameters_read on public.legal_parameters;
create policy legal_parameters_read on public.legal_parameters
  for select to anon, authenticated
  using (published);

-- Zapis wyłącznie kluczem service_role (panel administracyjny po stronie serwera / skrypt CI).
revoke insert, update, delete on public.legal_parameters from anon, authenticated;
