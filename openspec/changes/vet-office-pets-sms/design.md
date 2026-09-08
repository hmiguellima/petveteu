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

**Choice:** Supabase Auth email+password. A `profiles` table keyed by `auth.users.id` holds `role` (`client` | `vet`), a read-only mirror of `email`, `full_name`, `phone` (E.164), `locale` (`pt-PT` | `en`), `sms_enabled_by_client` (default true), `sms_enabled_by_vet` (default true).

**Why:** Spec requires unique email and phone plus two independent SMS switches. `auth.users.email` is the canonical login email; `profiles.email` is a normalized, trigger-maintained mirror so portal queries can display and search it without exposing `auth.users`. A trigger on `auth.users` insert creates the profile when registration or vet-created invites complete, and a trigger on canonical email change synchronizes the mirror. Portal users MUST NOT update the mirror directly. The profile mirror has a unique case-insensitive index as defense in depth.

**Email changes:** A client changes their own login email through the Supabase authenticated email-change flow. When confirmation is enabled, the existing email remains canonical until confirmation completes. A vet-requested client email change uses a protected server-side administrative operation that updates Supabase Auth; its trusted execution boundary is defined separately. In both cases, the Auth change drives synchronization to `profiles.email` rather than updating the profile first.

**Administrative boundary:** Authenticated Supabase Edge Functions are the only application-facing path for privileged Auth operations such as inviting a client, changing a client's canonical login email, and resending an invitation. Each function validates the caller JWT, re-reads the caller's `profiles.role`, requires `vet`, restricts targets to existing or newly created `client` accounts, normalizes and validates input, and exposes only explicitly supported operations rather than a generic Auth Admin proxy. A requested role is never accepted from the client payload. Administrative actions are recorded without credentials, session tokens, or passwords in an `admin_audit_events` table. Duplicate contact conflicts return safe, non-sensitive errors.

The service-role key is stored only in Supabase Edge Function secrets and the protected one-time bootstrap environment; it is never exposed to browser code or stored in Vercel application variables. Client self-service email changes use the ordinary authenticated Supabase client and do not cross the administrative boundary.

**Alternatives considered:** Magic links only (weaker for staff); phone OTP as primary login (Twilio cost on every login; still collect phone for SMS).

**Bootstrap:** If no `vet` profile exists, a documented one-time env (`BOOTSTRAP_VET_EMAIL`) plus a protected script creates the single vet. A unique partial index on `profiles.role` where `role = 'vet'` enforces at most one vet. There is no invite-vet UI or API.

### 3. Data model

```
profiles (1) ──< pets (1) ──< vaccination_entries
                    │
                    └── notification_expiry_years
vaccination_entries (1) ──< reminders (1) ──< reminder_attempts
```

- `pets.species`: `dog` | `cat` | `other` (drives default expiry 12 / 15 / 10 years).
- `vaccination_entries.due_date`: `date` (no time); reminder uniqueness keyed by `(vaccination_entry_id, due_date)`.
- `reminders`: one lifecycle row per vaccination entry and due date, with status `pending` | `submitted` | `delivered` | `exhausted` | `cancelled`.
- `reminder_attempts`: one audit row per execution attempt, including its outcome, reason, provider message SID, and timestamp.

Soft-delete pets (`deleted_at`) so history remains; reminder job ignores deleted pets. Spec “remove” = set `deleted_at`.

### 4. RLS

- **Reads:** RLS permits clients to select their own profile, non-deleted pets, schedules, and visible reminder information. The vet may select client profiles, pets, schedules, reminders, attempts, and administrative audit information. No client can select another client's records.
- **Writes:** Browser-facing roles have no direct `insert`, `update`, or `delete` grants on protected application tables. Mutations use narrowly scoped Postgres functions rather than generic table writes.
- **Client mutation functions:** accept only permitted fields, derive the owner from `auth.uid()`, and check current ownership and role. They never accept `role`, mirrored `email`, `sms_enabled_by_vet`, pet `owner_id`, or `notification_expiry_years`.
- **Vet mutation functions:** re-check the current `vet` role and expose only the fields required to manage clients, pets, and vaccination schedules. They never accept a profile role or directly update the mirrored email. Pet ownership is immutable after creation.
- **Function hardening:** mutation functions use `SECURITY DEFINER` only where needed, set a fixed safe `search_path`, schema-qualify referenced objects, grant execute only to the intended authenticated role, and explicitly perform authorization because definer functions may bypass RLS.
- **Deletion:** pet removal functions only set `deleted_at`; physical deletion is not exposed to portal users.
- Role `vet` is assigned only by the bootstrap script using the service role, and no portal mutation can insert or update it.
- Service role used only by narrowly scoped administrative and reminder Edge Functions, plus the protected one-time bootstrap script. Every administrative function independently verifies the authenticated caller and their current database role before using it.

