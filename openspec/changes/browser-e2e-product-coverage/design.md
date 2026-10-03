## Context

The product exposes public registration/login/privacy, real TOTP vet onboarding, client and veterinary registry forms, vaccination scheduling, membership invitations/revocation, notifications, dual-role switching, and operational SMS processing. Existing smoke tests bypass browser behavior and MFA.

## Goals / Non-Goals

Goals: cover every shipped browser feature, validate database side effects and provider requests, and make failures diagnosable locally and in CI.

Non-goals: claiming browser coverage for unshipped GDPR operator workflows or making real Twilio requests.

## Decisions

- Use Playwright with isolated browser contexts and real password/TOTP flows. Service-role APIs create prerequisite fixtures and inspect outcomes, never bypass the user action under test.
- Run serially because reminder batches lock globally by Lisbon date. Give each test unique accounts and track cleanup explicitly. Reserve a separate `petveteu-e2e` local project on ports 55320–55329, guard its endpoint and synthetic identities, and reset only that disposable project per invocation.
- Start managed Next.js, Edge Function, and Twilio mock processes from a runner. Obtain keys from local Supabase status rather than committing credentials. Require loopback URLs and refuse hosted targets.
- Allow the worker to use an alternate Twilio base URL only for local Supabase, with an allowlist of local mock hostnames. Default delivery remains the official Twilio endpoint.
- Use the mock's queue to test submission, transient/permanent failures, retry, duplicate suppression, opt-out, age/date/deletion gates and dry runs. Retain traces and screenshots on failure.

## Risks / Trade-offs

- Global job locks and pre-existing data → serial tests and a guarded, separately named disposable stack; no reset of the user's normal development database.
- Email acceptance requires local mail delivery → use Mailpit and restrict followed links to the local Auth service.
- Browser artifacts contain fixture credentials → ignore artifacts and use synthetic local identities.

## Migration Plan

Install Playwright browsers, start local Supabase, apply local migrations, then run the managed command. CI creates a fresh local stack. Production deployment is not part of E2E execution.
