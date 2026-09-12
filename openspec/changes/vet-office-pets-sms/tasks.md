## Execution plan

Dependencies use task IDs in `Depends on`. Tasks whose dependencies are satisfied may run concurrently. Four implementation streams own distinct surfaces after the database contract is stable:

- **DB:** schema, Auth triggers, RLS, grants, mutation functions, and bootstrap.
- **Web:** authentication, portals, registry, schedules, settings, and status views.
- **Jobs:** reminder eligibility, Twilio, localized SMS rendering, scheduling, and monitoring.
- **Readiness:** catalogs, privacy, retention, security operations, documentation, and launch gates.

Recommended phases:

1. **Foundation:** 1.1, followed by 1.2 and 1.3 concurrently.
2. **Database contract:** 2.1–2.7. Schema areas may be authored concurrently, but 2.4–2.7 integrate against the complete schema.
3. **Parallel expansion:** Auth tasks 3.1–3.3, the pure reminder engine in 6.1, the catalog foundation in 7.1, and governance decisions in 8.1.
4. **Product surfaces:** Registry tasks 4.1–4.4, schedule task 5.1, Twilio task 6.2, and privacy tasks whose dependencies are ready.
5. **Integration:** 5.2–5.3, 6.3, 7.2, and scheduling/monitoring tasks 6.4–6.6.
6. **Production readiness:** Complete section 8, documentation, and the final smoke test.

Critical functional path:

`1.1 → 1.3 → 2.1/2.2/2.3 → 2.4/2.5/2.6 → 3.1/3.2/3.3 → 4.x → 5.1 → 6.1 → 6.2/6.3 → 7.2 → 9.2`

Cross-stream rule: DB owns persistent shapes and authorization contracts. Web and Jobs consume those contracts and MUST NOT redefine table shapes, function signatures, or reminder status values independently. Shared contract changes require coordination before dependent work continues.

## 1. Project scaffold

- [x] 1.1 **[Foundation]** Initialize a Next.js App Router TypeScript app in the repo root with Tailwind, configured for Vercel; verify `pnpm build` succeeds on an empty layout. **Depends on:** none.
- [x] 1.2 **[Foundation]** Add `@supabase/supabase-js`, `@supabase/ssr`, and `next-intl` with default locale `pt-PT` and alternate `en`; verify the app boots with a Portuguese homepage string. **Depends on:** 1.1. **Concurrent with:** 1.3.
- [x] 1.3 **[Foundation]** Add the `supabase/` migration/function structure and environment example (`NEXT_PUBLIC_SUPABASE_URL`, anon key, `SMS_DRY_RUN`); verify all required keys are listed without secrets. **Depends on:** 1.1. **Concurrent with:** 1.2.

## 2. Database and authorization contract

- [ ] 2.1 **[DB]** Create identity and registry schema for `profiles` and `pets`: normalized unique email mirror, E.164-or-null phone, bounded fields, incomplete-record state, estimated birth dates, species details, expiry defaults and bounds, timestamps/concurrency versions, and `deleted_at`; verify constraints on a fresh database. **Depends on:** 1.3. **Concurrent with:** 2.2, 2.3 after shared enum/naming agreement.
- [ ] 2.2 **[DB]** Create clinical and reminder schema for `vaccination_entries`, `reminders`, and `reminder_attempts`: date and text constraints, exact-active-duplicate prevention, concurrency versions, reminder lifecycle constraints, and uniqueness per vaccination entry and due date; verify constraints on a fresh database. **Depends on:** 1.3. **Concurrent with:** 2.1, 2.3 after shared key/status agreement.
- [ ] 2.3 **[DB]** Create operational schema for `reminder_job_runs` and `admin_audit_events`, including one active or successful run per Lisbon business date and bounded, non-secret audit details; verify constraints on a fresh database. **Depends on:** 1.3. **Concurrent with:** 2.1, 2.2 after shared naming agreement.
- [ ] 2.4 **[DB]** Add Auth triggers to create profiles and synchronize canonical email changes; add the unique partial vet index and protected bootstrap script; verify mirror synchronization, public-client assignment, first-vet creation, and rejection of a second vet. **Depends on:** 2.1.
- [ ] 2.5 **[DB]** Add read RLS for profiles, pets, schedules, reminder information, job runs, and audit data; revoke direct browser-role DML on protected tables; verify the complete role/row read matrix and direct-write denial. **Depends on:** 2.1, 2.2, 2.3. **Concurrent with:** 2.4 and initial 2.6 implementation.
- [ ] 2.6 **[DB]** Implement hardened role-specific profile, pet, vaccination, and SMS-setting mutation functions with fixed search paths, schema-qualified objects, immutable protected fields, ownership/role checks, soft-delete handling, and optimistic concurrency; verify function signatures omit prohibited fields and malicious payloads cannot change protected data. **Depends on:** 2.1, 2.2, 2.5.
- [ ] 2.7 **[DB]** Add integrated database security verification covering Auth triggers, RLS, grants, mutation functions, cross-owner access, role escalation, stale writes, reminder uniqueness, and direct-table attacks. **Depends on:** 2.4, 2.5, 2.6.

