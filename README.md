# PetVet EU

Portuguese-first veterinary client portal, vaccination registry, and SMS reminder service. The web app is Next.js App Router on Vercel; Supabase owns Auth, Postgres/RLS, Edge Functions, and daily scheduling; Twilio submits outbound reminders.

## Local setup

Requirements: Node 20+, pnpm 10 or 11, Docker, and the Supabase CLI.

1. Copy `.env.example` to `.env.local` and set the local Supabase URL and anon key. Keep the service-role key, cron credential, bootstrap password, and Twilio secrets out of Vercel and browser-visible variables.
2. Run `pnpm install`, `supabase start`, and `supabase db reset`.
3. Run `pnpm dev --hostname 127.0.0.1`. Portuguese is the default; use the language picker to store the `locale` cookie or authenticated profile preference for English.
4. Run `pnpm run check` and `pnpm build`. With `LOCAL_DB_URL` pointed at the disposable local database, run `psql "$LOCAL_DB_URL" -f docs/database-verification.sql`.

## Vet bootstrap

There is no UI or authenticated API for creating vets. Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOOTSTRAP_VET_EMAIL`, and a strong `BOOTSTRAP_VET_PASSWORD` only in an operator shell, then run `node scripts/bootstrap-vet.mjs`. The partial unique database index rejects a second vet. Remove the bootstrap values afterward, have the vet enroll and verify TOTP at `/mfa`, and follow the MFA activation and recovery procedure in [docs/security-operations.md](docs/security-operations.md).

## Edge Functions and Twilio

Set secrets with `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... REMINDER_CRON_SECRET=... REMINDER_ALERT_WEBHOOK_URL=... TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=... SMS_DRY_RUN=true`. Deploy `admin-clients` and `reminders` from `supabase/functions/`. Automated tests do not call Twilio. A dry run records an attempt without a SID and leaves its reminder pending; disabling dry-run can submit real SMS and incur provider charges.

The database migration schedules the reminder endpoint for `0 8 * * *` UTC. Configure `app.settings.reminder_url` and a protected cron credential in Supabase, then validate standard-time and daylight-saving dates. The function always derives the business date in `Europe/Lisbon`. Failed or missing runs must feed the production alert configured during readiness review; a vet can rerun only the current Lisbon date from the portal.

## Vercel deployment

Import this repository into Vercel, select the Next.js preset, and configure only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Set Supabase Auth site/redirect URLs to the Vercel production domain. Apply migrations and deploy Edge Functions separately through Supabase.

## Data protection and launch gate

The privacy page is deliberately marked as an unapproved draft. The outstanding work is tracked separately in [the GDPR production-readiness change](openspec/changes/gdpr-production-readiness/tasks.md). Complete that change and every item in [docs/production-readiness.md](docs/production-readiness.md) with the veterinary practice and qualified Portuguese legal advice before processing real data. This includes controller details, lawful bases, notice wording, DPAs/transfers, retention periods, DPIA/DPO decisions, MFA, incident response, restricted access, alerting, and restoration evidence. The retention function accepts dates only after the schedule is approved; never automate unapproved periods.

Clinic-assisted rights requests are recorded in `data_subject_requests`; use the documented workflow to verify identity, export/correct/restrict data, record a minimal outcome, cancel future reminders on erasure, and honor only a documented continuing retention basis.

The operational details are in the [rights runbook](docs/data-subject-rights-runbook.md), [security and incident runbook](docs/security-operations.md), and [decision record](docs/data-protection-decisions.md). The database exposes authenticated vet-only request functions and an operator-only `apply_approved_retention` function. Supply its four cutoffs only from the approved schedule; do not schedule it while the decision record contains `TBD` values. Backups and provider diagnostic logs are configured and disposed in their provider consoles, then evidenced in the production gate.

## Verification

- Database security checks: [docs/database-verification.sql](docs/database-verification.sql)
- End-to-end procedure: [docs/smoke-test.md](docs/smoke-test.md)
- Production gate: [docs/production-readiness.md](docs/production-readiness.md)
