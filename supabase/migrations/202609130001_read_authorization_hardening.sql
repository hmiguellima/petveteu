-- Vets retain access to clinic history. Clients can read only their own active
-- registry and clinical records.

drop policy pet_read on public.pets;
create policy pet_read
on public.pets
for select
to authenticated
using (
  public.is_vet()
  or (owner_id = auth.uid() and deleted_at is null)
);

drop policy vaccine_read on public.vaccination_entries;
create policy vaccine_read
on public.vaccination_entries
for select
to authenticated
using (
  public.is_vet()
  or (
    deleted_at is null
    and exists (
      select 1
      from public.pets
      where public.pets.id = vaccination_entries.pet_id
        and public.pets.owner_id = auth.uid()
        and public.pets.deleted_at is null
    )
  )
);

drop policy reminder_read on public.reminders;
create policy reminder_read
on public.reminders
for select
to authenticated
using (
  public.is_vet()
  or exists (
    select 1
    from public.vaccination_entries
    join public.pets
      on public.pets.id = public.vaccination_entries.pet_id
    where public.vaccination_entries.id = reminders.vaccination_entry_id
      and public.vaccination_entries.deleted_at is null
      and public.pets.owner_id = auth.uid()
      and public.pets.deleted_at is null
  )
);

drop policy attempt_read on public.reminder_attempts;
create policy attempt_read
on public.reminder_attempts
for select
to authenticated
using (
  public.is_vet()
  or exists (
    select 1
    from public.reminders
    join public.vaccination_entries
      on public.vaccination_entries.id = public.reminders.vaccination_entry_id
    join public.pets
      on public.pets.id = public.vaccination_entries.pet_id
    where public.reminders.id = reminder_attempts.reminder_id
      and public.vaccination_entries.deleted_at is null
      and public.pets.owner_id = auth.uid()
      and public.pets.deleted_at is null
  )
);
