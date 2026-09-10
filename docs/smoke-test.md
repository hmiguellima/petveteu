# End-to-end smoke test

1. Reset a disposable Supabase project and bootstrap the vet.
2. Register a client using a unique E.164 test phone; confirm the role is `client`.
3. Add two pets through `/client`; verify the client cannot change expiry age or directly write a vaccination row.
4. Sign in as the MFA-verified vet, add one vaccination per pet, with one due in two Lisbon calendar days.
5. Set `SMS_DRY_RUN=true`, invoke `reminders`, and verify exactly one `dry_run` attempt per eligible due entry, no provider SID, and `pending` reminder status.
6. Run again to exercise audit behavior; confirm no result is displayed as sent.
7. Disable client SMS, invoke the job for an otherwise eligible new due entry, and verify no Twilio request and a permanent opt-out skip.
8. Exercise a failed job then manual current-day rerun; verify only one active/successful job row is permitted.