### 5. Daily reminder job, not per-row cron

**Choice:** Supabase scheduled Edge Function triggered once daily at 08:00 UTC using the service role. This runs at 08:00 in Lisbon during standard time and 09:00 during daylight-saving time, which satisfies the approximate 08:00 requirement without seasonal cron changes. The function computes its business date and all due-date and whole-year age comparisons in `Europe/Lisbon`. Query: entries whose `due_date` is the Lisbon business date + 0..2 days (window start = due date - 2), pet not deleted, age in whole years `< expiry`, both SMS flags true, and no successfully submitted reminder for `(entry_id, current due_date)`.

**Why:** Volume is clinic-scale (hundreds of pets, not millions). Daily batch is cheaper and easier to audit than firing a function per row. Two calendar days before, inclusive, matches the spec when run daily.

**Retry policy:** Retry transient provider or network failures on a later daily run while the current Europe/Lisbon date is no later than the vaccine due date. Do not retry permanent conditions such as an invalid phone, opt-out, deleted pet, or notification-age expiry. If no submission succeeds by the end of the due date, mark the reminder `exhausted`. Sending after the due date is out of scope and may be introduced later as a separate overdue-reminder feature with different copy.

**Twilio:** REST Messages API from the Edge Function; Account SID, Auth Token, and from-number in Edge secrets. Each evaluation or send creates a `reminder_attempts` audit row. A successful provider submission sets the reminder to `submitted` and stores the SID on the attempt. A transient failure leaves it eligible for retry; a permanent skip ends the reminder lifecycle without blocking processing of the rest of the batch.

**Dry-run:** When `SMS_DRY_RUN` is enabled, render and validate the reminder without calling Twilio. Record a `dry_run` attempt with no provider SID and leave the reminder `pending`, so it remains eligible for a real submission if dry-run mode is disabled while the entry is still within its reminder window. Dry-run attempts MUST NOT be presented as sent or delivered. Repeated manual dry runs may create separate timestamped attempts; audit records should avoid retaining the full SMS body unless explicitly needed for short-lived diagnostic logging.

**Due-date change:** updating `due_date` leaves the old reminder and attempts keyed to the old date, so the new date is eligible for a new reminder.

**Run control:** A `reminder_job_runs` row records the Lisbon business date, trigger source (`scheduled` or `manual`), start and completion timestamps, and outcome. A uniqueness rule permits only one active or successful run per Lisbon business date, preventing overlapping batches; reminder uniqueness remains the final duplicate-send defense. A protected vet/operator action may rerun the current business date after a failed run. Monitoring alerts when a run fails or no successful run exists for the expected Lisbon date.

### 6. i18n

**Choice:** `next-intl` with default locale `pt-PT`, alternate `en`, locale stored on `profiles` and on a cookie for anonymous pages. SMS bodies are functions of the same message catalogs (or a dedicated `sms` namespace) keyed by client locale, fallback `pt-PT`.

**Why:** Spec requires UI + SMS in both languages and Portuguese fallback, not raw keys.

### 7. Phone uniqueness and validation

**Choice:** Store phones as E.164; unique index on `profiles.phone` where not null. Validate with libphonenumber (or Twilio Lookup only if validation fails locally — optional later). Portugal `+351` is the expected majority; no country lock-in in the schema.

### 8. Data protection and retention

**Roles and governance:** The veterinary practice is expected to act as controller for the application data, with Supabase, Vercel, Twilio, and any other applicable vendors acting as processors or subprocessors as determined contractually. Before production, the practice must document its processing activities, providers, data locations and transfers, execute appropriate data-processing agreements, and assess any safeguards required for transfers outside the EEA.

**Transparency and lawful basis:** Provide a Portuguese-first privacy notice, with English coverage, at self-registration and through the portals. It identifies the controller and contact route and explains each purpose, data category, lawful basis, recipient category, transfer, retention period or criterion, individual rights, and supervisory-authority complaint route. Vet-created clients receive the same information directly. The lawful basis for account management, clinic records, security auditing, and SMS reminders is documented separately and confirmed with qualified Portuguese legal advice; the implementation does not assume all processing relies on consent.

