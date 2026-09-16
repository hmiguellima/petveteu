# Production security and incident operations

## Access and secrets

- Give production access only to named people with least-privilege roles and MFA. Review access at an approved interval and after role changes; retain platform audit evidence.
- Require a verified TOTP factor and AAL2 for the vet profile. Set `profiles.mfa_required = true` only after enrollment is verified, then exercise recovery before launch.
- Vercel receives only the public Supabase URL and anon key. Supabase Edge Function secrets hold the service-role key, Twilio credentials, cron credential, and dry-run setting. Never copy secrets into tickets, source control, logs, or browser variables.
- Rotate a secret immediately after suspected exposure and according to the approved schedule. Record only rotation evidence, never the value.

## Logging and monitoring

Application logs must use the allowlisted structured logger: timestamp, severity, event code, correlation ID, and non-identifying error code. Never log SMS text, authorization/cookie headers, session tokens, credentials, names, emails, phone numbers, pet names, or raw database rows. Configure provider log retention to the approved period.

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
