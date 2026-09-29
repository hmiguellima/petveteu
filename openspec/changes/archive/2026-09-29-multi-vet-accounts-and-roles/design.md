## Context

The current system stores one `user_role` on each profile, permits only one vet through a partial unique index, routes a session to one portal, and uses `is_vet()` as a global authorization predicate. Client preferences, vet MFA state, shared identity, and privacy lifecycle fields are all stored together. The deployment is intentionally for one veterinary practice, and all vet accounts are equal system owners rather than employees.

The change must preserve database-enforced authorization, AAL2 enforcement for privileged work, operator-only service credentials, existing optimistic concurrency, and Portuguese-first localization. It also intersects with—but does not replace—the separate GDPR production-readiness change.

## Goals / Non-Goals

**Goals:**

- Represent zero, one, or both `client` and `vet` roles for one authenticated identity.
- Support multiple equal-authority vets without adding multi-tenancy or administrator tiers.
- Provide secure invitation, MFA-gated activation, revocation, reinstatement, notification, and emergency recovery lifecycles.
- Keep dual-role identities singular while separating shared identity, client settings, and vet access state.
- Migrate existing data without loss and eliminate authorization based on the legacy role column.

**Non-Goals:**

- Multiple veterinary practices, tenant isolation, client assignment to particular vets, or differentiated staff permissions.
- Public vet registration, mutable accepted vet emails, or shared/generic vet accounts.
- Replacing the GDPR readiness change or deciding unresolved lawful bases and retention periods.
- Making role membership history a second authorization source; audit events preserve history while role rows represent current authority only.

## Decisions

### 1. Normalize current roles and role-specific state

`profiles` remains the shared identity record. `account_roles(profile_id, role)` contains only current assignments with a composite primary key. `client_settings` contains reminder contact, SMS preferences, completeness, restriction, legal-hold, and lifecycle data. `vet_access` contains onboarding/access state and timestamps. Pets continue to reference the shared profile ID, but ownership operations require an active client role.

This is preferred to a role array or boolean columns because relational rows are directly constrainable and queryable in RLS and permit atomic role removal. Revocation deletes the role row; append-only audit events remain the historical source.

### 2. Use database predicates and RPCs as the authorization boundary

Replace role-column checks with hardened `has_role(role)` and AAL2-aware vet predicates. RLS and every security-definer RPC derive the caller from `auth.uid()` and never trust a requested role or active portal. Role-grant and role-revoke functions enforce self-revocation and final-vet invariants transactionally.

The portal switch changes presentation only. It never grants authority.

### 3. Grant the invited role immediately and gate it behind MFA

`vet_invitations` stores normalized email, inviter, status, expiry, and a hash or provider-safe reference rather than a reusable secret. Only one pending invitation per normalized email is allowed. Invitations expire after seven days; resend invalidates the previous link and refreshes expiry. All active vets can list, cancel, and resend invitations.

Sending an invitation atomically creates or resolves the exact normalized-email identity, inserts the vet role, marks the email immutable, and records vet access as pending MFA. Existing clients reuse their identity and become account-level MFA gated immediately; new users complete the Supabase invitation before they can establish a session. Every application surface except invitation completion and MFA enrollment/challenge is denied until a verified TOTP factor produces AAL2. This deliberately reuses Supabase Auth invitation and MFA flows rather than adding a second activation ceremony.

The database and privileged functions still require active vet access and AAL2 for all clinic authority, so a newly assigned or accepted AAL1 identity possesses the role but cannot exercise it. Cancelling an unaccepted invitation removes its role assignment. Alternative considered: wait to insert the role until acceptance or MFA verification. Rejected because the chosen policy intentionally makes vet designation effective at send time and relies on the MFA authorization gate for safety.

### 4. Enforce MFA at account level for vet-capable identities

From invitation issuance, all portal access for an existing identity requires AAL2, including the personal client portal. A newly invited or accepted vet at AAL1 is redirected only to invitation completion or MFA setup. Vet-capable sign-in routes to `/vet`; a persistent switch opens `/client` for dual-role users. Database vet operations independently require both an active vet assignment and AAL2.

