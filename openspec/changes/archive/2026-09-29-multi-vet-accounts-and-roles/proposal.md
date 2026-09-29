## Why

PetVet EU currently binds each authenticated identity to exactly one `client` or `vet` role and enforces a single vet account. A single-practice deployment needs multiple equal-authority vet owners, including vets who also use the system as clients, without duplicating identities or weakening MFA and authorization boundaries.

## What Changes

- **BREAKING** Replace the single `profiles.role` model with normalized current role assignments and role-specific client and vet state.
- Support multiple equal-authority vet owners in one practice, with a protected operator bootstrap for the first vet and seven-day email invitations for subsequent vets.
- Grant the vet role immediately when the invitation is sent, then permit only invitation completion and MFA setup until successful enrollment and verification; require MFA at account level for every identity holding the vet role.
- Allow vets to self-activate a client role on the same identity, switch between clinic and personal portals, and appear in the shared client registry without duplicating their account.
- Make invited vet email addresses immutable from invitation time and protect a dual-role vet's shared name and language from edits by other vets.
- Let any active vet cancel or resend pending invitations and revoke or reinstate another vet, while preventing self-revocation and removal of the final active vet.
- Remove current role assignments on revocation while preserving append-only membership audit history, invalidating privileged sessions, and notifying all active vets through persistent in-app notifications for activation, revocation, and reinstatement.
- Provide operator-only emergency recovery for last-vet lockout and preserve disabled vet-only identities for later reinvitation.
- Present the approved client privacy notice when a vet self-activates the client role, and apply client closure rules only to client-domain data.
- **BREAKING** Migrate existing identities and role-specific settings transactionally and require all users to authenticate again after rollout.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `auth-and-roles`: Support multiple equal vet owners, normalized multi-role identities, vet invitation and revocation lifecycle, account-level MFA, notifications, protected recovery, portal routing, and session invalidation.
- `client-pet-registry`: Allow a vet to self-activate and use a client role on the same identity, appear in the shared registry, and protect shared identity fields while retaining ordinary client-domain management.
- `data-protection`: Present and record the approved notice at client-role activation and separate client-domain closure from retained vet identity, access, and audit data.
- `i18n`: Provide bilingual invitations for unknown recipients and use an existing account's saved language for invitations and membership notifications.

## Impact

- Database schema, migrations, row-level security, role helper functions, role-specific RPCs, administrative audit events, and generated Supabase types.
- Authentication routing, MFA enforcement, client and vet portals, role switching, invitation acceptance, and account recovery behavior.
- Privileged Edge Functions for invitations, revocation, reinstatement, session invalidation, and notification delivery.
- Supabase invitation templates and a persistent in-app notification surface.
- Existing profile, client-setting, and vet-access data migration; all existing sessions become invalid at deployment.
- GDPR readiness remains a separate change and supplies the approved privacy wording and retention decisions used here.
