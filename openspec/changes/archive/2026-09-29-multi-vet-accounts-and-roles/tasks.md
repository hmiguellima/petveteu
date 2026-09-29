## 1. Role schema and migration

- [x] 1.1 Add and backfill normalized account roles, client settings, vet access, vet invitations, and in-app notifications; remove the one-vet constraint and add current-role authorization helpers.
- [x] 1.2 Migrate RLS policies and security-definer RPCs from `profiles.role` to current role assignments with AAL2 vet enforcement, protected shared fields, and transactional final-vet safeguards.
- [x] 1.3 Regenerate application and Edge Function database types and add migration contract tests for existing clients, the existing vet, dual roles, and revoked assignments.

## 2. Authentication and vet membership lifecycle

- [x] 2.1 Update server auth context and routing for role sets, account-level vet MFA, vet-first sign-in, dual-role portal switching, and roleless disabled identities.
- [x] 2.2 Implement protected seven-day vet invitation, list, resend, cancel, invitation-time role grant, MFA-only setup gate, revocation, and reinstatement operations with immutable accepted vet email and append-only audits.
- [x] 2.3 Update first-vet bootstrap and add documented operator emergency recovery with session/factor invalidation and MFA-before-access guarantees.

## 3. Portals, notifications, and client self-activation

- [x] 3.1 Add the shared vet-management UI for active vets and pending invitations, including equal-authority controls, status feedback, and final-vet/self-revocation protection.
- [x] 3.2 Add persistent localized in-app notifications for vet activation, revocation, and reinstatement.
- [x] 3.3 Add idempotent client-role self-activation with approved-notice presentation evidence, incomplete client settings, vet/client portal switching, and controlled client-role deactivation.
- [x] 3.4 Update the client registry for dual-role clients, self labels, read-only protected identity fields, and ordinary management of client-specific settings, pets, and vaccinations.

## 4. Localization, validation, and verification

- [x] 4.1 Add Portuguese and English copy and validation for bilingual Supabase invitations, onboarding, membership management, in-app notifications, role switching, and client activation.
- [x] 4.2 Add focused unit and integration coverage for invitation expiry and identity matching, MFA activation gates, immutable email, role isolation, concurrent revocation safeguards, notification persistence, and migration/session behavior.
- [x] 4.3 Run formatting, lint, type checking, tests, production build, and OpenSpec validation; document observed behavior and any external email/MFA QA boundary.
