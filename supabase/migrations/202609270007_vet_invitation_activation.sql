create or replace function public.auth_profile_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  profile_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Veterinário');
  profile_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
  profile_locale public.app_locale := coalesce((new.raw_user_meta_data ->> 'locale')::public.app_locale, 'pt-PT');
  initial_role public.user_role := case when new.raw_user_meta_data ->> 'initial_role' = 'vet' then 'vet' else 'client' end;
begin
  insert into public.profiles(id,email,full_name,phone,locale,is_incomplete)
  values(new.id,lower(btrim(new.email)),profile_name,profile_phone,profile_locale,profile_phone is null)
  on conflict(id) do update set email=excluded.email;
  if tg_op='INSERT' then
    insert into public.account_roles(profile_id,role) values(new.id,initial_role) on conflict do nothing;
    if initial_role='client' then
      insert into public.client_settings(profile_id,phone,is_incomplete) values(new.id,profile_phone,profile_phone is null) on conflict do nothing;
    else
      insert into public.vet_access(profile_id,status) values(new.id,'pending_mfa') on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

create function public.activate_my_vet_access()
returns void language plpgsql security definer set search_path = '' as $$
declare invitation_actor uuid;
begin
  if not public.has_role('vet') or coalesce((select auth.jwt()->>'aal'),'aal1') <> 'aal2' then raise exception 'forbidden'; end if;
  update public.vet_access set status='active',activated_at=coalesce(activated_at,now()) where profile_id=auth.uid() and status='pending_mfa';
  if not found then return; end if;
  update public.vet_invitations set status='accepted',accepted_at=now() where profile_id=auth.uid() and status='pending' and expires_at>=now() returning invited_by into invitation_actor;
  insert into public.admin_audit_events(actor_id,target_id,action) values(coalesce(invitation_actor,auth.uid()),auth.uid(),'vet_role_activated');
  insert into public.in_app_notifications(recipient_id,event,actor_id,subject_id)
  select profile_id,'vet_activated',invitation_actor,auth.uid() from public.account_roles where role='vet';
end $$;
revoke all on function public.activate_my_vet_access() from public,anon;
grant execute on function public.activate_my_vet_access() to authenticated;
