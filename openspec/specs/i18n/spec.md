# i18n Specification

## Purpose

TBD - created by archiving change vet-office-pets-sms. Update Purpose after archive.

## Requirements

### Requirement: Portuguese is the default language

The system SHALL use Portuguese (`pt-PT`) as the default language for all UI strings and SMS templates when the user has not chosen another language.

#### Scenario: New visitor sees Portuguese

- **WHEN** a visitor opens the registration or sign-in page with no stored language preference
- **THEN** the system renders those pages in Portuguese

#### Scenario: Default SMS language

- **WHEN** the system sends a reminder SMS to a client who has not chosen English
- **THEN** the SMS body is in Portuguese

### Requirement: English as secondary language

The system SHALL allow a user to set their language preference to English (`en`) or Portuguese (`pt-PT`). After the preference is saved, subsequent UI pages for that user MUST render in the chosen language. Reminder SMS MUST use the client's saved language preference.

#### Scenario: User switches to English

- **WHEN** an authenticated user sets language to English
- **THEN** subsequent pages in that user's portal render in English

#### Scenario: SMS follows client language

- **WHEN** a client's language preference is English and a reminder is sent
- **THEN** the SMS body is in English

### Requirement: Language coverage

The system SHALL provide Portuguese and English copy for every user-visible web string in the client portal, vet portal, registration, and sign-in, and for every SMS template. If a string is missing in the selected language, the system MUST fall back to Portuguese rather than showing a raw key.

#### Scenario: Missing English string falls back

- **WHEN** the UI language is English and a string has no English translation
- **THEN** the system shows the Portuguese text for that string