**Rights:** V1 may use an authenticated, clinic-assisted workflow rather than full self-service automation for access/export, correction, objection, restriction, and erasure requests. Requests, identity verification, decisions, completion dates, and any lawful refusal or retention reason are audited without copying unnecessary personal data into the audit record.

**Retention:** Production launch is blocked until the practice approves concrete retention or review periods for profiles, clinical records, reminders and attempts, job and administrative audit events, backups, and diagnostic logs. Soft deletion immediately removes a pet from normal portal and reminder processing but is not indefinite retention. At the end of the approved period, data is erased or irreversibly anonymized unless a documented legal obligation or hold applies. Account erasure must preserve only data that has a documented continuing basis and must always cancel future reminders.

**Security and incidents:** Require MFA for the vet account before production. Minimize data collection and redact application logs; do not retain SMS bodies, secrets, credentials, or session tokens in ordinary logs. Document production access, backup protection and restoration tests, incident detection and response, processor escalation, breach assessment, and applicable supervisory-authority and individual notification workflows. Perform and record a DPIA screening before launch and complete a DPIA if that screening identifies likely high risk.

**Legal checkpoint:** Exact lawful bases, retention periods, notice wording, controller identity, processor/transfer documents, and whether a full DPIA or DPO is required are operational/legal decisions for the practice and qualified Portuguese counsel, not application defaults.

### 9. Validation and concurrent updates

**Boundary:** Validate in forms for timely feedback and repeat every rule in database constraints or mutation functions, which remain authoritative. Trim human-entered strings, normalize email for comparison, accept strict ISO dates at system boundaries, and render free text as text rather than HTML.

**Profiles:** `full_name` is 1–120 characters after trimming; `locale` is `pt-PT` or `en`. Public registration requires a unique canonical email and valid unique E.164 phone. Normal create and update operations reject malformed phone text and store only valid E.164 or `null`; `null` is permitted only for an explicitly incomplete vet-created or legacy record. Reminder processing remains defensive toward missing or historical invalid values.

**Pets:** `name` is 1–100 characters; optional `breed` is at most 100 characters. `date_of_birth` cannot be in the future, and `birth_date_is_estimated` records whether it is approximate. `species` is `dog` | `cat` | `other`; optional `other_species` is a trimmed label used when `species = other`. `notification_expiry_years` is an integer from 1 through 50 and may be set at or below current age to intentionally stop reminders. Ownership is immutable, and mutation functions reject changes to soft-deleted pets.

**Vaccinations:** trimmed `vaccine_type` is 1–120 characters; `due_date` is required and may be historical; optional `last_administered_date` is not in the future or later than `due_date`; optional `notes` is at most 2,000 characters. An active pet cannot have an exact duplicate of normalized vaccine type and due date. Historical due dates never cause overdue messages.

**Concurrency:** Mutable clinical records include `created_at`, `updated_at`, and optimistic concurrency checking against the version or timestamp originally read. A stale mutation is rejected and must be reviewed against current data. Changing a vaccination due date cancels any pending reminder for the old date, preserves submitted history, and permits a distinct lifecycle for the new date.

## Risks / Trade-offs

- **[SMS cost / GDPR]** Phone numbers and pet names in SMS logs → Mitigation: store only Twilio SID + status in-app; minimize PII in Twilio dashboard retention; document a DPA with Twilio; no marketing SMS.
- **[Failed delivery]** Carrier failures look like “we notified them” → Mitigation: persist `skipped`/`sent`; show last delivery status on the vet’s client/pet view.
- **[Timezone edge]** Fixed UTC scheduling shifts by one local hour during daylight-saving time → Mitigation: trigger at 08:00 UTC, compute every business date in Europe/Lisbon, store due dates as `date`, record one job run per Lisbon date, and alert on missing or failed runs.
- **[Auth vs clinic create]** Vet-created clients need a password or invite → Mitigation: generate a recovery/invite email via Supabase invite; vet still captures phone immediately for SMS.
- **[Client deletes pet]** Accidental loss of schedule → Mitigation: soft-delete; vet can restore in a later iteration if needed (restore is not in v1 spec).
- **[Single clinic]** Hard-coding one org → Mitigation: no `clinic_id` in v1; adding it later is a schema change.
- **[Data protection]** Soft-deleted clinic data, provider transfers, and operational logs may outlive their purpose → Mitigation: make privacy information, processor governance, approved retention schedules, rights handling, MFA, log minimization, incident readiness, and DPIA screening production-launch gates.

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
