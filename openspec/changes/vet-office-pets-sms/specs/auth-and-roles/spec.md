## Purpose

Authenticates clinic clients and the single veterinary user and routes each to the matching portal with the permissions of that role.

## ADDED Requirements

### Requirement: Next.js frontend on Vercel
The registration pages, sign-in pages, client portal, and vet portal SHALL be implemented as a Next.js web application. Production hosting of that application MUST be Vercel.

#### Scenario: Frontend is Next.js on Vercel
- **WHEN** the web UI is built and deployed to production
- **THEN** the codebase is a Next.js application and the production host is Vercel

### Requirement: Client self-registration
The system SHALL allow a person to create a client account by providing full name, a unique email, a unique mobile phone number in E.164 format, a password that meets the system's password policy, and a UI language preference defaulting to Portuguese.

#### Scenario: Successful client registration
- **WHEN** a visitor submits valid registration details including an unused email and unused phone number
- **THEN** the system creates a client account, authenticates the session, and opens the client portal

#### Scenario: Duplicate email or phone
- **WHEN** a visitor submits a registration whose email or phone already belongs to an account
- **THEN** the system rejects the registration and does not create an account

### Requirement: Authenticated sessions
The system SHALL require a valid authenticated session for all client-portal and vet-portal pages except the public registration and sign-in pages.

#### Scenario: Unauthenticated access is blocked
- **WHEN** an unauthenticated visitor requests a portal page other than registration or sign-in
- **THEN** the system does not show portal data and redirects the visitor to sign-in

#### Scenario: Sign-in
- **WHEN** a registered user submits a correct email and password
- **THEN** the system starts an authenticated session and opens the portal for that user's role

### Requirement: Role-based portals
The system SHALL assign each account exactly one role of `client` or `vet`. A `client` account MUST only access the client portal. A `vet` account MUST only access the vet portal. A client MUST NOT access another client's data through the client portal.

#### Scenario: Client cannot open the vet portal
- **WHEN** an authenticated client requests a vet-portal page
- **THEN** the system denies access and does not disclose vet-portal data

#### Scenario: Vet cannot open the client portal as that client
- **WHEN** an authenticated vet requests a client-portal page
- **THEN** the system denies access to the client portal (the vet uses the vet portal to manage clients)

### Requirement: Single vet account
The system SHALL have at most one account with role `vet`. That account MUST be created only through a one-time bootstrap process when no vet account exists. Public registration MUST create `client` accounts only. The system MUST NOT provide a way for the vet (or anyone else) to create additional vet accounts.

#### Scenario: Bootstrap the vet
- **WHEN** no vet account exists and an operator completes the bootstrap process with valid vet credentials
- **THEN** the system creates the single `vet` account

#### Scenario: Second vet is rejected
- **WHEN** a vet account already exists and anyone attempts to create another `vet` account (including a second bootstrap)
- **THEN** the system rejects the attempt and leaves the existing vet account unchanged

#### Scenario: Public registration is always a client
- **WHEN** a visitor completes registration
- **THEN** the system assigns role `client` and does not create a vet account