## 3. Authentication and portal boundaries

- [ ] 3.1 **[Web]** Implement registration and sign-in with name, normalized email, E.164 phone, password, and default `pt-PT` locale; verify duplicate email/phone rejection and successful client routing. **Depends on:** 1.2, 2.4, 2.6.
- [ ] 3.2 **[Web]** Gate `/client` and `/vet` by session and current database role; verify unauthenticated redirects, client denial from `/vet`, and vet denial from `/client`. **Depends on:** 1.2, 2.5. **Concurrent with:** 3.1, 3.3.
- [ ] 3.3 **[DB/Jobs]** Implement narrowly scoped authenticated Edge Functions for client invite, canonical email change, and invitation resend; verify each re-reads the caller's current vet role, only targets clients, rejects supplied roles, writes a non-secret audit event, and exposes neither service credentials nor a generic Auth Admin proxy. **Depends on:** 1.3, 2.3, 2.4, 2.5. **Concurrent with:** 3.1, 3.2.
- [ ] 3.4 **[Integration]** Confirm there is no UI or authenticated API capable of creating another vet; verify public registration and privileged client-management operations can only yield clients. **Depends on:** 3.1, 3.3, 2.4.

## 4. Client and pet registry

- [ ] 4.1 **[Web]** Implement client profile/contact, locale, and client SMS-setting views and mutations with normalization, validation, incomplete-record behavior, and optimistic concurrency feedback. **Depends on:** 3.1, 3.2, 2.6. **Concurrent with:** 4.2, 4.3, 4.4.
- [ ] 4.2 **[Web]** Implement client list/add/update/remove for owned pets with estimated DOB and optional other-species support; verify immutable ownership, deleted-pet rejection, expiry read-only behavior, stale-update feedback, and cross-client denial. **Depends on:** 3.1, 3.2, 2.6. **Concurrent with:** 4.1, 4.3, 4.4.
- [ ] 4.3 **[Web]** Implement vet list/create/update of clients through protected administrative functions and invite flows; verify mirrored email display and synchronization, later sign-in, safe conflicts, and rejection of unauthorized administrative calls. **Depends on:** 3.2, 3.3. **Concurrent with:** 4.1, 4.2, 4.4.
- [ ] 4.4 **[Web]** Implement vet add/update/remove of pets for any client, including estimated DOB, species detail, and expiry age 1–50; verify defaults, intentional expiry at or below current age, soft deletion, and stale-update rejection. **Depends on:** 3.2, 2.6. **Concurrent with:** 4.1, 4.2, 4.3.

## 5. Vaccination schedules

- [ ] 5.1 **[Web/DB]** Implement vet CRUD for validated vaccination entries with bounded plain text, historical due dates, administered-date ordering, exact-active-duplicate prevention, and optimistic concurrency; verify stale edits fail and a due-date change cancels an old pending reminder while preserving submitted history. **Depends on:** 2.6, 3.2; use seeded pets until 4.4 completes.
- [ ] 5.2 **[Web]** Implement the client read-only schedule for owned pets without edit controls; verify UI and database rejection of client writes and cross-owner reads. **Depends on:** 4.2, 5.1. **Concurrent with:** 5.3 and section 6 integration.
- [ ] 5.3 **[Web]** Show reminder lifecycle and latest attempt in the vet pet/schedule view; verify dry-run, submitted, exhausted, failed, and permanently skipped outcomes render without presenting dry runs as sent. **Depends on:** 5.1, 6.1; final verification depends on 6.2. **Concurrent with:** 5.2, 6.3, 7.2.

## 6. SMS reminders

