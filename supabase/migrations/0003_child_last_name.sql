alter table public.family_children
  add column last_name text check (char_length(last_name) between 1 and 80);

update public.family_children as child
set last_name = parent.last_name
from public.family_parents as parent
where parent.user_id = child.user_id;

create function public.inherit_child_last_name()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  select parent.last_name into new.last_name
  from public.family_parents as parent
  where parent.user_id = new.user_id;
  return new;
end;
$$;

create trigger inherit_child_last_name
before insert or update of user_id, last_name on public.family_children
for each row execute function public.inherit_child_last_name();

create function public.sync_child_last_names()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  update public.family_children
  set last_name = new.last_name
  where user_id = new.user_id and last_name is distinct from new.last_name;
  return new;
end;
$$;

create trigger sync_child_last_names
after update of last_name on public.family_parents
for each row when (old.last_name is distinct from new.last_name)
execute function public.sync_child_last_names();