### 5. Protect identity fields and separate client settings

Once vet activation succeeds, the canonical email is immutable. Only the account holder may update their shared name and preferred language. Other vets see those fields read-only in the client registry but may manage client-specific phone, clinic SMS permission, pets, and vaccinations. A vet self-activates the client role idempotently, may begin incomplete without a phone, and receives default client settings.

Client-role deactivation deletes the current role assignment immediately only when no client-domain records exist. Otherwise it uses the approved client closure/rights process. It never removes vet access, authentication identity, MFA state, or retained audits.

### 6. Equal vets manage membership with transactional safeguards

Any active AAL2 vet may invite a vet, manage pending invitations, and revoke or reinstate another vet. A vet cannot revoke themselves, and the final active vet cannot be revoked. Revocation invalidates privileged sessions, deletes the vet assignment, and disables a vet-only Auth identity while retaining it for audit attribution and reinvitation. Dual-role identities remain active clients.

The first vet remains operator-bootstrapped only when no active or pending vet exists. Operator-only emergency recovery may reset factors or bootstrap a replacement after documented authorization when no active vet can recover access.

### 7. Audit and notify privileged membership changes

Invitation lifecycle events and membership changes create bounded, non-secret administrative audit events. Successful activation, revocation, and reinstatement create per-recipient persistent in-app notifications for every active vet and the affected identity as applicable. Supabase Auth email remains limited to invitation delivery.

### 8. Localize onboarding and record transparency

An unknown new invitee receives one concise Portuguese-and-English invitation and chooses a language during onboarding. Existing users receive messages in their saved language. A vet self-activating a client role must be shown the current approved privacy notice; the system records version and presentation time without treating presentation as consent.

## Risks / Trade-offs

- **[Equal vets can invite or revoke peers]** A compromised vet has owner-level impact. → Require account-level MFA, prohibit self/final-vet revocation, invalidate sessions, notify all owners, and preserve audits.
- **[Role migration can open authorization gaps]** Mixed old/new checks could disagree during rollout. → Perform schema/data migration transactionally, deploy new checks together, remove the legacy index/column only after backfill assertions, and force reauthentication.
- **[Deleting role rows loses membership context]** Current-state storage cannot explain past access. → Preserve append-only grant/revoke/reinstate audit events under the approved retention schedule.
- **[Dual-role shared fields create edit conflicts]** Client management could alter a colleague's professional identity. → Protect shared fields for vet-capable targets and keep client settings separate.
- **[Existing Supabase sessions outlive deployment]** Tokens may carry stale assurance/session state. → Revoke sessions during migration and require a fresh sign-in and AAL2 evaluation.

## Migration Plan

1. Add normalized role, client settings, vet access, invitation, and notification structures plus new authorization helpers without exposing new UI.
2. Backfill one current role for every profile, move client and vet-specific fields, and assert every pet owner has an active client role and exactly one existing vet is active.
3. Deploy role-aware RLS, RPCs, Edge Functions, routing, MFA gates, invitation/onboarding, portal switching, and notification UI.
4. Remove the one-vet index and retire all reads/writes of `profiles.role`; remove migrated columns only after compatibility checks pass.
5. Revoke existing sessions so all users authenticate against the new model; require the existing vet to complete AAL2 before any portal access.
6. Verify migration, role isolation, concurrent final-vet protection, invitation expiry, dual-role flows, notification behavior, and rollback in non-production before production rollout.

Rollback restores the previous application only before legacy columns are removed. After destructive cleanup, rollback requires the documented database backup/restore procedure; role and client-setting backfills must therefore be validated before cleanup.

## Open Questions

- The approved privacy-notice version identifier and final production wording remain supplied by `gdpr-production-readiness`.
- The approved retention period for membership notifications remains an operational readiness input; implementation must keep retention configurable.
