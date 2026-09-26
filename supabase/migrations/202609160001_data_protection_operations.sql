-- Authenticated clinic-assisted rights workflow and operator-only disposal.
-- Retention cutoffs are deliberately supplied by an operator: the application
-- does not invent legal retention periods.

alter table public.data_subject_requests
  add column if not exists status text not null default 'open'
    check (status in ('open', 'verified', 'completed', 'refused')),
  add column if not exists decision_code text
    check (decision_code is null or decision_code ~ '^[a-z0-9_]{1,80}$');

create or replace function public.vet_open_data_subject_request(
  p_profile_id uuid,
  p_request_type text
)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request public.data_subject_requests;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if p_request_type not in ('access','correction','objection','restriction','erasure') then
    raise exception 'invalid_request_type';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id and role = 'client') then
    raise exception 'invalid_client';
  end if;

  insert into public.data_subject_requests (profile_id, request_type)
  values (p_profile_id, p_request_type)
  returning * into created_request;

  insert into public.admin_audit_events (actor_id, target_id, action, details)
  values (auth.uid(), p_profile_id, 'rights_request_opened', jsonb_build_object('request_type', p_request_type));
  return created_request;
end;
$$;

create or replace function public.vet_verify_data_subject_request(p_request_id uuid)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.data_subject_requests;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  update public.data_subject_requests
  set verified_at = now(), status = 'verified'
  where id = p_request_id and status = 'open'
  returning * into updated_request;
  if updated_request.id is null then raise exception 'invalid_request_state'; end if;

  insert into public.admin_audit_events (actor_id, target_id, action, details)
  values (auth.uid(), updated_request.profile_id, 'rights_identity_verified',
          jsonb_build_object('request_type', updated_request.request_type));
  return updated_request;
end;
$$;

create or replace function public.vet_restrict_client_processing(
  p_request_id uuid,
  p_restricted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_id uuid;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  select profile_id into client_id from public.data_subject_requests
  where id = p_request_id and verified_at is not null and status = 'verified';
  if client_id is null then raise exception 'unverified_request'; end if;

  update public.profiles set processing_restricted = p_restricted where id = client_id and role = 'client';
  if p_restricted then
    update public.reminders r set status = 'cancelled', updated_at = now()
    from public.vaccination_entries v join public.pets p on p.id = v.pet_id
    where r.vaccination_entry_id = v.id and p.owner_id = client_id and r.status = 'pending';
  end if;
  insert into public.admin_audit_events (actor_id, target_id, action)
  values (auth.uid(), client_id, case when p_restricted then 'processing_restricted' else 'processing_restored' end);
end;
$$;

create or replace function public.vet_complete_data_subject_request(
  p_request_id uuid,
  p_decision_code text,
  p_retention_basis_code text default null
)
returns public.data_subject_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request public.data_subject_requests;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if p_decision_code !~ '^[a-z0-9_]{1,80}$'
     or (p_retention_basis_code is not null and p_retention_basis_code !~ '^[a-z0-9_]{1,80}$') then
    raise exception 'invalid_decision_code';
  end if;
  update public.data_subject_requests
  set decision_code = p_decision_code,
      retention_basis = p_retention_basis_code,
      outcome = p_decision_code,
      completed_at = now(),
      status = case when p_decision_code = 'refused' then 'refused' else 'completed' end
  where id = p_request_id and verified_at is not null and status = 'verified'
  returning * into updated_request;
  if updated_request.id is null then raise exception 'invalid_request_state'; end if;

  if updated_request.request_type = 'erasure' then
    update public.profiles
    set sms_enabled_by_client = false, sms_enabled_by_vet = false, processing_restricted = true
    where id = updated_request.profile_id;
    update public.reminders r set status = 'cancelled', updated_at = now()
    from public.vaccination_entries v join public.pets p on p.id = v.pet_id
    where r.vaccination_entry_id = v.id and p.owner_id = updated_request.profile_id and r.status = 'pending';
  end if;

  insert into public.admin_audit_events (actor_id, target_id, action, details)
  values (auth.uid(), updated_request.profile_id, 'rights_request_completed',
          jsonb_build_object('request_type', updated_request.request_type,
                             'decision_code', p_decision_code,
                             'retention_basis_code', p_retention_basis_code));
  return updated_request;
end;
$$;

create or replace function public.apply_approved_retention(
  p_soft_deleted_before timestamptz,
  p_reminder_before timestamptz,
  p_job_run_before timestamptz,
  p_audit_before timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pets_removed integer;
  reminders_removed integer;
  runs_removed integer;
  events_removed integer;
begin
  if current_user not in ('postgres', 'service_role') then raise exception 'forbidden'; end if;

  delete from public.reminder_attempts a using public.reminders r
  where a.reminder_id = r.id and r.created_at < p_reminder_before;
  delete from public.reminders where created_at < p_reminder_before;
  get diagnostics reminders_removed = row_count;

  delete from public.reminder_attempts a using public.reminders r,
       public.vaccination_entries v, public.pets p
  where a.reminder_id = r.id and r.vaccination_entry_id = v.id
    and v.pet_id = p.id and p.deleted_at < p_soft_deleted_before
    and not exists (select 1 from public.profiles o where o.id = p.owner_id
                    and o.legal_hold_until >= current_date);
  delete from public.reminders r using public.vaccination_entries v, public.pets p
  where r.vaccination_entry_id = v.id and v.pet_id = p.id
    and p.deleted_at < p_soft_deleted_before
    and not exists (select 1 from public.profiles o where o.id = p.owner_id
                    and o.legal_hold_until >= current_date);
  delete from public.vaccination_entries v using public.pets p
  where v.pet_id = p.id and p.deleted_at < p_soft_deleted_before
    and not exists (select 1 from public.profiles o where o.id = p.owner_id
                    and o.legal_hold_until >= current_date);
  delete from public.pets p where p.deleted_at < p_soft_deleted_before
    and not exists (select 1 from public.profiles o where o.id = p.owner_id
                    and o.legal_hold_until >= current_date);
  get diagnostics pets_removed = row_count;

  delete from public.reminder_job_runs where completed_at < p_job_run_before;
  get diagnostics runs_removed = row_count;
  delete from public.admin_audit_events where created_at < p_audit_before;
  get diagnostics events_removed = row_count;
  return jsonb_build_object('pets_removed', pets_removed,
                            'reminders_removed', reminders_removed,
                            'job_runs_removed', runs_removed,
                            'audit_events_removed', events_removed);
end;
$$;

drop function if exists public.apply_approved_retention(timestamptz, timestamptz);
revoke all on function public.apply_approved_retention(timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.vet_open_data_subject_request(uuid, text) from public, anon, authenticated;
revoke all on function public.vet_verify_data_subject_request(uuid) from public, anon, authenticated;
revoke all on function public.vet_restrict_client_processing(uuid, boolean) from public, anon, authenticated;
revoke all on function public.vet_complete_data_subject_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.vet_open_data_subject_request(uuid, text),
  public.vet_verify_data_subject_request(uuid),
  public.vet_restrict_client_processing(uuid, boolean),
  public.vet_complete_data_subject_request(uuid, text, text) to authenticated;
