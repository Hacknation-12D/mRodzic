alter table public.family_children
  add column birth_place text check (char_length(birth_place) between 1 and 80);

update public.family_children as child
set last_name = parent.last_name, birth_place = parent.city
from public.family_parents as parent
join auth.users as account on account.id = parent.user_id
where child.user_id = parent.user_id
  and child.child_id = 'demo-zam-zosia'
  and account.email = 'anna.zam@example.test'
  and account.raw_app_meta_data->>'local_zam_demo' = 'true';

create or replace function public.save_family_profile(parent_data jsonb, children_data jsonb)
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

  insert into public.family_children as saved (
    user_id, child_id, name, status, birth_date, due_date, sex, premature, disability, multiple_birth_group_id, birth_place
  )
  select owner_id, id, name, status, "birthDate", "dueDate", sex, premature, disability,
    "multipleBirthGroupId", nullif(btrim("birthPlace"), '')
  from jsonb_to_recordset(children_data) as c(
    id text, name text, status text, "birthDate" date, "dueDate" date, sex text,
    premature boolean, disability boolean, "multipleBirthGroupId" text, "birthPlace" text
  )
  on conflict (user_id, child_id) do update set
    name = excluded.name, status = excluded.status, birth_date = excluded.birth_date,
    due_date = excluded.due_date, sex = excluded.sex, premature = excluded.premature,
    disability = excluded.disability, multiple_birth_group_id = excluded.multiple_birth_group_id,
    birth_place = coalesce(excluded.birth_place, saved.birth_place);

  delete from public.family_children as saved
  where saved.user_id = owner_id
    and not exists (
      select 1 from jsonb_to_recordset(children_data) as child(id text)
      where child.id = saved.child_id
    );
end;
$$;
