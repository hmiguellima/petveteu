-- Make normalized assignments authoritative for reads and new registrations.

create or replace function public.auth_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Cliente');
  profile_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
  profile_locale public.app_locale := coalesce((new.raw_user_meta_data ->> 'locale')::public.app_locale, 'pt-PT');
begin
  insert into public.profiles(id, email, full_name, phone, locale, is_incomplete)
  values (new.id, lower(btrim(new.email)), profile_name, profile_phone, profile_locale, profile_phone is null)
  on conflict(id) do update set email = excluded.email;

  if tg_op = 'INSERT' then
    insert into public.account_roles(profile_id, role) values (new.id, 'client')
    on conflict do nothing;
    insert into public.client_settings(profile_id, phone, is_incomplete)
    values (new.id, profile_phone, profile_phone is null)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop policy pet_read on public.pets;
create policy pet_read on public.pets for select to authenticated using (
  public.is_vet() or (public.has_role('client') and owner_id = (select auth.uid()) and deleted_at is null)
);

drop policy vaccine_read on public.vaccination_entries;
create policy vaccine_read on public.vaccination_entries for select to authenticated using (
  public.is_vet() or (public.has_role('client') and deleted_at is null and exists (
    select 1 from public.pets p where p.id = vaccination_entries.pet_id
      and p.owner_id = (select auth.uid()) and p.deleted_at is null
  ))
);

drop policy reminder_read on public.reminders;
create policy reminder_read on public.reminders for select to authenticated using (
  public.is_vet() or (public.has_role('client') and exists (
    select 1 from public.vaccination_entries v join public.pets p on p.id = v.pet_id
    where v.id = reminders.vaccination_entry_id and v.deleted_at is null
      and p.owner_id = (select auth.uid()) and p.deleted_at is null
  ))
);

drop policy attempt_read on public.reminder_attempts;
create policy attempt_read on public.reminder_attempts for select to authenticated using (
  public.is_vet() or (public.has_role('client') and exists (
    select 1 from public.reminders r
    join public.vaccination_entries v on v.id = r.vaccination_entry_id
    join public.pets p on p.id = v.pet_id
    where r.id = reminder_attempts.reminder_id and v.deleted_at is null
      and p.owner_id = (select auth.uid()) and p.deleted_at is null
  ))
);

create or replace function public.activate_my_client_role(
  p_notice_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if nullif(btrim(p_notice_version), '') is null then raise exception 'notice_required'; end if;
  insert into public.account_roles(profile_id, role) values (auth.uid(), 'client') on conflict do nothing;
  insert into public.client_settings(profile_id, privacy_notice_version, privacy_notice_presented_at)
  values (auth.uid(), btrim(p_notice_version), now())
  on conflict(profile_id) do update set
    privacy_notice_version = excluded.privacy_notice_version,
    privacy_notice_presented_at = excluded.privacy_notice_presented_at;
  insert into public.admin_audit_events(actor_id, target_id, action)
  values (auth.uid(), auth.uid(), 'client_role_activated');
end;
$$;

create or replace function public.deactivate_my_empty_client_role()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vet() or not public.has_role('client') then raise exception 'forbidden'; end if;
  if exists (select 1 from public.pets where owner_id = auth.uid()) then
    raise exception 'client_closure_required';
  end if;
  delete from public.client_settings where profile_id = auth.uid();
  delete from public.account_roles where profile_id = auth.uid() and role = 'client';
  insert into public.admin_audit_events(actor_id, target_id, action)
  values (auth.uid(), auth.uid(), 'client_role_deactivated');
end;
$$;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.in_app_notifications set read_at = now()
  where id = p_id and recipient_id = (select auth.uid()) and read_at is null
$$;

revoke all on function public.activate_my_client_role(text), public.deactivate_my_empty_client_role(),
  public.mark_notification_read(uuid) from public, anon;
grant execute on function public.activate_my_client_role(text), public.deactivate_my_empty_client_role(),
  public.mark_notification_read(uuid) to authenticated;
