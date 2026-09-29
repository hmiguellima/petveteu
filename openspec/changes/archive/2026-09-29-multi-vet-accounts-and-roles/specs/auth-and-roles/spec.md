## MODIFIED Requirements

### Requirement: Authenticated sessions

The system SHALL require a valid authenticated session for all client-portal and vet-portal pages except public registration, sign-in, and secure invitation acceptance entry points. When an identity holds the `vet` role, the system MUST require verified MFA at account level before allowing either portal and MUST open the vet portal after sign-in.

#### Scenario: Unauthenticated access is blocked

- **WHEN** an unauthenticated visitor requests a portal page other than registration, sign-in, or an invitation entry point
- **THEN** the system does not show portal data and redirects the visitor to sign-in

#### Scenario: Client-only sign-in

- **WHEN** a client-only user submits valid credentials
- **THEN** the system starts an authenticated session and opens the client portal

#### Scenario: Vet-capable sign-in requires MFA

- **WHEN** a user holding the vet role signs in with a correct password but has not reached AAL2
- **THEN** the system permits only MFA completion and discloses neither client nor vet portal data

#### Scenario: Vet-capable sign-in opens the vet portal

- **WHEN** a user holding the vet role completes sign-in at AAL2
- **THEN** the system opens the vet portal even when that identity also holds the client role

### Requirement: Canonical login email and profile mirror

The system SHALL treat the normalized email in Supabase Auth as the canonical login email and SHALL maintain a synchronized normalized mirror on the corresponding profile. Before vet activation a client MAY use the configured authenticated email-change flow. After an identity is assigned the vet role at invitation or bootstrap time, its canonical email and mirror MUST be immutable through all portal and administrative flows, including after later vet-role revocation.

#### Scenario: Confirmed client-only email change is synchronized

- **WHEN** a client-only user completes the configured authenticated email-change flow
- **THEN** the canonical Auth email changes and the system synchronizes the profile mirror

#### Scenario: Accepted vet email is immutable

- **WHEN** any user attempts to change the canonical email of an identity that has ever completed vet activation
- **THEN** the system rejects the change and leaves the Auth email and profile mirror unchanged

#### Scenario: Direct mirror update is rejected

- **WHEN** a client or vet attempts to update `profiles.email` directly
- **THEN** the system rejects the update and leaves the canonical login email and mirror unchanged

### Requirement: Privileged Auth operations use a trusted boundary

The system SHALL perform privileged Supabase Auth operations only in narrowly scoped authenticated Edge Functions or protected operator tools whose service-role credentials are unavailable to browser and Next.js application code. Each in-app operation MUST validate the caller session, current role assignment, and AAL2, restrict the operation and target, validate and normalize input, and record a non-secret administrative audit event. Functions MUST NOT accept a caller-supplied role or expose a generic Auth Admin operation.

#### Scenario: Vet invitation uses the trusted boundary

- **WHEN** an active AAL2 vet submits a valid unused or existing-client email to the vet invitation operation
- **THEN** the function creates or refreshes only the narrowly scoped invitation and records the actor and target

#### Scenario: Client cannot invoke a vet membership operation

- **WHEN** a client-only identity calls invitation, revocation, or reinstatement operations
- **THEN** the function denies the request before any Auth or role state changes

#### Scenario: Browser cannot obtain service credentials

- **WHEN** any portal is built or used
- **THEN** no service-role credential is included in browser code, responses, or browser-visible environment variables

### Requirement: Role-based portals

The system SHALL allow each identity to hold zero, one, or both current roles of `client` and `vet`. A client role grants only that identity's client-domain access. A vet role grants single-practice clinic access only at AAL2. A dual-role identity MUST be able to switch between clinic and personal portals without changing its role assignments, and portal selection MUST NOT be an authorization input.

#### Scenario: Client cannot open the vet portal

- **WHEN** an authenticated client-only identity requests a vet-portal page
- **THEN** the system denies access and does not disclose vet-portal data

#### Scenario: Dual-role user opens the personal portal

- **WHEN** an AAL2 dual-role user selects the personal client area
- **THEN** the system opens that identity's client portal and continues to enforce account-level MFA

#### Scenario: Portal context cannot grant authority

- **WHEN** a user supplies a client or vet portal URL without the corresponding current role
- **THEN** the server and database deny the request regardless of UI state

## ADDED Requirements

### Requirement: Multiple equal-authority vet owners

The system SHALL support multiple vet accounts for one practice with equal authority. The first vet MUST be created only through protected operator bootstrap when no active or pending vet exists. Every subsequent vet MUST receive a seven-day invitation created by an active AAL2 vet. Sending the invitation MUST immediately add the vet role to the exact normalized-email identity and make its email immutable. The system MUST permit only invitation completion and MFA enrollment or verification until that identity reaches AAL2. Public registration MUST create a client role only.

#### Scenario: Bootstrap the first vet

- **WHEN** no active or pending vet exists and an authorized operator completes bootstrap
- **THEN** the system creates the initial onboarding identity without exposing public vet registration

