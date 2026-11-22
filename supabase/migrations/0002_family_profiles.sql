create table public.family_parents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text check (char_length(last_name) between 1 and 80),
  birth_date date,
  street text check (char_length(street) between 1 and 100),
  house_number text check (char_length(house_number) between 1 and 15),
  apartment_number text check (char_length(apartment_number) between 1 and 15),
  city text check (char_length(city) between 1 and 80),
  postal_code text check (postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  pesel text check (pesel ~ '^[0-9]{11}$'),
  employment text check (employment in ('employment_contract', 'self_employed', 'civil_contract', 'unemployed', 'student', 'other')),
  updated_at timestamptz not null default now()
);

create table public.family_children (
  user_id uuid not null references public.family_parents (user_id) on delete cascade,
  child_id text not null check (char_length(child_id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 60),
  status text not null check (status in ('expected', 'born')),
  birth_date date,
  due_date date,
  sex text check (sex in ('female', 'male', 'unknown')),
  premature boolean,
  disability boolean,
  multiple_birth_group_id text,
  primary key (user_id, child_id),
  check ((status = 'born' and birth_date is not null) or (status = 'expected' and due_date is not null))
);

alter table public.family_parents enable row level security;
alter table public.family_children enable row level security;

create policy "own parent" on public.family_parents for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own children" on public.family_children for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.family_parents, public.family_children from public, anon, authenticated;
grant select, insert, update, delete on public.family_parents, public.family_children to authenticated;

create function public.save_family_profile(parent_data jsonb, children_data jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.family_parents (
    user_id, first_name, last_name, birth_date, street, house_number, apartment_number, city, postal_code, pesel, employment
  ) values (
    owner_id, parent_data->>'firstName', parent_data->>'lastName', (parent_data->>'birthDate')::date,
    parent_data->>'street', parent_data->>'houseNumber', parent_data->>'apartmentNumber', parent_data->>'city',
    parent_data->>'postalCode', parent_data->>'pesel', parent_data->>'employment'
  )
  on conflict (user_id) do update set
    first_name = excluded.first_name, last_name = excluded.last_name, birth_date = excluded.birth_date,
    street = excluded.street, house_number = excluded.house_number, apartment_number = excluded.apartment_number,
    city = excluded.city, postal_code = excluded.postal_code, pesel = excluded.pesel,
    employment = excluded.employment, updated_at = now();

  delete from public.family_children where user_id = owner_id;
  insert into public.family_children (
    user_id, child_id, name, status, birth_date, due_date, sex, premature, disability, multiple_birth_group_id
  )
  select owner_id, id, name, status, "birthDate", "dueDate", sex, premature, disability, "multipleBirthGroupId"
  from jsonb_to_recordset(children_data) as c(
    id text, name text, status text, "birthDate" date, "dueDate" date, sex text,
    premature boolean, disability boolean, "multipleBirthGroupId" text
  );
end;
$$;

revoke all on function public.save_family_profile(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_family_profile(jsonb, jsonb) to authenticated;