- [x] 6.1 **[Jobs]** Implement the testable reminder eligibility and lifecycle engine using Europe/Lisbon, due dates in 0–2 days, both SMS flags, pet age/expiry, deletion, successful-submission deduplication, due-date changes, concurrency, transient retries through the due date, permanent skips, and exhaustion afterward. **Depends on:** 2.2, 2.3; may use fixtures before portal completion. **Concurrent with:** 3.x and 7.1.
- [ ] 6.2 **[Jobs]** Integrate Twilio submission and `SMS_DRY_RUN`; persist every attempt; verify dry-run has no SID and leaves the reminder pending, successful submission stores its SID, transient failure remains retryable, invalid phone is permanently skipped, and automated tests never call Twilio. **Depends on:** 6.1. **Coordinate with:** 7.2.
- [ ] 6.3 **[Web/Jobs]** Complete client and vet SMS toggles, both default-on, and connect them to eligibility processing; verify either disabled flag prevents submission. **Depends on:** 4.1, 4.3, 6.1. **Concurrent with:** 5.2, 5.3, 7.2.
- [ ] 6.4 **[Jobs]** Configure daily 08:00 UTC scheduling, Lisbon business-date calculation, job-run persistence, and locking against overlapping or duplicate successful batches. **Depends on:** 6.1, 6.2, 2.3.
- [ ] 6.5 **[Jobs/Readiness]** Add missing/failed-run alerting and a protected current-Lisbon-date manual rerun; verify failed runs are visible and authorized reruns cannot overlap successful processing. **Depends on:** 6.4, 3.2.
- [ ] 6.6 **[Jobs]** Verify scheduled and manual processing across Lisbon standard time, daylight-saving time, date boundaries, concurrent invocations, and missed/failed run recovery. **Depends on:** 6.4, 6.5.

## 7. Internationalization and copy

- [ ] 7.1 **[Readiness/Web]** Establish complete `pt-PT` and `en` catalog structure and progressively cover registration, portals, validation, privacy, and SMS copy with Portuguese fallback; verify locale switching and missing-English-key fallback. **Depends on:** 1.2; starts in phase 3 and completes after all user-visible surfaces.
- [ ] 7.2 **[Jobs/Readiness]** Render reminder SMS from the shared catalogs using the client's saved locale; verify Portuguese and English messages include pet name, vaccine type, and localized due date. **Depends on:** 6.1 and the SMS namespace from 7.1. **Concurrent with:** 5.2, 5.3, 6.3.

## 8. Data protection and production readiness

- [ ] 8.1 **[Readiness—early]** Obtain and record approved controller identity/contact, processing purposes and lawful bases, provider/subprocessor inventory, data locations/transfers and safeguards, privacy wording, concrete retention/review periods, DPIA screening outcome, and DPO determination; track processor agreements and any full DPIA as launch prerequisites. **Depends on:** none; begin during foundation. **Provides inputs to:** 8.2, 8.4, 8.6, 8.7.
- [ ] 8.2 **[Readiness/Web]** Add approved Portuguese and English privacy-notice surfaces to registration and both portals, plus delivery through the vet-created-client communication flow. **Depends on:** 1.2, 3.1, 3.3, approved notice from 8.1, applicable catalog structure from 7.1.
- [ ] 8.3 **[Readiness/Web/DB]** Implement and document the authenticated clinic-assisted workflow for access/export, correction, objection, restriction, and erasure; verify identity, decisions and continuing retention bases are audited and erasure always cancels future reminders. **Depends on:** 2.3, 2.6, 3.2; policy inputs from 8.1.
- [ ] 8.4 **[Readiness/DB]** Implement approved retention/disposal jobs for application data and database audit records; document aligned backup and diagnostic-log retention; verify soft-deleted data leaves normal processing immediately and is later erased or irreversibly anonymized absent a hold. **Depends on:** 2.1, 2.2, 2.3 and approved schedule from 8.1.
- [ ] 8.5 **[Readiness/Web]** Require vet MFA and implement structured, redacted application logging; verify ordinary logs exclude SMS bodies, credentials, session tokens, and unnecessary client or pet identifiers. **Depends on:** 3.1; logging can progress concurrently with product surfaces.
- [ ] 8.6 **[Readiness]** Document and verify restricted production access, secret placement, backup protection and restoration testing, incident detection/response, processor escalation, and applicable breach-notification workflows. **Depends on:** deployment configuration and provider decisions from 8.1; may proceed concurrently with 8.2–8.5.
- [ ] 8.7 **[Readiness—gate]** Complete the final production privacy/security gate; verify all required decisions, agreements, transfer safeguards, retention schedules, DPIA work, MFA, rights/incident workflows, and restoration evidence exist, otherwise block launch. **Depends on:** 8.1–8.6.

## 9. Documentation and end-to-end smoke

- [ ] 9.1 **[Readiness]** Maintain README instructions for local setup, Vercel deployment, vet bootstrap, Twilio, cron, data protection, and production gates as each capability lands; verify a new developer can follow the final document without undocumented steps. **Depends on:** starts after 1.3 and completes after 6.6 and 8.7.
- [ ] 9.2 **[Integration]** End-to-end smoke: register a client with two pets, have the vet set two vaccine due dates with one in two days, run the job once, and verify one SMS or dry-run attempt per due entry and none after client opt-out. **Depends on:** 3.4, 4.2, 4.3, 4.4, 5.1, 5.2, 6.2, 6.3, 6.4, 7.2; production launch additionally depends on 8.7 and completed 9.1.
