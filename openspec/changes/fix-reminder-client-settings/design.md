## Context

Client-specific phone and SMS consent moved from `profiles` to the one-to-one `client_settings` table during the multi-role migration. Portal reads and mutations use the new table, but the reminder Edge Function and the trigger that reopens permanent skips still use the legacy columns. The manual server action also ignores the Edge Function response, so operators cannot distinguish success, duplicate suppression, or failure.

## Goals / Non-Goals

**Goals:**

- Make `client_settings` the authoritative reminder-contact source.
- Reopen still-current permanent skips when phone or consent changes.
- Repair already skipped reminders whose current client settings are now eligible.
- Give the vet an explicit result after a protected manual invocation.
- Preserve idempotency, dry-run behavior, AAL2 authorization, and attempt history.

**Non-Goals:**

- Changing the two-day reminder window, Twilio integration, or scheduled job time.
- Automatically inventing a phone for incomplete self-activated client roles.
- Retrying reminders after their due date or duplicating an already submitted SMS.

## Decisions

1. Join `client_settings` through each pet owner and build candidates from that relation while continuing to take locale from the shared profile. This follows the multi-role ownership boundary and avoids synchronizing duplicate contact fields.
2. Replace the legacy profile eligibility trigger with a `client_settings` trigger. A migration will also reopen future/current `invalid_phone`, `client_opt_out`, and `vet_opt_out` skips whose present settings differ from the recorded reason; the worker remains the final eligibility gate.
3. Preserve reminder attempts as immutable history. Recovery changes only lifecycle status back to `pending`; a later batch records the next attempt.
4. Return the manual invocation outcome through query-parameter feedback. HTTP/function errors map to a generic failure, a duplicate successful run maps to an explicit no-op message, and a completed invocation maps to success.

## Risks / Trade-offs

- [Deploying the migration before the updated worker may reopen rows that the old worker skips again] → Deploy the Edge Function immediately after the database migration and keep the operation idempotent.
- [A recovered reminder could send a real SMS] → Keep the existing date, consent, phone, age, deletion, deduplication, and `SMS_DRY_RUN` gates; do not invoke a batch as part of migration.
- [PostgREST relationship shapes can be array-like] → Normalize the one-to-one relation and cover candidate construction with tests.

## Migration Plan

1. Deploy the database migration that moves the recovery trigger and reopens only still-current correctable skips.
2. Deploy the updated reminders Edge Function.
3. Deploy the web application feedback change.
4. Run the protected batch only after confirming `SMS_DRY_RUN` and intended operational impact.

Rollback restores the previous trigger/function version without deleting attempt history. Reopened rows may remain pending but cannot bypass worker eligibility checks.

## Open Questions

None.
