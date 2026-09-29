# data-protection Specification

## Purpose

TBD - created by archiving change vet-office-pets-sms. Update Purpose after archive.

## Requirements

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

### Requirement: Processing and provider governance

Before production use, the practice SHALL document its processing activities, the purposes and approved lawful basis for each purpose, all processors and relevant subprocessors, data locations, and transfer safeguards. Appropriate processor agreements MUST be in place for Supabase, Vercel, Twilio, and any other provider that processes personal data. The system MUST NOT assume that every purpose relies on consent.

#### Scenario: Production readiness review

- **WHEN** the application is evaluated for production launch
- **THEN** the approved processing record, provider inventory, processor agreements, and transfer assessment are available or launch is blocked

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
