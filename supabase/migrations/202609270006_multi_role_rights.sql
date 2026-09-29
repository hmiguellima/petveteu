create or replace function public.vet_open_data_subject_request(p_profile_id uuid,p_request_type text)
returns public.data_subject_requests language plpgsql security definer set search_path = '' as $$
declare r public.data_subject_requests;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if p_request_type not in ('access','correction','objection','restriction','erasure') then raise exception 'invalid_request_type'; end if;
  if not exists(select 1 from public.account_roles where profile_id=p_profile_id and role='client') then raise exception 'invalid_client'; end if;
  insert into public.data_subject_requests(profile_id,request_type) values(p_profile_id,p_request_type) returning * into r;
  insert into public.admin_audit_events(actor_id,target_id,action,details) values(auth.uid(),p_profile_id,'rights_request_opened',jsonb_build_object('request_type',p_request_type));
  return r;
end $$;

create or replace function public.vet_complete_data_subject_request(p_request_id uuid,p_decision_code text,p_retention_basis_code text default null)
returns public.data_subject_requests language plpgsql security definer set search_path = '' as $$
declare r public.data_subject_requests;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if p_decision_code !~ '^[a-z0-9_]{1,80}$' or (p_retention_basis_code is not null and p_retention_basis_code !~ '^[a-z0-9_]{1,80}$') then raise exception 'invalid_decision_code'; end if;
  update public.data_subject_requests set decision_code=p_decision_code,retention_basis=p_retention_basis_code,outcome=p_decision_code,completed_at=now(),status=case when p_decision_code='refused' then 'refused' else 'completed' end where id=p_request_id and verified_at is not null and status='verified' returning * into r;
  if r.id is null then raise exception 'invalid_request_state'; end if;
  if r.request_type='erasure' then
    update public.client_settings set sms_enabled_by_client=false,sms_enabled_by_vet=false,processing_restricted=true where profile_id=r.profile_id;
    update public.reminders rem set status='cancelled',updated_at=now() from public.vaccination_entries v join public.pets p on p.id=v.pet_id where rem.vaccination_entry_id=v.id and p.owner_id=r.profile_id and rem.status='pending';
  end if;
  insert into public.admin_audit_events(actor_id,target_id,action,details) values(auth.uid(),r.profile_id,'rights_request_completed',jsonb_build_object('request_type',r.request_type,'decision_code',p_decision_code,'retention_basis_code',p_retention_basis_code));
  return r;
end $$;
