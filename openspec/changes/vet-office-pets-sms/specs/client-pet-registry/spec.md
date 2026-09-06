## Purpose

Keeps a clinic registry of client (owner) records and each client's pets so the vet and owners share one list of animals.

## ADDED Requirements

### Requirement: Client has many pets
The system SHALL associate zero or more pets with exactly one client. Each pet MUST have a name, a species, and a date of birth. The system SHALL allow an optional breed. The system SHALL treat a pet as belonging only to that client.

#### Scenario: Client with multiple pets
- **WHEN** a client has two pets recorded
- **THEN** the system lists both pets under that client and not under any other client

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

### Requirement: Vet manages clients
The system SHALL allow an authenticated vet to create a new client (name, unique email, unique phone, language preference defaulting to Portuguese), to view all clients, and to update a client's name, email, phone, and language preference. Creating a client MUST create a `client` account that can later sign in.

#### Scenario: Vet adds a client
- **WHEN** an authenticated vet submits valid unique contact details for a new owner
- **THEN** the system creates a client account and shows the owner in the vet client list

#### Scenario: Vet updates client contact
- **WHEN** an authenticated vet changes a client's phone number to a new unique E.164 value
- **THEN** the system stores the new phone and uses it for subsequent SMS

### Requirement: Vet manages pets of any client
The system SHALL allow an authenticated vet to add, update, and remove pets for any client, including the pet's name, species, date of birth, breed, and notification expiry age.

#### Scenario: Vet adds a pet for a client
- **WHEN** an authenticated vet submits valid pet details for a selected client
- **THEN** the system stores the pet under that client and both portals can list it for that client

#### Scenario: Vet removes a pet
- **WHEN** an authenticated vet confirms removal of a client's pet
- **THEN** the system no longer lists that pet and does not send further SMS for that pet
