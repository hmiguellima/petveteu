-- vet_access has timestamps but no optimistic-concurrency version column.
-- The generic touch_version trigger therefore prevents every activation.
create function public.touch_vet_access_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vet_access_touch on public.vet_access;
create trigger vet_access_touch
before update on public.vet_access
for each row execute function public.touch_vet_access_timestamp();

revoke all on function public.touch_vet_access_timestamp() from public, anon, authenticated;
