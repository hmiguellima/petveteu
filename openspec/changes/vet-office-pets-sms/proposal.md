## Why

A veterinary office currently has no shared system of record for clients, their pets, and vaccination due dates. Staff cannot reliably notify owners before a vaccine is due, so visits are missed and pets go unprotected. This change introduces a bilingual web app that stores that data and sends SMS reminders a few days before each due date.

## What Changes

- Add a **client portal**: self-registration, add/remove own pets, view (not edit) each pet’s vaccination schedule, and control SMS reminder opt-out.
- Add a **vet portal** for a **single vet user**: create and manage clients, manage each client’s pets, and fully manage vaccination schedules. Additional vet accounts are out of scope for now.
- Add **automated SMS reminders** via Twilio when a vaccine due date is approaching (default: a couple of days before). Reminders are on by default and can be disabled by the client or by the vet.
- Stop sending reminders after a **per-pet notification expiry age** (sane defaults by species; configurable per pet).
- Ship **Portuguese as the primary UI and SMS language**, with English as the secondary language.
- Greenfield application: **Next.js frontend hosted on Vercel**, **Supabase** (auth, database, row-level security, scheduled jobs). No existing product behavior is replaced.

## Capabilities

### New Capabilities

- `auth-and-roles`: Next.js (Vercel) client and vet portals, client self-registration, a single bootstrapped vet account, session auth, and role-based access.
- `client-pet-registry`: Clients (owners) with one-to-many pets; client add/remove of own pets; vet create/manage of clients and their pets.
- `vaccination-schedules`: Per-pet vaccination calendar; vet full management; client read-only view.
- `vaccination-sms-notifications`: Twilio SMS reminders before due dates; default-on with client and vet disable; per-pet age-based expiry with defaults.
- `i18n`: Portuguese-primary, English-secondary UI and SMS copy.

### Modified Capabilities

- None (greenfield; no existing specs).

## Impact

- New **Next.js** application deployed on **Vercel**, a Supabase project (Postgres, Auth, RLS, Edge Functions / scheduled jobs), and a Twilio account for outbound SMS.
- Personal data: owner contact (phone, name), pet records, vaccination history — subject to GDPR-style handling (EU-oriented product).
- No existing APIs or codebases to migrate.
