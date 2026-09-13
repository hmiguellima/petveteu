-- Run with Supabase CLI against a disposable local database after `supabase db reset`.
begin;
-- Core invariants
select 1 / (count(*)=1)::int from pg_indexes where indexname='one_vet_only';
select 1 / (count(*)=1)::int from pg_indexes where indexname='active_vaccine_unique';
select 1 / (count(*)=1)::int from pg_indexes where indexname='one_run_per_date';

-- Species-specific expiry defaults are enforced for every database writer.
do $$
declare
  owner_id uuid := gen_random_uuid();
  dog_expiry integer;
  cat_expiry integer;
  other_expiry integer;
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    owner_id,
    'authenticated',
    'authenticated',
    'schema-owner@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Schema Owner","phone":"+351910000001"}',
    now(),
    now()
  );

  insert into public.pets (owner_id, name, species, date_of_birth)
  values (owner_id, 'Dog', 'dog', date '2020-01-01')
  returning notification_expiry_years into dog_expiry;

  insert into public.pets (owner_id, name, species, date_of_birth)
  values (owner_id, 'Cat', 'cat', date '2020-01-01')
  returning notification_expiry_years into cat_expiry;

  insert into public.pets (owner_id, name, species, other_species, date_of_birth)
  values (owner_id, 'Bird', 'other', 'bird', date '2020-01-01')
  returning notification_expiry_years into other_expiry;

  if (dog_expiry, cat_expiry, other_expiry) is distinct from (12, 15, 10) then
    raise exception 'unexpected notification expiry defaults';
  end if;
end;
$$;

-- Auth creates clients regardless of supplied role metadata, mirrors canonical
-- email changes, and permits exactly one bootstrapped vet.
do $$
declare
  first_user_id uuid := gen_random_uuid();
  second_user_id uuid := gen_random_uuid();
  mirrored_email text;
  mirrored_role public.user_role;
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    first_user_id,
    'authenticated',
    'authenticated',
    ' FIRST.VET@EXAMPLE.TEST ',
    '',
    now(),
    '{}',
    '{"full_name":"First Vet","phone":null,"role":"vet"}',
    now(),
    now()
  );

  select email, role
  into mirrored_email, mirrored_role
  from public.profiles
  where id = first_user_id;

  if mirrored_email <> 'first.vet@example.test' or mirrored_role <> 'client' then
    raise exception 'Auth profile was not normalized as a client';
  end if;

  update auth.users
  set email = 'RENAMED.VET@EXAMPLE.TEST'
  where id = first_user_id;

  select email
  into mirrored_email
  from public.profiles
  where id = first_user_id;

  if mirrored_email <> 'renamed.vet@example.test' then
    raise exception 'canonical email change was not mirrored';
  end if;

  update public.profiles
  set role = 'vet'
  where id = first_user_id;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    second_user_id,
    'authenticated',
    'authenticated',
    'second-vet@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Second Vet","phone":null}',
    now(),
    now()
  );

  begin
    update public.profiles
    set role = 'vet'
    where id = second_user_id;
    raise exception 'second vet was accepted';
  exception
    when unique_violation then null;
  end;

  delete from auth.users
  where id in (first_user_id, second_user_id);
end;
$$;

-- Expected constraint failures must be rejected by PostgreSQL.
do $$
begin
  begin
    insert into public.admin_audit_events (action, details)
    values ('unsafe', '{"token":"must-not-be-stored"}');
    raise exception 'unsafe audit details accepted';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.reminder_job_runs (
      business_date,
      trigger_source,
      status,
      completed_at
    ) values (current_date, 'scheduled', 'running', now());
    raise exception 'invalid running job lifecycle accepted';
  exception
    when check_violation then null;
  end;
end;
$$;

-- Protected tables expose SELECT but no direct authenticated DML.
select 1 / (not has_table_privilege('authenticated','public.profiles','insert'))::int;
select 1 / (not has_table_privilege('authenticated','public.pets','update'))::int;
select 1 / (not has_table_privilege('authenticated','public.vaccination_entries','delete'))::int;

