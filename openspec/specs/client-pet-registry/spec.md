# client-pet-registry Specification

## Purpose

TBD - created by archiving change vet-office-pets-sms. Update Purpose after archive.

## Requirements

### Requirement: Client has many pets

The system SHALL associate zero or more pets with exactly one client. Each pet MUST have a trimmed name of 1–100 characters, a species of `dog`, `cat`, or `other`, and a date of birth that is not in the future. The system SHALL record whether the birth date is estimated and SHALL allow an optional breed of at most 100 characters and an optional short `other_species` label when species is `other`. The system SHALL treat a pet as belonging only to that client, and ownership MUST be immutable after creation.

#### Scenario: Client with multiple pets

- **WHEN** a client has two pets recorded
- **THEN** the system lists both pets under that client and not under any other client

#### Scenario: Estimated birth date is retained

- **WHEN** a client or vet records the best-known birth date for a pet whose exact birth date is unknown
- **THEN** the system stores the date with `birth_date_is_estimated` set and uses that date for age calculations

#### Scenario: Future birth date is rejected

- **WHEN** a client or vet submits a pet date of birth after the current Europe/Lisbon date
- **THEN** the system rejects the mutation and creates or changes no pet

### Requirement: Client can add and remove own pets

The system SHALL allow an authenticated client to add a pet to their own account and to remove a pet they own. Removing a pet MUST remove that pet from the client's list and MUST stop further vaccination reminders for that pet.

#### Scenario: Client adds a pet

- **WHEN** an authenticated client submits a valid name, species, and date of birth
- **THEN** the system stores the pet on that client's account and shows it in the client portal

#### Scenario: Client removes a pet

- **WHEN** an authenticated client confirms removal of one of their pets
- **THEN** the system no longer lists that pet for the client and does not send further SMS for that pet

#### Scenario: Client cannot change another client's pets

- **WHEN** an authenticated client attempts to add or remove a pet on another client's account
- **THEN** the system rejects the attempt and leaves the other client's pets unchanged

#### Scenario: Client cannot reassign or change protected pet fields

- **WHEN** an authenticated client attempts to change a pet's owner or notification expiry age through a direct table write or mutation payload
- **THEN** the database rejects the write and leaves the protected fields unchanged

### Requirement: Vet manages clients

The system SHALL allow an authenticated vet to create a new client (name, unique email, unique phone, language preference defaulting to Portuguese), to view all clients, and to request updates to a client's name, canonical login email, phone, and language preference. Creating a client MUST create a `client` account that can later sign in. A vet-requested email change MUST update Supabase Auth through a protected administrative operation; the profile email mirror MUST be synchronized from the canonical Auth email and MUST NOT be edited directly.

#### Scenario: Vet adds a client

- **WHEN** an authenticated vet submits valid unique contact details for a new owner
- **THEN** the system creates a client account and shows the owner in the vet client list

#### Scenario: Vet updates client contact

- **WHEN** an authenticated vet changes a client's phone number to a new unique E.164 value
- **THEN** the system stores the new phone and uses it for subsequent SMS

#### Scenario: Vet requests a client email change

- **WHEN** an authenticated vet submits a valid unused email for a client through the protected operation
- **THEN** the system updates the canonical Auth email according to the configured confirmation policy and synchronizes the profile mirror after that email becomes canonical

### Requirement: Vet manages pets of any client

The system SHALL allow an authenticated vet to add, update, and remove pets for any client, including the pet's name, species, optional other-species label, date of birth and whether it is estimated, breed, and notification expiry age. Notification expiry age MUST be an integer from 1 through 50; a value at or below the pet's current age is valid and intentionally stops reminders.

#### Scenario: Vet adds a pet for a client

- **WHEN** an authenticated vet submits valid pet details for a selected client
- **THEN** the system stores the pet under that client and both portals can list it for that client

#### Scenario: Vet removes a pet

- **WHEN** an authenticated vet confirms removal of a client's pet
- **THEN** the system no longer lists that pet and does not send further SMS for that pet

#### Scenario: Pet removal is non-destructive

- **WHEN** a client or vet removes a pet through an allowed mutation
- **THEN** the system sets the pet's deletion timestamp and preserves its clinical and reminder history

#### Scenario: Deleted pet cannot be changed

- **WHEN** a portal user attempts to mutate a soft-deleted pet
- **THEN** the system rejects the mutation and leaves the historical record unchanged

### Requirement: Client fields are normalized and validated

The system SHALL trim client names to 1–120 characters, normalize canonical email for comparison, restrict locale to `pt-PT` or `en`, and store phone as valid E.164 or `null`, never as newly submitted malformed text. Public registration MUST require valid unique email and phone. A `null` phone SHALL be permitted only for an explicitly incomplete vet-created or legacy record, and missing or historical invalid contact data MUST NOT prevent retaining clinic records.

#### Scenario: Malformed phone is rejected on update

- **WHEN** a client or vet submits a non-empty phone that is not valid E.164
- **THEN** the system rejects the contact mutation instead of storing the malformed value

#### Scenario: Incomplete vet-created record has no phone

- **WHEN** the vet explicitly saves an incomplete client record without a phone
- **THEN** the system stores `null`, marks the record incomplete, and does not send SMS until valid contact data is supplied

### Requirement: Stale mutations are rejected

Mutable client and pet records SHALL include creation and update timestamps and SHALL use optimistic concurrency checking. A mutation MUST provide the version or update timestamp originally read and MUST be rejected if the record changed after that read.

#### Scenario: Concurrent pet edit is detected

- **WHEN** a user submits a pet update based on an older version after another accepted update
- **THEN** the system rejects the stale update and returns the current record for review
