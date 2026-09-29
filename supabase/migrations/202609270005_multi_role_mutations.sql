create or replace function public.update_my_profile(p_full_name text, p_phone text, p_locale public.app_locale, p_sms boolean, p_version bigint)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare r public.profiles; normalized_phone text := nullif(btrim(p_phone), '');
begin
  if not public.has_role('client') or normalized_phone is null then raise exception 'forbidden'; end if;
  update public.profiles set full_name=btrim(p_full_name), locale=p_locale where id=auth.uid() and version=p_version returning * into r;
  if r.id is null then raise exception 'stale_or_forbidden'; end if;
  update public.client_settings set phone=normalized_phone, sms_enabled_by_client=p_sms, is_incomplete=false where profile_id=auth.uid();
  return r;
end $$;

create or replace function public.client_create_pet(p_name text,p_species public.pet_species,p_other_species text,p_birth date,p_estimated boolean,p_breed text)
returns public.pets language plpgsql security definer set search_path = '' as $$
declare r public.pets;
begin
  if not public.has_role('client') then raise exception 'forbidden'; end if;
  if p_birth > (now() at time zone 'Europe/Lisbon')::date then raise exception 'future_birth_date'; end if;
  insert into public.pets(owner_id,name,species,other_species,date_of_birth,birth_date_is_estimated,breed)
  values(auth.uid(),btrim(p_name),p_species,nullif(btrim(p_other_species),''),p_birth,p_estimated,nullif(btrim(p_breed),'')) returning * into r;
  return r;
end $$;

create or replace function public.client_update_pet(p_id uuid,p_name text,p_species public.pet_species,p_other_species text,p_birth date,p_estimated boolean,p_breed text,p_version bigint)
returns public.pets language plpgsql security definer set search_path = '' as $$
declare r public.pets;
begin
  if not public.has_role('client') then raise exception 'forbidden'; end if;
  if p_birth > (now() at time zone 'Europe/Lisbon')::date then raise exception 'future_birth_date'; end if;
  update public.pets set name=btrim(p_name),species=p_species,other_species=nullif(btrim(p_other_species),''),date_of_birth=p_birth,birth_date_is_estimated=p_estimated,breed=nullif(btrim(p_breed),'')
  where id=p_id and owner_id=auth.uid() and deleted_at is null and version=p_version returning * into r;
  if r.id is null then raise exception 'stale_or_forbidden'; end if; return r;
end $$;

create or replace function public.client_remove_pet(p_id uuid,p_version bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('client') then raise exception 'forbidden'; end if;
  update public.pets set deleted_at=now() where id=p_id and owner_id=auth.uid() and deleted_at is null and version=p_version;
  if not found then raise exception 'stale_or_forbidden'; end if;
  update public.reminders r set status='cancelled' from public.vaccination_entries v where v.pet_id=p_id and r.vaccination_entry_id=v.id and r.status='pending';
end $$;

create or replace function public.vet_update_client(p_id uuid,p_name text,p_phone text,p_locale public.app_locale,p_sms boolean,p_version bigint)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare r public.profiles; normalized_phone text := nullif(btrim(p_phone),''); target_is_vet boolean;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.account_roles where profile_id=p_id and role='client') then raise exception 'invalid_client'; end if;
  select exists(select 1 from public.account_roles where profile_id=p_id and role='vet') into target_is_vet;
  if target_is_vet and p_id <> auth.uid() then
    update public.profiles set version=version where id=p_id and version=p_version returning * into r;
  else
    update public.profiles set full_name=btrim(p_name),locale=p_locale where id=p_id and version=p_version returning * into r;
  end if;
  if r.id is null then raise exception 'stale_or_forbidden'; end if;
  update public.client_settings set phone=normalized_phone,sms_enabled_by_vet=p_sms,is_incomplete=normalized_phone is null where profile_id=p_id;
  return r;
end $$;

create or replace function public.vet_create_pet(p_owner_id uuid,p_name text,p_species public.pet_species,p_other_species text,p_birth date,p_estimated boolean,p_breed text,p_expiry integer default null)
returns public.pets language plpgsql security definer set search_path = '' as $$
declare r public.pets;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.account_roles where profile_id=p_owner_id and role='client') then raise exception 'invalid_client'; end if;
  if p_birth > (now() at time zone 'Europe/Lisbon')::date then raise exception 'future_birth_date'; end if;
  insert into public.pets(owner_id,name,species,other_species,date_of_birth,birth_date_is_estimated,breed,notification_expiry_years)
  values(p_owner_id,btrim(p_name),p_species,nullif(btrim(p_other_species),''),p_birth,p_estimated,nullif(btrim(p_breed),''),p_expiry) returning * into r;
  return r;
end $$;

create or replace function public.vet_restrict_client_processing(p_request_id uuid,p_restricted boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare client_id uuid;
begin
  if not public.is_vet() then raise exception 'forbidden'; end if;
  select profile_id into client_id from public.data_subject_requests where id=p_request_id and verified_at is not null and status='verified';
  if client_id is null then raise exception 'unverified_request'; end if;
  update public.client_settings set processing_restricted=p_restricted where profile_id=client_id;
  if p_restricted then update public.reminders r set status='cancelled',updated_at=now() from public.vaccination_entries v join public.pets p on p.id=v.pet_id where r.vaccination_entry_id=v.id and p.owner_id=client_id and r.status='pending'; end if;
  insert into public.admin_audit_events(actor_id,target_id,action) values(auth.uid(),client_id,case when p_restricted then 'processing_restricted' else 'processing_restored' end);
end $$;

create or replace function public.vet_revoke_role(p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_vet() or p_profile_id=auth.uid() then raise exception 'forbidden'; end if;
  perform 1 from public.account_roles where role='vet' for update;
  if (select count(*) from public.account_roles r join public.vet_access v on v.profile_id=r.profile_id where r.role='vet' and v.status='active') <= 1 then raise exception 'last_vet'; end if;
  delete from public.account_roles where profile_id=p_profile_id and role='vet';
  delete from auth.sessions where user_id=p_profile_id;
  if not exists(select 1 from public.account_roles where profile_id=p_profile_id and role='client') then
    update auth.users set banned_until='infinity'::timestamptz where id=p_profile_id;
  end if;
  delete from public.vet_access where profile_id=p_profile_id;
  if not found then raise exception 'not_vet'; end if;
  insert into public.admin_audit_events(actor_id,target_id,action) values(auth.uid(),p_profile_id,'vet_role_revoked');
  insert into public.in_app_notifications(recipient_id,event,actor_id,subject_id)
  select profile_id,'vet_revoked',auth.uid(),p_profile_id from public.account_roles where role='vet';
end $$;

revoke all on function public.vet_revoke_role(uuid) from public,anon;
grant execute on function public.vet_revoke_role(uuid) to authenticated;
