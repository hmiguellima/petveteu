# Production security and incident operations

## Access and secrets

- Give production access only to named people with least-privilege roles and MFA. Review access at an approved interval and after role changes; retain platform audit evidence.
- Require a verified TOTP factor and AAL2 for every identity holding the vet role. `vet_access` remains `pending_mfa` until enrollment is verified, then exercise recovery before launch.
- Vercel receives only the public Supabase URL and anon key. Supabase Edge Function secrets hold the service-role key, Twilio credentials, cron credential, and dry-run setting. Never copy secrets into tickets, source control, logs, or browser variables.
- Rotate a secret immediately after suspected exposure and according to the approved schedule. Record only rotation evidence, never the value.

## Logging and monitoring

Application logs must use the allowlisted structured logger: timestamp, severity, event code, correlation ID, and non-identifying error code. Never log SMS text, authorization/cookie headers, session tokens, credentials, names, emails, phone numbers, pet names, or raw database rows. Configure provider log retention to the approved period.

Before enabling the production MFA policy:

1. Deploy the MFA page, Edge Function checks, and database migration.
2. Ask the vet to sign in, open `/mfa`, scan the TOTP QR code, and verify a current six-digit code.
3. Confirm the vet can reach `/vet` with an AAL2 session and record non-sensitive dated evidence.
4. Confirm MFA verification changed that vet's `vet_access.status` from `pending_mfa` to `active`.
5. Confirm a fresh AAL1 session is denied by the portal, vet Edge Functions, and vet database policies, then confirm AAL2 succeeds.

For recovery, an authorized operator verifies the vet identity through the approved channel and runs `node scripts/recover-vet.mjs` with `RECOVERY_VET_EMAIL` and service credentials. The script removes unusable factors and restores access only in `pending_mfa`; the vet must verify a replacement at `/mfa`. Record the operator, date, and outcome without recording the TOTP secret, recovery conversation, or session data.

Alerts must cover failed reminder runs, absence of a successful run for the expected Lisbon business date, authentication anomalies, and provider/security notifications. Every alert has a named on-call owner and an exercised escalation route.

## Backups and restoration

Confirm database and Auth coverage, encryption, access, region, retention, deletion, and provider responsibility from the contracted Supabase plan. At the approved cadence, restore into an isolated restricted environment, validate row counts and critical relationships, record date/result/owner, and securely destroy the test restore. A provider's backup claim is not restoration evidence.

## Incident response

1. Triage and contain: preserve relevant minimal evidence, revoke sessions/credentials as necessary, and prevent further disclosure.
2. Establish facts: affected systems, data categories, people, geography, timing, recipients, and current risk. Keep sensitive investigation material in the restricted incident system.
3. Escalate promptly to the controller's incident lead, privacy contact/DPO if applicable, counsel, and affected processors under their contractual channels and deadlines.
4. Assess notification obligations and deadlines under approved legal guidance, including CNPD and affected-person notification where applicable. Do not encode a universal notification outcome in software.
5. Recover from known-good state, verify controls, monitor recurrence, document decisions, and track corrective actions to closure.

Run a tabletop and a restoration test before launch. Link dated evidence from the production gate.

## Multi-vet rollout verification

Automated verification on 2026-09-29 completed formatting, lint, TypeScript checking, 72 tests, the optimized production build, and strict OpenSpec validation. Contract coverage includes invitation expiry and identity matching, AAL2 activation gates, immutable vet email, normalized role isolation, serialized final-vet revocation, target-session invalidation, persistent notifications, and reinstatement.

Before production rollout, verify the following external behavior with the hosted Supabase project and configured mail provider:

1. An unknown invitee receives the bilingual invitation, selects a name and language, enrolls TOTP, and reaches `/vet` only after AAL2 verification.
2. An existing client receives the invitation in the saved language, retains client data, and cannot reach either portal at AAL1 after the vet role is assigned.
3. Resending invalidates the earlier link; expiry removes the pending vet assignment; cancelling preserves any client role.
4. Revoking a vet invalidates that identity's sessions, leaves a dual-role client identity enabled, disables a vet-only identity, and creates persistent notifications.
5. A newly deployed role-model migration signs existing application identities out before the normalized authorization model is enabled.

Email delivery, link invalidation at the Auth provider, browser TOTP enrollment, and provider-side session revocation require hosted end-to-end evidence; passing local services and automated tests is not that evidence.
