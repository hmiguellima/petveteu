create or replace function public.is_vet()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'vet'
      and (
        not mfa_required
        or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      )
  );
$$;

revoke all on function public.is_vet() from public, anon;
grant execute on function public.is_vet() to authenticated;

comment on function public.is_vet() is
  'Authorizes vets and, when their profile policy requires MFA, only AAL2 sessions.';
