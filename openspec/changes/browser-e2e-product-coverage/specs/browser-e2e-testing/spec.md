## ADDED Requirements

### Requirement: Browser product coverage

The test suite SHALL exercise all shipped browser features using actual UI interactions against local Supabase, including registration, login errors, authorization, TOTP onboarding/challenge, both languages, client profile, pet/vaccine CRUD, invitations, membership changes, notifications, dual roles, privacy, and reminder outcomes. Mutations MUST assert visible results and persisted side effects.

#### Scenario: Removal stays removed

- **WHEN** a client or veterinarian removes a pet or vaccine in the browser
- **THEN** both appropriate portals hide the record while the database preserves its deleted history

### Requirement: Controlled SMS provider

E2E reminder tests SHALL use a local Twilio-compatible mock server with recorded requests and programmable outcomes. They MUST cover success, failure, retry, deduplication, consent, contact, date, age, deletion, and dry-run behavior without contacting real Twilio.

#### Scenario: Provider failure can be retried

- **WHEN** the mock returns a transient failure and a subsequent permitted batch runs
- **THEN** the browser and database show the failed attempt followed by the successful submission

### Requirement: Repeatable local execution

The runner SHALL manage its test services, verify local endpoints, isolate synthetic fixtures, clean tracked data on success and failure, and produce browser traces and reports. CI SHALL run the same command against a fresh local Supabase instance.

#### Scenario: Existing clinic data is protected

- **WHEN** preflight encounters an unexpected endpoint or non-synthetic identities in the reserved E2E project
- **THEN** it refuses to reset that project; the normal local development and hosted databases are never reset or processed
