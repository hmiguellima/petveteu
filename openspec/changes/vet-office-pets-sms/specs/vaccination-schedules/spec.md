## Purpose

Records each pet's vaccination due dates so the clinic can plan visits and owners can see upcoming vaccines without changing them.

## ADDED Requirements

### Requirement: Per-pet vaccination schedule
The system SHALL store zero or more vaccination entries per pet. Each entry MUST include a vaccine type (human-readable name) and a due date. The system SHALL allow an optional last-administered date and optional free-text clinical notes.

#### Scenario: Pet with several vaccines
- **WHEN** a vet records rabies due on one date and a booster due on another date for the same pet
- **THEN** the system lists both entries on that pet's schedule

### Requirement: Vet manages schedules
The system SHALL allow an authenticated vet to add, update, and delete vaccination entries for any pet. Clients MUST NOT create, edit, or delete vaccination entries.

#### Scenario: Vet updates a due date
- **WHEN** an authenticated vet changes the due date on a vaccination entry
- **THEN** the system stores the new due date and later reminders use that date

#### Scenario: Client cannot edit the schedule
- **WHEN** an authenticated client attempts to add, change, or delete a vaccination entry
- **THEN** the system rejects the attempt and leaves the schedule unchanged

### Requirement: Client can view own pets' schedules
The system SHALL show an authenticated client the vaccination schedule for each of their pets in read-only form, including vaccine type and due date. The system MUST NOT show a client another client's pets or schedules.

#### Scenario: Client views upcoming vaccines
- **WHEN** an authenticated client opens a pet they own that has a due vaccine
- **THEN** the system displays that vaccine type and due date without edit controls

#### Scenario: Client cannot see another owner's schedule
- **WHEN** an authenticated client requests a pet or schedule that belongs to another client
- **THEN** the system denies access and does not return that data
