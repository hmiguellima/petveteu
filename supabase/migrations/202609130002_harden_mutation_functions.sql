-- Replace shared mutation entry points with role-specific functions whose
-- signatures expose only fields that the caller is allowed to change.

drop function public.update_pet(
  uuid, text, public.pet_species, text, date, boolean, text, integer, bigint
);
drop function public.remove_pet(uuid, bigint);

create or replace function public.update_my_profile(
  p_full_name text,
  p_phone text,
  p_locale public.app_locale,
  p_sms boolean,
  p_version bigint
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_profile public.profiles;
begin
  update public.profiles
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(p_phone), ''),
    locale = p_locale,
    sms_enabled_by_client = p_sms,
    is_incomplete = false
  where id = auth.uid()
    and role = 'client'
    and version = p_version
    and nullif(btrim(p_phone), '') is not null
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'stale_or_forbidden';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.client_create_pet(
  p_name text,
  p_species public.pet_species,
  p_other_species text,
  p_birth date,
  p_estimated boolean,
  p_breed text
)
returns public.pets
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_pet public.pets;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'client'
  ) then
    raise exception 'forbidden';
  end if;

  if p_birth > (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'future_birth_date';
  end if;

  insert into public.pets (
    owner_id,
    name,
    species,
    other_species,
    date_of_birth,
    birth_date_is_estimated,
    breed
  ) values (
    auth.uid(),
    btrim(p_name),
    p_species,
    nullif(btrim(p_other_species), ''),
    p_birth,
    p_estimated,
    nullif(btrim(p_breed), '')
  )
  returning * into created_pet;

  return created_pet;
end;
$$;

create function public.client_update_pet(
  p_id uuid,
  p_name text,
  p_species public.pet_species,
  p_other_species text,
  p_birth date,
  p_estimated boolean,
  p_breed text,
  p_version bigint
)
returns public.pets
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_pet public.pets;
begin
  if p_birth > (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'future_birth_date';
  end if;

  update public.pets
  set
    name = btrim(p_name),
    species = p_species,
    other_species = nullif(btrim(p_other_species), ''),
    date_of_birth = p_birth,
    birth_date_is_estimated = p_estimated,
    breed = nullif(btrim(p_breed), '')
  where id = p_id
    and owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'client'
    )
    and deleted_at is null
    and version = p_version
  returning * into updated_pet;

  if updated_pet.id is null then
    raise exception 'stale_or_forbidden';
  end if;

  return updated_pet;
end;
$$;

create function public.client_remove_pet(p_id uuid, p_version bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pets
  set deleted_at = now()
  where id = p_id
    and owner_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'client'
    )
    and deleted_at is null
    and version = p_version;

  if not found then
    raise exception 'stale_or_forbidden';
  end if;

  update public.reminders
  set status = 'cancelled'
  from public.vaccination_entries
  where public.vaccination_entries.pet_id = p_id
    and public.reminders.vaccination_entry_id = public.vaccination_entries.id
    and public.reminders.status = 'pending';
end;
$$;

create or replace function public.vet_update_client(
  p_id uuid,
  p_name text,
  p_phone text,
  p_locale public.app_locale,
  p_sms boolean,
  p_version bigint
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_profile public.profiles;
  normalized_phone text := nullif(btrim(p_phone), '');
begin
  if not public.is_vet() then
    raise exception 'forbidden';
  end if;

  update public.profiles
  set
    full_name = btrim(p_name),
    phone = normalized_phone,
    locale = p_locale,
    sms_enabled_by_vet = p_sms,
    is_incomplete = normalized_phone is null
  where id = p_id
    and role = 'client'
    and version = p_version
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'stale_or_forbidden';
  end if;

  return updated_profile;
end;
$$;

create function public.vet_create_pet(
  p_owner_id uuid,
  p_name text,
  p_species public.pet_species,
  p_other_species text,
  p_birth date,
  p_estimated boolean,
  p_breed text,
  p_expiry integer default null
)
returns public.pets
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_pet public.pets;
begin
  if not public.is_vet() then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_owner_id
      and role = 'client'
  ) then
    raise exception 'invalid_client';
  end if;

  if p_birth > (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'future_birth_date';
  end if;

  insert into public.pets (
    owner_id,
    name,
    species,
    other_species,
    date_of_birth,
    birth_date_is_estimated,
    breed,
    notification_expiry_years
  ) values (
    p_owner_id,
    btrim(p_name),
    p_species,
    nullif(btrim(p_other_species), ''),
    p_birth,
    p_estimated,
    nullif(btrim(p_breed), ''),
    p_expiry
  )
  returning * into created_pet;

  return created_pet;
end;
$$;

create function public.vet_update_pet(
  p_id uuid,
  p_name text,
  p_species public.pet_species,
  p_other_species text,
  p_birth date,
  p_estimated boolean,
  p_breed text,
  p_expiry integer,
  p_version bigint
)
returns public.pets
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_pet public.pets;
begin
  if not public.is_vet() then
    raise exception 'forbidden';
  end if;

  if p_birth > (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'future_birth_date';
  end if;

  update public.pets
  set
    name = btrim(p_name),
    species = p_species,
    other_species = nullif(btrim(p_other_species), ''),
    date_of_birth = p_birth,
    birth_date_is_estimated = p_estimated,
    breed = nullif(btrim(p_breed), ''),
    notification_expiry_years = p_expiry
  where id = p_id
    and deleted_at is null
    and version = p_version
  returning * into updated_pet;

  if updated_pet.id is null then
    raise exception 'stale_or_forbidden';
  end if;

  return updated_pet;
end;
$$;

create function public.vet_remove_pet(p_id uuid, p_version bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vet() then
    raise exception 'forbidden';
  end if;

  update public.pets
  set deleted_at = now()
  where id = p_id
    and deleted_at is null
    and version = p_version;

  if not found then
    raise exception 'stale_or_forbidden';
  end if;

  update public.reminders
  set status = 'cancelled'
  from public.vaccination_entries
  where public.vaccination_entries.pet_id = p_id
    and public.reminders.vaccination_entry_id = public.vaccination_entries.id
    and public.reminders.status = 'pending';
end;
$$;

create or replace function public.vet_save_vaccination(
  p_id uuid,
  p_pet_id uuid,
  p_type text,
  p_due date,
  p_admin date,
  p_notes text,
  p_version bigint
)
returns public.vaccination_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_entry public.vaccination_entries;
  old_due_date date;
begin
  if not public.is_vet() then
    raise exception 'forbidden';
  end if;

  if p_admin is not null and (
    p_admin > p_due
    or p_admin > (now() at time zone 'Europe/Lisbon')::date
  ) then
    raise exception 'invalid_administered_date';
  end if;

  if p_id is null then
    if not exists (
      select 1
      from public.pets
      where id = p_pet_id
        and deleted_at is null
    ) then
      raise exception 'invalid_pet';
    end if;

    insert into public.vaccination_entries (
      pet_id,
      vaccine_type,
      due_date,
      last_administered_date,
      notes
    ) values (
      p_pet_id,
      btrim(p_type),
      p_due,
      p_admin,
      nullif(btrim(p_notes), '')
    )
    returning * into saved_entry;
  else
    select due_date
    into old_due_date
    from public.vaccination_entries
    where id = p_id
      and pet_id = p_pet_id
      and version = p_version
      and deleted_at is null
    for update;

    if old_due_date is null then
      raise exception 'stale_or_forbidden';
    end if;

    update public.vaccination_entries
    set
      vaccine_type = btrim(p_type),
      due_date = p_due,
      last_administered_date = p_admin,
      notes = nullif(btrim(p_notes), '')
    where id = p_id
    returning * into saved_entry;

    if old_due_date <> p_due then
      update public.reminders
      set status = 'cancelled'
      where vaccination_entry_id = p_id
        and due_date = old_due_date
        and status = 'pending';
    end if;
  end if;

  return saved_entry;
end;
$$;

revoke all on function public.client_update_pet(
  uuid, text, public.pet_species, text, date, boolean, text, bigint
) from public, anon, authenticated;
revoke all on function public.client_remove_pet(uuid, bigint) from public, anon, authenticated;
revoke all on function public.vet_create_pet(
  uuid, text, public.pet_species, text, date, boolean, text, integer
) from public, anon, authenticated;
revoke all on function public.vet_update_pet(
  uuid, text, public.pet_species, text, date, boolean, text, integer, bigint
) from public, anon, authenticated;
revoke all on function public.vet_remove_pet(uuid, bigint) from public, anon, authenticated;

grant execute on function public.client_update_pet(
  uuid, text, public.pet_species, text, date, boolean, text, bigint
) to authenticated;
grant execute on function public.client_remove_pet(uuid, bigint) to authenticated;
grant execute on function public.vet_create_pet(
  uuid, text, public.pet_species, text, date, boolean, text, integer
) to authenticated;
grant execute on function public.vet_update_pet(
  uuid, text, public.pet_species, text, date, boolean, text, integer, bigint
) to authenticated;
grant execute on function public.vet_remove_pet(uuid, bigint) to authenticated;
