## Purpose

Records each pet's vaccination due dates so the clinic can plan visits and owners can see upcoming vaccines without changing them.

## ADDED Requirements

### Requirement: Per-pet vaccination schedule

The system SHALL store zero or more vaccination entries per pet. Each entry MUST include a trimmed human-readable vaccine type of 1–120 characters and a due date. A due date MAY be historical. The system SHALL allow an optional last-administered date that is not in the future or later than the due date and optional free-text clinical notes of at most 2,000 characters. Free text MUST be rendered as text rather than executable HTML. The system MUST reject an exact duplicate normalized vaccine type and due date for the same active pet.

#### Scenario: Pet with several vaccines

- **WHEN** a vet records rabies due on one date and a booster due on another date for the same pet
- **THEN** the system lists both entries on that pet's schedule

#### Scenario: Exact active duplicate is rejected

- **WHEN** a vet submits the same normalized vaccine type and due date twice for one active pet
- **THEN** the system rejects the duplicate and creates no second reminder eligibility

#### Scenario: Invalid administered date is rejected

- **WHEN** a vet submits a last-administered date in the future or after the due date
- **THEN** the system rejects the mutation and leaves the schedule unchanged

### Requirement: Vet manages schedules

The system SHALL allow an authenticated vet to add, update, and delete vaccination entries for any pet. Clients MUST NOT create, edit, or delete vaccination entries.

#### Scenario: Vet updates a due date

- **WHEN** an authenticated vet changes the due date on a vaccination entry
- **THEN** the system stores the new due date and later reminders use that date

#### Scenario: Client cannot edit the schedule

- **WHEN** an authenticated client attempts to add, change, or delete a vaccination entry
- **THEN** the system rejects the attempt and leaves the schedule unchanged

#### Scenario: Schedule mutation requires the vet function

- **WHEN** a portal user attempts a direct table write to a vaccination entry
- **THEN** the database denies the write, and only a narrowly scoped mutation that verifies the current vet role may change the schedule

### Requirement: Schedule updates use optimistic concurrency

Vaccination entries SHALL include creation and update timestamps and SHALL reject an update based on a version or update timestamp older than the current record. Changing a due date MUST cancel any pending reminder for the old date, preserve already submitted reminder history, and permit a separate reminder lifecycle for the new date.

#### Scenario: Stale schedule edit is rejected

- **WHEN** the vet submits an update after the vaccination entry has changed since it was loaded
- **THEN** the system rejects the stale update and returns the current entry for review

#### Scenario: Due date replaces a pending reminder

- **WHEN** the vet changes a due date that has a pending but unsubmitted reminder
- **THEN** the system cancels the old pending reminder and evaluates the new date independently

### Requirement: Client can view own pets' schedules

The system SHALL show an authenticated client the vaccination schedule for each of their pets in read-only form, including vaccine type and due date. The system MUST NOT show a client another client's pets or schedules.

#### Scenario: Client views upcoming vaccines

- **WHEN** an authenticated client opens a pet they own that has a due vaccine
- **THEN** the system displays that vaccine type and due date without edit controls

#### Scenario: Client cannot see another owner's schedule

- **WHEN** an authenticated client requests a pet or schedule that belongs to another client
- **THEN** the system denies access and does not return that data
