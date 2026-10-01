drop trigger if exists profiles_reopen_reminders_after_eligibility_change on public.profiles;
drop function if exists public.reopen_profile_reminders_after_eligibility_change();

create function public.reopen_client_setting_reminders_after_eligibility_change()
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
    and public.pets.owner_id = new.profile_id
    and public.reminders.status = 'permanently_skipped'
    and public.reminders.due_date >= (now() at time zone 'Europe/Lisbon')::date;

  return new;
end;
$$;

create trigger client_settings_reopen_reminders_after_eligibility_change
after update of phone, sms_enabled_by_client, sms_enabled_by_vet
on public.client_settings
for each row
when (
  old.phone is distinct from new.phone
  or old.sms_enabled_by_client is distinct from new.sms_enabled_by_client
  or old.sms_enabled_by_vet is distinct from new.sms_enabled_by_vet
)
execute function public.reopen_client_setting_reminders_after_eligibility_change();

revoke all on function public.reopen_client_setting_reminders_after_eligibility_change() from public;

-- Repair only current or future skips whose recorded client-setting condition
-- is no longer true. The worker rechecks every other eligibility condition.
update public.reminders as reminder
set status = 'pending'
from public.vaccination_entries as vaccination
join public.pets as pet on pet.id = vaccination.pet_id
join public.client_settings as settings on settings.profile_id = pet.owner_id
where vaccination.id = reminder.vaccination_entry_id
  and reminder.status = 'permanently_skipped'
  and reminder.due_date >= (now() at time zone 'Europe/Lisbon')::date
  and case (
    select attempt.reason_code
    from public.reminder_attempts as attempt
    where attempt.reminder_id = reminder.id
    order by attempt.created_at desc
    limit 1
  )
    when 'invalid_phone' then settings.phone is not null
    when 'client_opt_out' then settings.sms_enabled_by_client
    when 'vet_opt_out' then settings.sms_enabled_by_vet
    else false
  end;
