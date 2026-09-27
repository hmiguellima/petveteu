# auth-and-roles Specification

## Purpose

TBD - created by archiving change vet-office-pets-sms. Update Purpose after archive.

## Requirements

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

### Requirement: Canonical login email and profile mirror

The system SHALL treat the normalized email in Supabase Auth as the canonical login email. It SHALL maintain a synchronized, normalized email mirror on the corresponding profile for authorized portal queries. Portal users MUST NOT update the profile email mirror directly; a canonical Auth email change MUST drive the mirror update.

#### Scenario: Confirmed client email change is synchronized

- **WHEN** a client completes the configured authenticated email-change flow
- **THEN** the canonical Auth email changes and the system synchronizes the profile email mirror

#### Scenario: Direct mirror update is rejected

- **WHEN** a client or vet attempts to update `profiles.email` directly
- **THEN** the system rejects the update and leaves the canonical login email and mirror unchanged

#### Scenario: Unconfirmed email does not replace canonical email

- **WHEN** email confirmation is required and a requested new email has not been confirmed
- **THEN** the existing canonical email remains the login and mirrored email

### Requirement: Privileged Auth operations use a trusted boundary

The system SHALL perform privileged Supabase Auth operations only in narrowly scoped authenticated Edge Functions whose service-role credentials are unavailable to browser and Next.js application code. Each operation MUST validate the caller session, read the caller's current role from the database, require the caller to be the vet, restrict account targets to the `client` role, validate and normalize its input, and record a non-secret administrative audit event. The functions MUST NOT accept a caller-supplied role or expose a generic Auth Admin operation.

#### Scenario: Vet invites a client through the trusted boundary

- **WHEN** the authenticated vet submits valid unique client details to the invite operation
- **THEN** the Edge Function verifies the vet's current role, creates only a client account, and records the administrative action

#### Scenario: Client cannot invoke an administrative operation

- **WHEN** an authenticated client calls a privileged client-management operation
- **THEN** the Edge Function denies the request before performing any administrative Auth action

#### Scenario: Browser cannot obtain service credentials

- **WHEN** any portal is built or used
- **THEN** no service-role credential is included in browser code, responses, or browser-visible environment variables

#### Scenario: Administrative payload cannot create a vet

- **WHEN** a caller includes a role or attempts to target a vet through a privileged client-management operation
- **THEN** the function rejects the request and performs no prohibited account change

### Requirement: Protected records use explicit mutation functions

The system SHALL revoke direct browser-role insert, update, and delete access to protected application tables and SHALL expose only narrowly scoped database mutation functions for supported portal changes. Each function MUST validate the caller's current role and ownership, accept only fields that role may change, use a fixed safe search path and schema-qualified objects, and have minimal execute grants. A security-definer function MUST perform authorization explicitly rather than relying on RLS execution context.

#### Scenario: Direct protected-table update is denied

- **WHEN** an authenticated portal user submits a direct update against a protected application table
- **THEN** the database denies the write even if the user could select that row

#### Scenario: Client mutation cannot accept protected fields

- **WHEN** a client invokes an allowed profile or pet mutation
- **THEN** the function derives identity from the authenticated session and provides no parameter for role, mirrored email, the vet SMS setting, pet ownership, or notification expiry age

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
