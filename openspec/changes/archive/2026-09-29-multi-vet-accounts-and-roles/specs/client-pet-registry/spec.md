## MODIFIED Requirements

### Requirement: Vet manages clients

The system SHALL allow an authenticated AAL2 vet to create a new client, view every active client-role identity, and request allowed updates to client-domain settings. A dual-role vet MUST appear in the same registry and MAY own pets like any other client. For a vet-capable target, other vets MUST NOT change the target's canonical email, shared name, or preferred language, but MAY manage client-specific phone, clinic SMS permission, pets, and vaccinations.

#### Scenario: Vet adds a client

- **WHEN** an authenticated AAL2 vet submits valid unique contact details for a new owner
- **THEN** the system creates a client-role account and shows the owner in the vet client list

#### Scenario: Dual-role vet appears in the registry

- **WHEN** a vet has activated their client role
- **THEN** every vet can see that identity as a client and the current user sees a clear self label

#### Scenario: Other vet cannot change protected shared identity

- **WHEN** a vet attempts to change another vet-capable client's canonical email, shared name, or preferred language
- **THEN** the system rejects those fields without altering the target identity

#### Scenario: Vet manages dual-role client data

- **WHEN** an AAL2 vet changes an allowed client-specific phone or clinic SMS setting for a dual-role client
- **THEN** the system stores the change without changing the target's shared identity or vet access

### Requirement: Client fields are normalized and validated

The system SHALL trim shared names to 1–120 characters, normalize canonical email for comparison, restrict locale to `pt-PT` or `en`, and store the client reminder phone as valid E.164 or `null`, never as newly submitted malformed text. Public registration MUST require valid unique email and phone. A `null` client phone SHALL be permitted for an explicitly incomplete vet-created, self-activated, or legacy client record, and missing contact data MUST block SMS but not retention of clinic records.

#### Scenario: Malformed phone is rejected on update

- **WHEN** a client or vet submits a non-empty client phone that is not valid E.164
- **THEN** the system rejects the mutation instead of storing malformed text

#### Scenario: Self-activated client has no phone

- **WHEN** a vet self-activates the client role without providing a phone
- **THEN** the system creates incomplete client settings and sends no SMS until valid contact data is supplied

## ADDED Requirements

### Requirement: Vet self-activates a client role

An active vet SHALL be able to idempotently add the client role to their existing identity without creating another Auth user or profile. Activation MUST initialize client settings, MAY begin incomplete, and MUST preserve vet access and account-level MFA.

#### Scenario: Vet activates personal client area

- **WHEN** an active AAL2 vet confirms client-role activation
- **THEN** the system adds one client assignment and default client settings to the same profile and exposes the personal client portal

#### Scenario: Repeated activation is idempotent

- **WHEN** a dual-role vet repeats the activation request
- **THEN** the system creates no duplicate assignment or settings and leaves existing client data unchanged

### Requirement: Client-role deactivation is controlled

A dual-role vet MAY immediately deactivate the client role only when no client-domain pets, vaccinations, reminders, or retained closure obligations exist. Otherwise client deactivation MUST use the ordinary approved client closure and rights workflow. Client-role removal MUST NOT remove the vet role, Auth identity, MFA state, immutable-email protection, or required audits.

#### Scenario: Empty client role is removed

- **WHEN** a dual-role vet requests client deactivation and has no client-domain records or retention obligation
- **THEN** the system removes the client assignment and settings while preserving vet access

#### Scenario: Client with records requires closure workflow

- **WHEN** a dual-role vet with pets or related records requests client deactivation
- **THEN** the system does not directly remove the role and routes the request through the approved closure workflow

### Requirement: Shared identity updates are self-service for vet-capable accounts

Only the authenticated account holder SHALL be able to change the shared name or preferred language of a vet-capable identity. Client-specific settings remain independently manageable according to client and vet permissions.

#### Scenario: Vet updates own shared name

- **WHEN** an AAL2 vet submits a valid new shared name for their own identity
- **THEN** the system updates the name shown in both clinic and personal contexts

#### Scenario: Another vet sees protected fields

- **WHEN** a vet opens another dual-role vet's client record
- **THEN** the system renders shared name, language, and email as read-only while retaining allowed client-domain controls
