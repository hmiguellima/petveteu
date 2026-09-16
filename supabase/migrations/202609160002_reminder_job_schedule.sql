-- The worker validates this credential against the REMINDER_CRON_SECRET Edge
-- Function secret. Configure both values from the same protected secret source.
-- app.settings.reminder_url is the deployed reminders function URL.

create function public.reopen_profile_reminders_after_eligibility_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reminders
  set status = 'pending'
  from public.vaccination_entries, public.pets
  where public.vaccination_entries.id = public.reminders.vaccination_entry_id
    and public.pets.id = public.vaccination_entries.pet_id
    and public.pets.owner_id = new.id
    and public.reminders.status = 'permanently_skipped'
    and public.reminders.due_date >= current_date;

  return new;
end;
$$;

create trigger profiles_reopen_reminders_after_eligibility_change
after update of phone, sms_enabled_by_client, sms_enabled_by_vet
on public.profiles
for each row
when (
  old.phone is distinct from new.phone
  or old.sms_enabled_by_client is distinct from new.sms_enabled_by_client
  or old.sms_enabled_by_vet is distinct from new.sms_enabled_by_vet
)
execute function public.reopen_profile_reminders_after_eligibility_change();

create function public.reopen_pet_reminders_after_eligibility_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reminders
  set status = 'pending'
  from public.vaccination_entries
  where public.vaccination_entries.id = public.reminders.vaccination_entry_id
    and public.vaccination_entries.pet_id = new.id
    and public.reminders.status = 'permanently_skipped'
    and public.reminders.due_date >= current_date;

  return new;
end;
$$;

create trigger pets_reopen_reminders_after_eligibility_change
after update of date_of_birth, notification_expiry_years, deleted_at
on public.pets
for each row
when (
  old.date_of_birth is distinct from new.date_of_birth
  or old.notification_expiry_years is distinct from new.notification_expiry_years
  or old.deleted_at is distinct from new.deleted_at
)
execute function public.reopen_pet_reminders_after_eligibility_change();

revoke all on function public.reopen_profile_reminders_after_eligibility_change() from public;
revoke all on function public.reopen_pet_reminders_after_eligibility_change() from public;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname in ('daily-vaccine-reminders', 'monitor-daily-vaccine-reminders')
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'daily-vaccine-reminders',
  '0 8 * * *',
  $$
    select net.http_post(
      url := current_setting('app.settings.reminder_url')::text,
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || current_setting('app.settings.reminder_cron_secret')
      ),
      body := '{"source":"scheduled"}'::jsonb
    )
  $$
);

-- Monitoring follows the worker after a grace period and reports a missing or
-- failed current-Lisbon-date run through the configured alert webhook.
select cron.schedule(
  'monitor-daily-vaccine-reminders',
  '0 9 * * *',
  $$
    select net.http_post(
      url := current_setting('app.settings.reminder_url')::text,
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || current_setting('app.settings.reminder_cron_secret')
      ),
      body := '{"source":"scheduled","mode":"monitor"}'::jsonb
    )
  $$
);
