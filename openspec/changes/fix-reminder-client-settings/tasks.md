## 1. Reminder eligibility source

- [x] 1.1 Update the reminder Edge Function to resolve phone and SMS consent from `client_settings` while retaining profile locale.
- [x] 1.2 Add regression tests covering client-settings candidate data, including a dual-role client with a missing or corrected phone.

## 2. Permanent-skip recovery

- [x] 2.1 Add a database migration that moves eligibility-change reopening to `client_settings` and repairs correctable current/future skips.
- [x] 2.2 Add database/source regression assertions for trigger placement and bounded recovery behavior.

## 3. Manual batch feedback

- [x] 3.1 Handle completed, duplicate-suppressed, and failed Edge Function results in the manual server action.
- [x] 3.2 Add localized veterinary feedback and tests for each manual-run outcome.

## 4. Verification

- [x] 4.1 Run focused reminder, migration, action, and i18n tests.
- [x] 4.2 Run `pnpm run check` and confirm the OpenSpec change is fully complete.
