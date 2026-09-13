-- Tighten the foundational data contract independently of browser-facing
-- mutation functions. These constraints also protect service-role writes.

alter table public.profiles
  add constraint profiles_full_name_trimmed
    check (full_name = btrim(full_name)),
  add constraint profiles_phone_requires_incomplete_state
    check (phone is not null or is_incomplete),
  add constraint profiles_version_positive
    check (version > 0);

alter table public.pets
  alter column notification_expiry_years drop not null,
  add constraint pets_name_trimmed
    check (name = btrim(name)),
  add constraint pets_other_species_trimmed
    check (other_species is null or other_species = btrim(other_species)),
  add constraint pets_breed_trimmed
    check (breed is null or breed = btrim(breed)),
  add constraint pets_version_positive
    check (version > 0);

create function public.apply_pet_notification_expiry_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.notification_expiry_years is null then
    new.notification_expiry_years := case new.species
      when 'dog' then 12
      when 'cat' then 15
      else 10
    end;
  end if;

  return new;
end;
$$;

create trigger pets_notification_expiry_default
before insert or update of species, notification_expiry_years
on public.pets
for each row
execute function public.apply_pet_notification_expiry_default();

alter table public.pets
  alter column notification_expiry_years set not null;

alter table public.vaccination_entries
  add constraint vaccination_vaccine_type_trimmed
    check (vaccine_type = btrim(vaccine_type)),
  add constraint vaccination_notes_trimmed
    check (notes is null or notes = btrim(notes)),
  add constraint vaccination_version_positive
    check (version > 0);

alter table public.reminders
  add column version bigint not null default 1,
  add constraint reminders_version_positive
    check (version > 0);

create trigger reminders_touch
before update on public.reminders
for each row
execute function public.touch_version();

alter table public.reminder_attempts
  add constraint reminder_attempt_reason_trimmed
    check (reason_code is null or reason_code = btrim(reason_code)),
  add constraint reminder_attempt_reason_required
    check (
      outcome in ('dry_run', 'submitted')
      or reason_code is not null
    ),
  add constraint reminder_attempt_provider_sid_trimmed
    check (provider_sid is null or provider_sid = btrim(provider_sid));

alter table public.reminder_job_runs
  add constraint reminder_job_run_lifecycle
    check (
      (status = 'running' and completed_at is null and error_code is null)
      or (status = 'succeeded' and completed_at is not null and error_code is null)
      or (status = 'failed' and completed_at is not null and error_code is not null)
    ),
  add constraint reminder_job_run_completion_order
    check (completed_at is null or completed_at >= started_at),
  add constraint reminder_job_run_error_code_trimmed
    check (error_code is null or error_code = btrim(error_code));

create function public.audit_details_are_safe(details jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(details) = 'object'
    and not exists (
      select 1
      from jsonb_object_keys(details) as key
      where lower(key) = any (
        array[
          'authorization',
          'credential',
          'credentials',
          'password',
          'secret',
          'session',
          'token'
        ]
      )
    );
$$;

alter table public.admin_audit_events
  add constraint admin_audit_action_bounded
    check (action = btrim(action) and length(action) between 1 and 80),
  add constraint admin_audit_details_safe
    check (public.audit_details_are_safe(details));

revoke all on function public.apply_pet_notification_expiry_default() from public, anon, authenticated;
revoke all on function public.audit_details_are_safe(jsonb) from public, anon, authenticated;
