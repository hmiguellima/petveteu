## 1. Project scaffold

- [ ] 1.1 Initialize a Next.js App Router TypeScript app in the repo root with Tailwind, configured for Vercel; verify `npm run build` succeeds on an empty layout
- [ ] 1.2 Add `@supabase/supabase-js`, `@supabase/ssr`, and `next-intl` (default locale `pt-PT`, alternate `en`), verify the app boots with a Portuguese homepage string from the catalog
- [ ] 1.3 Add `supabase/` SQL migration folder and env example (`NEXT_PUBLIC_SUPABASE_URL`, anon key, `SMS_DRY_RUN`), verify `.env.example` lists all required keys without secrets

## 2. Database and RLS

- [ ] 2.1 Create `profiles`, `pets`, `vaccination_entries`, and `reminder_deliveries` tables with unique email/phone, species enum, default expiry years trigger (dog 12 / cat 15 / other 10), and `deleted_at` on pets; verify migrations apply on a fresh Supabase DB
- [ ] 2.2 Add Auth insert trigger to create `profiles` and RLS policies per design.md; verify a client JWT can only select own rows and cannot update `role`, `sms_enabled_by_vet`, or `notification_expiry_years`
- [ ] 2.3 Add a unique partial index allowing at most one `role = vet` row and a bootstrap script that creates that vet when none exist; verify a second bootstrap or insert fails

## 3. Auth and portals

- [ ] 3.1 Implement registration (name, email, phone E.164, password, locale default `pt-PT`) and sign-in; verify duplicate email/phone is rejected and a new user lands in `/client`
- [ ] 3.2 Gate `/client` and `/vet` by session and role; verify unauthenticated requests redirect to sign-in, clients cannot load `/vet`, and the vet cannot load `/client`
- [ ] 3.3 Confirm there is no UI or authenticated API to create another vet; verify public registration always yields `client`

## 4. Client and pet registry

- [ ] 4.1 Client portal: list/add/remove own pets (name, species, DOB, optional breed); verify a second client cannot see or mutate the first client's pets
- [ ] 4.2 Vet portal: list/create/update clients (contact + locale) via Supabase invite; verify the new client appears in the vet list and can later sign in
- [ ] 4.3 Vet portal: add/update/remove (soft-delete) pets for any client including `notification_expiry_years`; verify defaults apply when expiry is omitted and client UI shows expiry read-only

## 5. Vaccination schedules

- [ ] 5.1 Vet CRUD for vaccination entries (free-text vaccine type, due date, optional last administered + notes); verify changing due date persists
- [ ] 5.2 Client read-only schedule per owned pet with no edit controls; verify API/UI rejects client writes to vaccination entries
- [ ] 5.3 Show last reminder delivery status on the vet pet/schedule view; verify `sent` and `skipped` rows render

## 6. SMS reminders

- [ ] 6.1 Implement the daily Edge Function query (Europe/Lisbon, due in 0–2 days, both SMS flags on, age < expiry, valid E.164, no delivery for current due date); verify unit tests cover skip vs send cases including due-date change
- [ ] 6.2 Integrate Twilio send with `SMS_DRY_RUN`; persist `reminder_deliveries`; verify dry-run writes `sent` without calling Twilio and invalid phone writes `skipped`
- [ ] 6.3 Client toggle `sms_enabled_by_client` and vet toggle `sms_enabled_by_vet` (both default on); verify the job skips when either flag is false
- [ ] 6.4 Schedule the function daily ~08:00 Europe/Lisbon; verify the cron config is present in the project

## 7. i18n and copy

- [ ] 7.1 Complete `pt-PT` and `en` catalogs for registration, both portals, and SMS templates with Portuguese fallback; verify switching locale re-renders UI and a missing English key shows Portuguese
- [ ] 7.2 Render reminder SMS in the client's saved locale; verify a `pt-PT` client gets Portuguese and an `en` client gets English, including pet name, vaccine type, and due date

## 8. README and smoke

- [ ] 8.1 Document local setup, Vercel deploy, bootstrap vet, Twilio, and cron in README; verify a new developer can follow it without undocumented steps
- [ ] 8.2 End-to-end smoke: register client with two pets, vet sets two vaccine due dates (one in two days), run the job once; verify one SMS (or dry-run row) per due entry and none after client opt-out