-- Read policies enforce ownership for clients and full historical visibility
-- for the vet while operational and administrative records remain vet-only.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'client-one@example.test', '', now(), '{}',
    '{"full_name":"Client One","phone":"+351910000011"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'client-two@example.test', '', now(), '{}',
    '{"full_name":"Client Two","phone":"+351910000012"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'vet@example.test', '', now(), '{}',
    '{"full_name":"Vet","phone":null}', now(), now()
  );

update public.profiles
set role = 'vet'
where id = '10000000-0000-0000-0000-000000000003';

insert into public.pets (
  id, owner_id, name, species, date_of_birth, deleted_at
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Active One', 'dog', date '2020-01-01', null
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Deleted One', 'cat', date '2020-01-01', now()
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'Active Two', 'dog', date '2020-01-01', null
  );

insert into public.vaccination_entries (
  id, pet_id, vaccine_type, due_date, deleted_at
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Rabies', current_date, null
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'Booster', current_date, null
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'Rabies', current_date, null
  );

insert into public.reminders (
  id, vaccination_entry_id, due_date
) values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001', current_date
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002', current_date
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003', current_date
  );

insert into public.reminder_attempts (reminder_id, outcome)
values
  ('40000000-0000-0000-0000-000000000001', 'dry_run'),
  ('40000000-0000-0000-0000-000000000002', 'dry_run'),
  ('40000000-0000-0000-0000-000000000003', 'dry_run');

insert into public.reminder_job_runs (
  business_date, trigger_source, status, completed_at
) values (current_date, 'scheduled', 'succeeded', now());

insert into public.admin_audit_events (action)
values ('verification_event');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select 1 / (count(*) = 1)::int from public.profiles;
select 1 / (count(*) = 1)::int from public.pets;
select 1 / (count(*) = 1)::int from public.vaccination_entries;
select 1 / (count(*) = 1)::int from public.reminders;
select 1 / (count(*) = 1)::int from public.reminder_attempts;
select 1 / (count(*) = 0)::int from public.reminder_job_runs;
select 1 / (count(*) = 0)::int from public.admin_audit_events;

do $$
begin
  begin
    update public.profiles
    set role = 'vet'
    where id = auth.uid();
    raise exception 'direct role escalation was accepted';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.pets (
      owner_id, name, species, date_of_birth
    ) values (
      auth.uid(), 'Direct Write', 'dog', current_date
    );
    raise exception 'direct pet insert was accepted';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select 1 / (count(*) = 1)::int from public.profiles;
select 1 / (count(*) = 1)::int from public.pets;
select 1 / (count(*) = 1)::int from public.vaccination_entries;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
select 1 / (public.is_vet())::int;
select 1 / (count(*) = 4)::int from public.profiles;
select 1 / (count(*) = 6)::int from public.pets;
select 1 / (count(*) = 3)::int from public.vaccination_entries;
select 1 / (count(*) = 3)::int from public.reminders;
select 1 / (count(*) = 3)::int from public.reminder_attempts;
select 1 / (count(*) = 1)::int from public.reminder_job_runs;
select 1 / (count(*) = 1)::int from public.admin_audit_events;
reset role;

-- Role-specific mutations enforce protected fields, ownership, soft deletion,
-- and optimistic concurrency even though they execute as their owner.
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select public.client_update_pet(
  '20000000-0000-0000-0000-000000000001',
  'Updated One',
  'dog',
  null,
  date '2020-01-01',
  true,
  null,
  1
);
select 1 / (notification_expiry_years = 12)::int
from public.pets
where id = '20000000-0000-0000-0000-000000000001';

