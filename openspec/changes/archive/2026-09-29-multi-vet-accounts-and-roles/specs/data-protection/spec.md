## MODIFIED Requirements

### Requirement: Transparent processing information

Before production use, the system SHALL provide a Portuguese-first approved privacy notice with English coverage at self-registration, client-role self-activation, and authenticated portals. A client created by a vet MUST receive the same information directly. The system MUST record the notice version and presentation timestamp for client-role activation without representing notice presentation as consent. Exact wording and lawful bases MUST be approved by the practice with qualified Portuguese legal review.

#### Scenario: Self-registering client receives privacy information

- **WHEN** a visitor begins self-registration
- **THEN** the current approved privacy notice is accessible before personal data is submitted

#### Scenario: Vet-created client is informed

- **WHEN** a vet creates or invites a client
- **THEN** the system sends or presents the current approved privacy information through the configured client communication flow

#### Scenario: Vet self-activates as client

- **WHEN** a vet confirms activation of their client role
- **THEN** the system presents the current approved notice and records its version and presentation time before completing activation

### Requirement: Individual-rights workflow

The system SHALL support a documented authenticated clinic-assisted workflow for access/export, correction, objection, restriction, and erasure requests concerning client-domain data. For a dual-role identity, the workflow MUST assess client-domain and system-owner data separately and MUST NOT automatically remove the vet role, authentication identity, MFA state, immutable email protection, or security and audit records that remain necessary. The workflow MUST record identity verification, request and completion dates, outcome, and any documented lawful refusal or continuing retention basis while minimizing audit data.

#### Scenario: Client requests access

- **WHEN** a client makes a verified access or export request
- **THEN** the clinic can produce the personal data in scope and record completion through the documented workflow

#### Scenario: Dual-role client requests erasure

- **WHEN** a vet who also holds the client role makes a verified erasure request for client-domain data
- **THEN** the clinic processes eligible client data separately and preserves the vet identity and records still required for owner access, security, accountability, or legal obligations

#### Scenario: Erasure is limited by a retention obligation

- **WHEN** a verified erasure request covers data with a documented continuing legal basis
- **THEN** the clinic records the reason, restricts or retains only necessary data, erases eligible data, and cancels all future reminders for the client role
