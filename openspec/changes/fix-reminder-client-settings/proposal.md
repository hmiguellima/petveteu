## Why

The multi-role migration moved client phone and SMS consent into `client_settings`, but reminder processing and eligibility-recovery logic still read the legacy `profiles` fields. Production batches therefore permanently skip valid or newly corrected client reminders, while the manual-run UI hides the batch outcome.

## What Changes

- Read reminder phone and both SMS consent flags from the client's current `client_settings` record.
- Reopen eligible permanently skipped reminders when client settings change, including records already skipped by the regression.
- Surface protected manual-run success, duplicate-run, and failure outcomes in the veterinary UI.
- Add regression coverage for dual-role clients, corrected phone data, and manual-run feedback.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vaccination-sms-notifications`: Resolve reminder eligibility from client-role settings, recover skips when those settings become valid, and expose manual batch outcomes.

## Impact

The change affects the reminders Edge Function, database reminder-recovery triggers and migration state, veterinary server actions and localized feedback, generated Supabase types if required, and reminder/UI tests. No public API or dependency change is expected.