do $$
begin
  begin
    perform public.client_update_pet(
      '20000000-0000-0000-0000-000000000001',
      'Stale', 'dog', null, date '2020-01-01', false, null, 1
    );
    raise exception 'stale client update was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'stale_or_forbidden' then
        raise;
      end if;
  end;

  begin
    perform public.client_update_pet(
      '20000000-0000-0000-0000-000000000003',
      'Cross owner', 'dog', null, date '2020-01-01', false, null, 1
    );
    raise exception 'cross-owner client update was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'stale_or_forbidden' then
        raise;
      end if;
  end;

  begin
    perform public.vet_save_vaccination(
      null,
      '20000000-0000-0000-0000-000000000001',
      'Client injection',
      current_date,
      null,
      null,
      0
    );
    raise exception 'client vaccination mutation was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'forbidden' then
        raise;
      end if;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
select public.vet_update_pet(
  '20000000-0000-0000-0000-000000000001',
  'Vet Updated',
  'dog',
  null,
  date '2020-01-01',
  false,
  null,
  5,
  2
);
select 1 / (notification_expiry_years = 5)::int
from public.pets
where id = '20000000-0000-0000-0000-000000000001';

select public.vet_save_vaccination(
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Rabies',
  current_date + 1,
  null,
  null,
  1
);
select 1 / (status = 'cancelled')::int
from public.reminders
where id = '40000000-0000-0000-0000-000000000001';

do $$
begin
  begin
    perform public.vet_update_pet(
      '20000000-0000-0000-0000-000000000002',
      'Deleted', 'cat', null, date '2020-01-01', false, null, 15, 1
    );
    raise exception 'deleted pet mutation was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'stale_or_forbidden' then
        raise;
      end if;
  end;

  begin
    perform public.vet_save_vaccination(
      '30000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'Stale Rabies',
      current_date + 2,
      null,
      null,
      1
    );
    raise exception 'stale vaccination update was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'stale_or_forbidden' then
        raise;
      end if;
  end;

  begin
    insert into public.reminders (vaccination_entry_id, due_date)
    values (
      '30000000-0000-0000-0000-000000000003',
      current_date
    );
    raise exception 'duplicate reminder was accepted';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- Mutation signatures contain no role, email mirror, owner, or client-controlled expiry parameter.
do $$
begin
  if exists (
    select 1
    from pg_proc function_definition
    join pg_namespace function_schema
      on function_schema.oid = function_definition.pronamespace
    where function_schema.nspname = 'public'
      and (
        (
          function_definition.proname = 'update_my_profile'
          and pg_get_function_arguments(function_definition.oid) ~ '(^|, )p_(role|email|sms_enabled_by_vet)( |$)'
        )
        or (
          function_definition.proname like 'client_%pet'
          and pg_get_function_arguments(function_definition.oid) ~ '(^|, )p_(owner|owner_id|expiry)( |$)'
        )
      )
  ) then
    raise exception 'protected mutation parameter exposed';
  end if;
end;
$$;
select 1 / (to_regprocedure(
  'public.update_pet(uuid,text,public.pet_species,text,date,boolean,text,integer,bigint)'
) is null)::int;
select 1 / (to_regprocedure('public.remove_pet(uuid,bigint)') is null)::int;

-- All browser mutation functions are security definers with an empty fixed
-- search path. Anonymous callers cannot execute them.
select 1 / (count(*) = 0)::int
from pg_proc function_definition
join pg_namespace function_schema
  on function_schema.oid = function_definition.pronamespace
where function_schema.nspname = 'public'
  and (
    function_definition.proname in (
      'update_my_profile',
      'client_create_pet',
      'client_update_pet',
      'client_remove_pet',
      'vet_update_client',
      'vet_create_pet',
      'vet_update_pet',
      'vet_remove_pet',
      'vet_save_vaccination',
      'vet_remove_vaccination'
    )
  )
  and (
    not function_definition.prosecdef
    or not coalesce(function_definition.proconfig, '{}') @> array['search_path=""']
    or has_function_privilege(
      'anon',
      function_definition.oid,
      'execute'
    )
  );
rollback;
