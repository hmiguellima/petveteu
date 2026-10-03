# Browser E2E

Playwright drives the actual local Next.js UI, real Supabase Auth (including TOTP), migrated PostgreSQL, Edge Functions and local invitation emails. SMS requests cross HTTP into a programmable Twilio mock. No hosted Supabase keys or real Twilio credentials are required.

## Run

Prerequisites: supported Node/pnpm versions from `package.json`, Docker running, and enough disk space for a second local Supabase stack.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e:all
```

On Linux/CI, install browser system libraries with `pnpm exec playwright install --with-deps chromium`.

```sh
pnpm test:e2e                 # HTTP mock delivery suites
pnpm test:e2e:dry             # separately booted SMS_DRY_RUN worker
pnpm test:e2e registry        # filter by spec filename
pnpm test:e2e --grep 'opt-outs'
pnpm exec playwright show-report playwright-report/sms
pnpm exec playwright show-report playwright-report/dry
pnpm exec playwright show-trace test-results/sms/<failed-test>/trace.zip
```

The runner owns app port 3100 and mock port 3101. The reserved Supabase project `petveteu-e2e` uses ports 55320–55329, separate from the normal development stack (54321 etc.). It generates config under ignored `.e2e/stack`, shares repository migrations/functions/templates, obtains local keys from Supabase status, and resets **only this disposable E2E database** before each invocation. Never put personal/manual development data into that project. The runner refuses an unexpected endpoint or profiles outside the synthetic `e2e-…@example.test` namespace before reset. Your normal local and linked cloud databases are not reset.

The app, mock and function-serving child processes stop when the command exits. The disposable Supabase containers remain running for reuse. To stop only these containers:

```sh
pnpm exec supabase stop --workdir .e2e/stack
```

Do not run two invocations simultaneously: they share ports and database. Tests run serially because batch locks are global per Lisbon day. Fixtures create unique accounts, clean up their rows, and exercise real password/TOTP and email acceptance. Service-role access is limited to prerequisite setup, explicit failure-state simulation and outcome inspection. `permitNextBatch()` marks completed synthetic batch runs failed so retry scenarios can exercise a later permitted run without waiting a calendar day; it does not claim to test the passage of real time or the production cron scheduler.

## Coverage matrix

| Feature             | Browser scenarios / supporting assertions                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public/auth/privacy | Portuguese home, English switching, privacy notice, registration, invalid/duplicate phone, bad password, valid sign-in, anonymous protected redirects                                                                                           |
| Authorization       | Foreign client pets hidden, client veterinary route denied, unauthenticated/client/AAL1 function requests denied, database RLS and privileged mutations denied                                                                                  |
| Veterinary MFA      | Real TOTP enrollment, invalid code, returning-session challenge, successful activation                                                                                                                                                          |
| Client profile      | Name, normalized phone, SMS consent, persisted profile language and subsequent sign-in                                                                                                                                                          |
| Pets                | Client and vet creation, dog/cat/other species, estimated birth date, breed, invalid future birth, stale edit rejection, veterinary expiry editing, client read-only expiry, removal hidden in both portals                                     |
| Vaccinations        | Veterinary creation/editing/notes, client read-only display, duplicate prevention, date ordering, stale edit rejection, removal hidden in both portals                                                                                          |
| Membership          | Invitation, resend, real email acceptance, MFA onboarding, client invitation/contact/email request, existing-client promotion, protected shared identity, revocation/session invalidation, re-invitation/cancellation, notifications/read state |
| Dual roles          | Privacy acknowledgement, activation, portal switching, empty-client deactivation, populated-client deactivation denied, preserved pets after vet revocation                                                                                     |
| Reminder operations | Visible manual batch result, successful HTTP payload/localized body, duplicate run and per-vaccine submission suppression                                                                                                                       |
| Provider failure    | Transient HTTP error, socket disconnect, later successful retry, permanent rejection retained                                                                                                                                                   |
| Eligibility         | Client/clinic opt-outs and recovery, missing phone and recovery, due-date window, expired age, removed pets/vaccines                                                                                                                            |
| Dry run             | Actual separately configured worker, pending status and dry-run attempt, zero provider requests                                                                                                                                                 |

## Boundaries and evidence

Additional lifecycle cases cover completed real MFA reinstatement, expired-invitation rejection, client invitation resend, and rescheduling that cancels a pending reminder while preserving attempts. Provider payloads are checked in both languages.

A `.e2e/run.lock` prevents concurrent invocations. After a hard crash, verify no runner is active before removing a stale lock.

Chromium desktop is the current browser matrix; this is not cross-browser/mobile certification. Cron timing, hosted Vercel/Supabase wiring, real carrier delivery/webhooks, unshipped GDPR operator workflows and approved legal policy are outside this suite. `submitted` means accepted by the mock/provider, not delivered to a handset. The legacy `verify:e2e` command remains an API smoke check; `pnpm run check` runs unit/static checks, not these browser suites.

Failures retain screenshots, video and traces. Reports for normal and dry mode are separate. Artifacts contain only synthetic identities but can include test session tokens; keep them private. CI uses a fresh Docker stack and uploads artifacts for seven days. The mock uses fake credentials, captures requests, queues responses and never forwards to Twilio. Its endpoint override is accepted by the worker only when Supabase and the target host are local; production defaults to Twilio's official API.
