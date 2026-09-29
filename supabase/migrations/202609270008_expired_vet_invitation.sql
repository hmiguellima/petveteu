create or replace function public.activate_my_vet_access()
returns void language plpgsql security definer set search_path = '' as $$
declare invitation_actor uuid;
begin
  if not public.has_role('vet') or coalesce((select auth.jwt()->>'aal'),'aal1') <> 'aal2' then raise exception 'forbidden'; end if;
  if exists(select 1 from public.vet_invitations where profile_id=auth.uid() and status='pending' and expires_at<now()) then
    update public.vet_invitations set status='expired' where profile_id=auth.uid() and status='pending';
    delete from public.vet_access where profile_id=auth.uid() and status='pending_mfa';
    delete from public.account_roles where profile_id=auth.uid() and role='vet';
    insert into public.admin_audit_events(actor_id,target_id,action) values(auth.uid(),auth.uid(),'vet_invitation_expired');
    return;
  end if;
  update public.vet_access set status='active',activated_at=coalesce(activated_at,now()) where profile_id=auth.uid() and status='pending_mfa';
  if not found then return; end if;
  update public.vet_invitations set status='accepted',accepted_at=now() where profile_id=auth.uid() and status='pending' returning invited_by into invitation_actor;
  insert into public.admin_audit_events(actor_id,target_id,action) values(coalesce(invitation_actor,auth.uid()),auth.uid(),'vet_role_activated');
  insert into public.in_app_notifications(recipient_id,event,actor_id,subject_id)
  select profile_id,'vet_activated',invitation_actor,auth.uid() from public.account_roles where role='vet';
end $$;
