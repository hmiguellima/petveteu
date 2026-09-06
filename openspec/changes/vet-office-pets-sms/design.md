## Context

Greenfield repo (README only). Constraints from the proposal: Next.js frontend on Vercel, Supabase for data and auth, Twilio for SMS, two role-separated web surfaces, Portuguese-primary i18n. Behavior contracts are in `specs/`. Practice timezone for calendar logic is Europe/Lisbon.

## Goals / Non-Goals

**Goals:**

- One Next.js app on Vercel with `/client` and `/vet` route groups, sharing one Supabase project.
- Postgres as the system of record with row-level security so clients cannot read or write other owners’ data.
- A scheduled job that evaluates due vaccines daily and sends Twilio SMS according to the notification spec.
- next-intl (or equivalent) message catalogs for `pt-PT` and `en` covering UI and SMS templates.

**Non-Goals:**

- Multi-clinic / multi-tenant marketplace (one practice).
- Multiple vet or staff accounts; v1 has exactly one vet user.
- In-app or email reminders; payments; inventory; appointment booking; medical imaging.
- Client-editable clinical data (schedules, expiry ages).
- WhatsApp, voice, or inbound SMS handling.
- Migrating data from an existing PMS.

## Decisions

### 1. Next.js App Router (TypeScript) + Supabase SSR

**Choice:** Next.js (App Router) hosted on Vercel, `@supabase/ssr` for cookie sessions, server components for portal pages.

**Why:** Fits a form-heavy authenticated app, keeps secrets off the client, and pairs cleanly with Supabase Auth. One codebase for both portals avoids duplicating i18n and data access.

**Alternatives considered:** Separate Vite SPAs (more auth/CORS surface); Remix (less common with Supabase templates); hosting on Netlify or a generic Node host (rejected — production MUST be Vercel).

### 2. Email/password Auth with a `profiles` row per user

**Choice:** Supabase Auth email+password. A `profiles` table keyed by `auth.users.id` holds `role` (`client` | `vet`), `full_name`, `phone` (E.164), `locale` (`pt-PT` | `en`), `sms_enabled_by_client` (default true), `sms_enabled_by_vet` (default true).

**Why:** Spec requires unique email and phone plus two independent SMS switches. Auth owns credentials; `profiles` owns clinic fields. A trigger on `auth.users` insert creates the profile when registration or vet-created invites complete.

**Alternatives considered:** Magic links only (weaker for staff); phone OTP as primary login (Twilio cost on every login; still collect phone for SMS).

**Bootstrap:** If no `vet` profile exists, a documented one-time env (`BOOTSTRAP_VET_EMAIL`) plus a protected script creates the single vet. A unique partial index on `profiles.role` where `role = 'vet'` enforces at most one vet. There is no invite-vet UI or API.

### 3. Data model

```
profiles (1) ──< pets (1) ──< vaccination_entries
                    │
                    └── notification_expiry_years
vaccination_entries (1) ──< reminder_deliveries
```

- `pets.species`: `dog` | `cat` | `other` (drives default expiry 12 / 15 / 10 years).
- `vaccination_entries.due_date`: `date` (no time); uniqueness of reminder keyed by `(vaccination_entry_id, due_date)`.
- `reminder_deliveries`: `status` `sent` | `skipped`, `skip_reason`, `provider_message_sid`, `created_at`.

Soft-delete pets (`deleted_at`) so history remains; reminder job ignores deleted pets. Spec “remove” = set `deleted_at`.

### 4. RLS

- **Client:** `select/update` own `profiles` row (cannot change `role` or `sms_enabled_by_vet`); CRUD own non-deleted pets except `notification_expiry_years` is not updatable by client; `select` own pets’ vaccination entries; no insert/update/delete on vaccinations.
- **Vet:** full access to all profiles with `role = client`, all pets, and all vaccinations. The vet JWT MUST NOT insert or update `role = 'vet'` on any profile. Role `vet` is assigned only by the bootstrap script using the service role.
- Service role used only by the reminder Edge Function.

### 5. Daily reminder job, not per-row cron

**Choice:** Supabase scheduled Edge Function (cron, once daily ~08:00 Europe/Lisbon) using the service role. Query: entries whose `due_date` is today + 0..2 days (window start = due_date - 2), pet not deleted, age in whole years `< expiry`, both SMS flags true, phone valid E.164, no `reminder_deliveries` row for `(entry_id, current due_date)`.

**Why:** Volume is clinic-scale (hundreds of pets, not millions). Daily batch is cheaper and easier to audit than firing a function per row. Two calendar days before, inclusive, matches the spec when run daily.

**Twilio:** REST Messages API from the Edge Function; Account SID, Auth Token, and from-number in Edge secrets. On success, insert `sent` + SID; on skip/failure, insert `skipped` with reason (never block the rest of the batch).

**Due-date change:** updating `due_date` leaves old delivery rows keyed to the old date, so the new date is eligible again.

### 6. i18n

**Choice:** `next-intl` with default locale `pt-PT`, alternate `en`, locale stored on `profiles` and on a cookie for anonymous pages. SMS bodies are functions of the same message catalogs (or a dedicated `sms` namespace) keyed by client locale, fallback `pt-PT`.

**Why:** Spec requires UI + SMS in both languages and Portuguese fallback, not raw keys.

### 7. Phone uniqueness and validation

**Choice:** Store phones as E.164; unique index on `profiles.phone` where not null. Validate with libphonenumber (or Twilio Lookup only if validation fails locally — optional later). Portugal `+351` is the expected majority; no country lock-in in the schema.

## Risks / Trade-offs

- **[SMS cost / GDPR]** Phone numbers and pet names in SMS logs → Mitigation: store only Twilio SID + status in-app; minimize PII in Twilio dashboard retention; document a DPA with Twilio; no marketing SMS.
- **[Failed delivery]** Carrier failures look like “we notified them” → Mitigation: persist `skipped`/`sent`; show last delivery status on the vet’s client/pet view.
- **[Timezone edge]** UTC midnight jobs miss Lisbon dates → Mitigation: job timezone Europe/Lisbon; store `date` not `timestamptz` for due dates.
- **[Auth vs clinic create]** Vet-created clients need a password or invite → Mitigation: generate a recovery/invite email via Supabase invite; vet still captures phone immediately for SMS.
- **[Client deletes pet]** Accidental loss of schedule → Mitigation: soft-delete; vet can restore in a later iteration if needed (restore is not in v1 spec).
- **[Single clinic]** Hard-coding one org → Mitigation: no `clinic_id` in v1; adding it later is a schema change.

## Migration Plan

1. Create Supabase project (EU region), apply SQL migrations (tables, RLS, triggers, indexes).
2. Configure Auth (email confirmations as product choice: recommend confirmation on, invite for vet-created clients).
3. Deploy the Next.js app to Vercel with env: Supabase URL/anon key; service role only on Edge Functions.
4. Configure Twilio credentials and a daily cron schedule.
5. Bootstrap first vet; smoke-test registration, pet CRUD, schedule CRUD, and a dry-run reminder (feature flag `SMS_DRY_RUN` logs instead of send).
6. Rollback: disable cron and Twilio; app is stateless besides Postgres — restore DB backup if needed.

## Open Questions

- Whether email confirmation is required before the client portal is usable (does not change reminder rules once a phone exists).
- Exact vaccine-type catalog (free text vs a short list) — v1 uses free text to avoid blocking clinical variety.
