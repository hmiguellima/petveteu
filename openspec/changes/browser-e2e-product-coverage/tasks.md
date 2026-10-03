## 1. Harness

- [x] 1.1 Add Playwright configuration, fixture isolation, real MFA helper, and managed local services.
- [x] 1.2 Add local Twilio mock and guarded worker configuration.

## 2. Product suites

- [x] 2.1 Cover public/auth/privacy/i18n and authorization boundaries.
- [x] 2.2 Cover client/vet registry, pet/vaccine lifecycle, validation, and concurrency.
- [x] 2.3 Cover membership invitations, acceptance, revocation/reinstatement, dual roles, and notifications.
- [x] 2.4 Cover reminder success, provider failures, retries, all eligibility gates, dry run, and deduplication.

## 3. Verification and handoff

- [x] 3.1 Fix browser regressions exposed by the suite and run the full browser suite locally.
- [x] 3.2 Add CI, coverage matrix and run instructions; pass standard project checks.

## Verification

- `pnpm test:e2e:all`: 26 mock-delivery scenarios and 1 separately booted dry-run scenario passed in Chromium.
- `pnpm run check`: formatting, lint, type checking and 83 unit tests passed.
- `pnpm exec deno check` on all three Edge Function entrypoints passed.
- `pnpm build` and strict OpenSpec validation passed.
- Post-run fixture audit found zero profiles, pets, vaccines, reminders, attempts, batches, invitations, notifications or audit events in the reserved E2E database.
- CI is configured but has not been executed remotely; production deployment is outside this change execution.
