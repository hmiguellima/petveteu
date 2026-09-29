create type public.vet_access_status as enum ('pending_mfa', 'active');
create type public.vet_invitation_status as enum ('pending', 'accepted', 'cancelled', 'expired');
create type public.membership_event as enum ('vet_activated', 'vet_revoked', 'vet_reinstated');

create table public.account_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create table public.client_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  is_incomplete boolean not null default true,
  sms_enabled_by_client boolean not null default true,
  sms_enabled_by_vet boolean not null default true,
  processing_restricted boolean not null default false,
  legal_hold_until date,
  privacy_notice_version text check (privacy_notice_version is null or length(privacy_notice_version) between 1 and 80),
  privacy_notice_presented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  check ((privacy_notice_version is null and privacy_notice_presented_at is null) or (privacy_notice_version is not null and privacy_notice_presented_at is not null))
);
create unique index client_settings_phone_unique on public.client_settings(phone) where phone is not null;

create table public.vet_access (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status public.vet_access_status not null,
  email_locked_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and activated_at is not null) or status = 'pending_mfa')
);

create table public.vet_invitations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and length(email) <= 320),
  invited_by uuid not null references public.profiles(id),
  status public.vet_invitation_status not null default 'pending',
  provider_reference text check (provider_reference is null or length(provider_reference) <= 160),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create unique index one_pending_vet_invitation_per_email on public.vet_invitations(email) where status = 'pending';

create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event public.membership_event not null,
  actor_id uuid references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.account_roles(profile_id, role) select id, role from public.profiles;
insert into public.client_settings(profile_id, phone, is_incomplete, sms_enabled_by_client, sms_enabled_by_vet, processing_restricted, legal_hold_until, created_at, updated_at, version)
select id, phone, is_incomplete, sms_enabled_by_client, sms_enabled_by_vet, processing_restricted, legal_hold_until, created_at, updated_at, version from public.profiles where role = 'client';
insert into public.vet_access(profile_id, status, activated_at, created_at, updated_at)
select id, 'active', now(), created_at, updated_at from public.profiles where role = 'vet';

do $$ begin
  if exists (select 1 from public.pets p where not exists (select 1 from public.account_roles r where r.profile_id = p.owner_id and r.role = 'client')) then
    raise exception 'pet_owner_without_client_role';
  end if;
end $$;

delete from auth.sessions as session
using public.profiles as profile
where session.user_id = profile.id;

drop index public.one_vet_only;

create function public.has_role(p_role public.user_role) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.account_roles where profile_id = (select auth.uid()) and role = p_role)
$$;
create or replace function public.is_vet() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.account_roles r join public.vet_access v on v.profile_id = r.profile_id where r.profile_id = (select auth.uid()) and r.role = 'vet' and v.status = 'active' and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2')
$$;
revoke all on function public.has_role(public.user_role) from public, anon;
grant execute on function public.has_role(public.user_role) to authenticated;

alter table public.account_roles enable row level security;
alter table public.client_settings enable row level security;
alter table public.vet_access enable row level security;
alter table public.vet_invitations enable row level security;
alter table public.in_app_notifications enable row level security;
create policy account_roles_read on public.account_roles for select to authenticated using (profile_id = (select auth.uid()) or public.is_vet());
create policy client_settings_read on public.client_settings for select to authenticated using (profile_id = (select auth.uid()) or public.is_vet());
create policy vet_access_read on public.vet_access for select to authenticated using (profile_id = (select auth.uid()) or public.is_vet());
create policy vet_invitations_read on public.vet_invitations for select to authenticated using (public.is_vet());
create policy notifications_read on public.in_app_notifications for select to authenticated using (recipient_id = (select auth.uid()));
revoke all on public.account_roles, public.client_settings, public.vet_access, public.vet_invitations, public.in_app_notifications from anon, authenticated;
grant select on public.account_roles, public.client_settings, public.vet_access, public.vet_invitations, public.in_app_notifications to authenticated;
create trigger client_settings_touch before update on public.client_settings for each row execute function public.touch_version();
create trigger vet_access_touch before update on public.vet_access for each row execute function public.touch_version();
