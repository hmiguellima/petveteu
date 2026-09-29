## MODIFIED Requirements

### Requirement: Language coverage

The system SHALL provide Portuguese and English copy for every user-visible web string in the client portal, vet portal, registration, sign-in, vet invitation/onboarding, membership notification, and every SMS template. If a string is missing in the selected language, the system MUST fall back to Portuguese rather than showing a raw key.

#### Scenario: Missing English string falls back

- **WHEN** the UI language is English and a string has no English translation
- **THEN** the system shows the Portuguese text for that string

#### Scenario: Vet management is localized

- **WHEN** a vet uses invitation, revocation, notification, role-switching, or recovery-facing UI
- **THEN** every visible string is available in Portuguese and English

## ADDED Requirements

### Requirement: Vet invitation and membership notification language

The system SHALL send a concise bilingual Portuguese-and-English invitation when the invited email has no existing profile. An invitation for an existing profile and every in-app membership notification MUST use that profile's saved language. A new invitee MUST select Portuguese or English during onboarding, and the selection becomes the shared preferred language.

#### Scenario: Unknown invitee receives bilingual invitation

- **WHEN** a vet invites an email with no existing profile
- **THEN** the invitation presents Portuguese and English instructions and the onboarding flow asks for a preferred language

#### Scenario: Existing client receives localized invitation

- **WHEN** a vet invites an existing client
- **THEN** the invitation uses the client's saved preferred language

#### Scenario: Membership change notification is localized

- **WHEN** an active vet receives an activation, revocation, or reinstatement notification
- **THEN** the in-app notification uses that vet's saved preferred language
