alter table public.profiles
  add column if not exists email_immutable boolean not null default false;

update public.profiles as profile
set email_immutable = true
where exists (select 1 from public.vet_access as access where access.profile_id = profile.id)
   or exists (
     select 1 from public.account_roles as assignment
     where assignment.profile_id = profile.id and assignment.role = 'vet'
   );

create or replace function public.lock_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email_immutable = true where id = new.profile_id;
  return new;
end;
$$;

drop trigger if exists vet_access_lock_email on public.vet_access;
create trigger vet_access_lock_email
after insert on public.vet_access
for each row execute function public.lock_profile_email();

create or replace function public.update_my_shared_identity(
  p_full_name text,
  p_locale public.app_locale,
  p_version bigint
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if not public.has_role('vet') and not public.has_role('client') then
    raise exception 'forbidden';
  end if;
  update public.profiles
  set full_name = btrim(p_full_name), locale = p_locale
  where id = auth.uid() and version = p_version
  returning * into result;
  if result.id is null then
    raise exception 'stale_or_forbidden';
  end if;
  return result;
end;
$$;

create or replace function public.deactivate_my_empty_client_role()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vet() or not public.has_role('client') then
    raise exception 'forbidden';
  end if;
  if exists (
    select 1 from public.pets where owner_id = auth.uid() and deleted_at is null
  ) or exists (
    select 1
    from public.client_settings
    where profile_id = auth.uid()
      and (legal_hold_until is not null or processing_restricted)
  ) then
    raise exception 'client_closure_required';
  end if;
  delete from public.client_settings where profile_id = auth.uid();
  delete from public.account_roles where profile_id = auth.uid() and role = 'client';
  insert into public.admin_audit_events(actor_id, target_id, action)
  values (auth.uid(), auth.uid(), 'client_role_deactivated');
end;
$$;

create or replace function public.activate_my_vet_access()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_actor uuid;
  membership_event public.membership_event := 'vet_activated';
begin
  if not public.has_role('vet') or coalesce((select auth.jwt()->>'aal'),'aal1') <> 'aal2' then
    raise exception 'forbidden';
  end if;
  if exists (
    select 1 from public.vet_invitations
    where profile_id = auth.uid() and status = 'pending' and expires_at < now()
  ) then
    update public.vet_invitations set status = 'expired'
    where profile_id = auth.uid() and status = 'pending';
    delete from public.vet_access where profile_id = auth.uid() and status = 'pending_mfa';
    delete from public.account_roles where profile_id = auth.uid() and role = 'vet';
    insert into public.admin_audit_events(actor_id, target_id, action)
    values (auth.uid(), auth.uid(), 'vet_invitation_expired');
    return;
  end if;
  update public.vet_access
  set status = 'active', activated_at = coalesce(activated_at, now())
  where profile_id = auth.uid() and status = 'pending_mfa';
  if not found then
    return;
  end if;
  update public.vet_invitations
  set status = 'accepted', accepted_at = now()
  where profile_id = auth.uid() and status = 'pending'
  returning invited_by into invitation_actor;
  if exists (
    select 1 from public.admin_audit_events
    where target_id = auth.uid() and action = 'vet_role_revoked'
  ) then
    membership_event := 'vet_reinstated';
  end if;
  insert into public.admin_audit_events(actor_id, target_id, action)
  values (
    coalesce(invitation_actor, auth.uid()),
    auth.uid(),
    case when membership_event = 'vet_reinstated' then 'vet_role_reinstated' else 'vet_role_activated' end
  );
  insert into public.in_app_notifications(recipient_id, event, actor_id, subject_id)
  select profile_id, membership_event, invitation_actor, auth.uid()
  from public.account_roles
  where role = 'vet';
end;
$$;

revoke all on function public.lock_profile_email(), public.update_my_shared_identity(text, public.app_locale, bigint)
  from public, anon, authenticated;
grant execute on function public.update_my_shared_identity(text, public.app_locale, bigint) to authenticated;
grant execute on function public.deactivate_my_empty_client_role() to authenticated;
grant execute on function public.activate_my_vet_access() to authenticated;
