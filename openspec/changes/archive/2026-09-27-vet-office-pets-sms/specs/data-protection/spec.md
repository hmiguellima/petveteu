## Purpose

Defines the transparency, governance, retention, individual-rights, security, and incident-readiness controls required before the application processes real client data in production.

## ADDED Requirements

### Requirement: Transparent processing information

Before production use, the system SHALL provide a Portuguese-first privacy notice, with English coverage, at self-registration and from authenticated portals. The notice MUST identify the controller and contact route and explain processing purposes, data categories, lawful bases, recipient categories, relevant international transfers and safeguards, retention periods or criteria, individual rights, and the supervisory-authority complaint route. A client created by the vet MUST receive the same information directly. Exact wording and lawful bases MUST be approved by the practice with qualified Portuguese legal review.

#### Scenario: Self-registering client receives privacy information

- **WHEN** a visitor begins self-registration
- **THEN** the current privacy notice is accessible before their personal data is submitted

#### Scenario: Vet-created client is informed

- **WHEN** the vet creates or invites a client
- **THEN** the system sends or presents the current privacy information through the configured client communication flow

### Requirement: Processing and provider governance

Before production use, the practice SHALL document its processing activities, the purposes and approved lawful basis for each purpose, all processors and relevant subprocessors, data locations, and transfer safeguards. Appropriate processor agreements MUST be in place for Supabase, Vercel, Twilio, and any other provider that processes personal data. The system MUST NOT assume that every purpose relies on consent.

#### Scenario: Production readiness review

- **WHEN** the application is evaluated for production launch
- **THEN** the approved processing record, provider inventory, processor agreements, and transfer assessment are available or launch is blocked

### Requirement: Individual-rights workflow

The system SHALL support a documented, authenticated clinic-assisted workflow for access/export, correction, objection, restriction, and erasure requests. The workflow MUST record identity verification, request and completion dates, outcome, and any documented lawful refusal or continuing retention basis while minimizing personal data in audit records.

#### Scenario: Client requests access

- **WHEN** a client makes a verified access or export request
- **THEN** the clinic can produce the personal data in scope and record completion through the documented workflow

#### Scenario: Erasure is limited by a retention obligation

- **WHEN** a verified erasure request covers data with a documented continuing legal basis
- **THEN** the clinic records the reason, restricts or retains only the necessary data, erases eligible data, and cancels all future reminders for the account

### Requirement: Approved retention and disposal

Production launch MUST be blocked until the practice approves concrete retention or review periods for profiles, pet and vaccination records, reminder records, administrative and job audit events, backups, and diagnostic logs. Soft deletion MUST remove data from normal portal and reminder processing but MUST NOT be treated as indefinite retention. At the approved endpoint, personal data SHALL be erased or irreversibly anonymized unless a documented legal obligation or hold applies.

#### Scenario: Soft-deleted pet reaches retention endpoint

- **WHEN** a soft-deleted pet record reaches its approved retention endpoint with no active hold
- **THEN** the system erases or irreversibly anonymizes the personal data and preserves no future reminder eligibility

#### Scenario: Retention policy is missing

- **WHEN** no approved retention schedule exists during the production-readiness review
- **THEN** production launch is blocked

### Requirement: Security and incident readiness

Before production use, the system SHALL require MFA for the vet, minimize collected data, redact operational logs, protect secrets and backups, restrict and audit production access, and document restoration testing and incident response. Ordinary logs MUST NOT retain SMS bodies, passwords, credentials, session tokens, or unnecessary personal data. The practice MUST document breach assessment and applicable authority, individual, and processor notification workflows.

#### Scenario: Vet accesses production

- **WHEN** the vet authenticates to the production portal
- **THEN** access requires the configured second authentication factor

#### Scenario: Application records an operational error

- **WHEN** an error is written to an ordinary application log
- **THEN** the entry excludes SMS bodies, credentials, session tokens, and unnecessary client or pet identifiers

### Requirement: Data-protection risk assessment

The practice SHALL complete and record a DPIA screening before production launch and MUST complete a full DPIA before launch if the screening determines that the processing is likely to create high risk. The practice SHALL separately determine with qualified advice whether a DPO or other formal privacy role is required.

#### Scenario: DPIA screening identifies likely high risk

- **WHEN** the pre-launch screening concludes that processing is likely high risk
- **THEN** production launch remains blocked until the full assessment and required mitigations are complete