#### Scenario: Active vet invites another vet

- **WHEN** an active AAL2 vet invites a normalized email
- **THEN** the system creates one seven-day pending invitation, immediately assigns the vet role, makes the email immutable, and grants no usable clinic authority before AAL2

#### Scenario: Existing client accepts a vet invitation

- **WHEN** the authenticated client whose canonical email matches the invitation accepts it
- **THEN** the same identity retains the vet role assigned at invitation time without losing client data or creating a duplicate profile and remains restricted to MFA setup until AAL2

#### Scenario: Accepted vet is restricted until MFA

- **WHEN** an identity has been invited and assigned the vet role but has not enrolled and verified MFA
- **THEN** the system denies every client and clinic portal and every privileged operation except MFA setup

#### Scenario: Public registration remains client-only

- **WHEN** a visitor completes public registration
- **THEN** the system assigns only the client role

### Requirement: Vet invitations are shared and expiring

All active vets SHALL be able to list, cancel, and resend pending vet invitations. Only one pending invitation MAY exist per normalized email. Invitations MUST expire after seven days, resend MUST invalidate the prior acceptance link, and invitation records and audits MUST NOT store reusable invitation secrets.

#### Scenario: Invitation expires

- **WHEN** an invitee attempts acceptance more than seven days after issuance
- **THEN** the system rejects the link and grants no role

#### Scenario: Another vet manages a pending invitation

- **WHEN** an active AAL2 vet cancels or resends an invitation created by another vet
- **THEN** the system performs the requested action and records both the original inviter and current actor

#### Scenario: Cancellation removes the pending vet role

- **WHEN** an active AAL2 vet cancels an invitation before MFA verification
- **THEN** the system removes the pending identity vet assignment, preserves any client role, and records the cancellation

### Requirement: Vet revocation and reinstatement are protected

Any active AAL2 vet SHALL be able to revoke another vet, but MUST NOT revoke themselves or the final active vet. Revocation MUST atomically remove the current role assignment, invalidate privileged sessions, and disable a vet-only identity while preserving a dual-role identity's client access. A revoked identity MAY be reinstated only through a fresh invitation and MFA verification.

#### Scenario: Vet revokes another vet

- **WHEN** one of at least two active vets revokes a different vet
- **THEN** the system removes the target's vet authority, invalidates privileged access, and preserves audit attribution

#### Scenario: Self-revocation is denied

- **WHEN** a vet attempts to revoke their own vet role
- **THEN** the system rejects the operation without changing membership

#### Scenario: Final vet revocation is denied

- **WHEN** an operation would remove the final active vet
- **THEN** the system rejects it transactionally

#### Scenario: Revoked dual-role user remains a client

- **WHEN** a dual-role identity loses the vet role
- **THEN** the identity retains client access and client-domain data after its privileged sessions are invalidated

### Requirement: Vet membership changes are audited and notified

The system SHALL preserve append-only audit events for invitation, activation, revocation, and reinstatement even though current role rows are deleted on revocation. Successful activation, revocation, and reinstatement MUST create persistent in-app notifications for every active vet and the affected identity as applicable. Supabase Auth email MUST be used only for invitation delivery.

#### Scenario: Vet activation notifies owners

- **WHEN** a new vet becomes active after MFA verification
- **THEN** every active vet receives a persistent in-app notification identifying the event, actor where applicable, affected account, and timestamp

### Requirement: Operator emergency recovery

The system SHALL provide a protected operator-only recovery procedure for first-vet bootstrap and cases where no active vet can recover access. Recovery MUST require service-level credentials, invalidate replaced sessions or factors, require MFA before restored vet authority is usable, create an audit/security event, and notify all active vets after recovery.

#### Scenario: Last vet loses MFA

- **WHEN** the only active vet cannot authenticate and an authorized operator completes the documented recovery procedure
- **THEN** the system resets or replaces access without revealing the old factor and requires verified MFA before clinic access

### Requirement: Current role assignments and historical audits are separate

The system SHALL use normalized role rows as the sole current role source. Revocation MUST delete the applicable assignment rather than retain an inactive assignment, while append-only audit events preserve grant and removal history according to the approved retention schedule.

#### Scenario: Revoked role is absent

- **WHEN** a role is revoked successfully
- **THEN** no current assignment for that identity and role remains and authorization checks immediately return false

### Requirement: Role migration forces reauthentication

The system SHALL transactionally migrate every existing profile's role and role-specific settings to the normalized model, remove the single-vet restriction, and invalidate all existing sessions before enabling the new authorization model.

#### Scenario: Existing data is migrated

- **WHEN** the migration completes
- **THEN** every existing client and vet retains the corresponding current role and settings, every pet owner has a client role, and the existing vet email is immutable

#### Scenario: Existing session is rejected

- **WHEN** a session created before the role-model migration requests a portal
- **THEN** the system requires a fresh sign-in and reevaluates roles and MFA
