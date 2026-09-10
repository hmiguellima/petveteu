-- Run with Supabase CLI against a disposable local database after `supabase db reset`.
begin;
-- Core invariants
select 1 / (count(*)=1)::int from pg_indexes where indexname='one_vet_only';
select 1 / (count(*)=1)::int from pg_indexes where indexname='active_vaccine_unique';
-- Protected tables expose SELECT but no direct authenticated DML.
select 1 / (not has_table_privilege('authenticated','public.profiles','insert'))::int;
select 1 / (not has_table_privilege('authenticated','public.pets','update'))::int;
select 1 / (not has_table_privilege('authenticated','public.vaccination_entries','delete'))::int;
-- Mutation signatures contain no role, email mirror, owner, or client-controlled expiry parameter.
do $$declare sig text;begin select string_agg(p.proname||pg_get_function_arguments(p.oid),E'\n') into sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';if sig ~ 'update_my_profile.*role|update_my_profile.*email|client_create_pet.*owner|client_create_pet.*expiry' then raise exception 'protected mutation parameter exposed';end if;end$$;
rollback;
