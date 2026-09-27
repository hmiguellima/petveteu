# vaccination-sms-notifications Specification

## Purpose

TBD - created by archiving change vet-office-pets-sms. Update Purpose after archive.

## Requirements

### Requirement: Default-on approaching-due SMS

The system SHALL send one SMS to the client's registered mobile number for each vaccination entry whose due date falls within the reminder window, using Europe/Lisbon calendar dates. The reminder window MUST default to two calendar days before the due date (inclusive of that day). The system MUST send at most one reminder SMS per vaccination entry unless the due date later changes, in which case the system MUST send a new reminder for the new date when that date enters the reminder window. The SMS MUST identify the pet name, vaccine type, and due date.

#### Scenario: Reminder two days before due date

- **WHEN** a vaccination entry is due in two calendar days, reminders are enabled, the pet is under expiry age, and no reminder has been sent for the current due date
- **THEN** the system sends exactly one SMS to the client's phone with pet name, vaccine type, and due date

#### Scenario: No duplicate for the same due date

- **WHEN** a reminder SMS has already been sent for a vaccination entry's current due date
- **THEN** the system does not send another SMS for that same entry and due date

#### Scenario: Due date change allows a new reminder

- **WHEN** a vet changes a vaccination entry's due date after a reminder was sent for the previous date
- **THEN** the system may send a new reminder for the new due date when that date enters the reminder window

### Requirement: Retry transient failures through the due date

The system SHALL record every reminder attempt separately from the reminder lifecycle. A transient provider or network failure MUST remain eligible for retry on a later scheduled run through the vaccine due date in Europe/Lisbon. The system MUST NOT retry after the due date. Permanent conditions, including an invalid phone, client or vet opt-out, a removed pet, or notification-age expiry, MUST NOT be retried unless the underlying data changes and the vaccination entry is still within its reminder window.

#### Scenario: Transient failure is retried

- **WHEN** a provider or network failure occurs before the vaccine due date and the reminder remains otherwise eligible on the next scheduled run
- **THEN** the system records the failed attempt and tries the reminder again

#### Scenario: Retry stops after the due date

- **WHEN** no submission succeeds by the end of the vaccine due date
- **THEN** the system marks the reminder exhausted and does not send an overdue reminder

#### Scenario: Permanent skip is not retried unchanged

- **WHEN** an attempt is skipped because of a permanent eligibility condition and that condition remains unchanged
- **THEN** the system records the skip and does not call the SMS provider again for that reminder

### Requirement: Dry runs do not count as delivery

When SMS dry-run mode is enabled, the system MUST NOT call the SMS provider and MUST NOT mark the reminder as submitted, sent, or delivered. It SHALL record a distinct `dry_run` attempt without a provider message identifier and leave the reminder eligible for real submission if dry-run mode is disabled while the vaccination entry remains within its reminder window.

#### Scenario: Dry run remains eligible for real submission

- **WHEN** an eligible reminder is evaluated while SMS dry-run mode is enabled
- **THEN** the system records a dry-run attempt, leaves the reminder pending, and does not call the SMS provider

#### Scenario: Real send follows a dry run

- **WHEN** dry-run mode is disabled after a dry-run attempt and the reminder is still eligible
- **THEN** the system may submit the SMS to the provider and records that submission separately

### Requirement: Client and vet can disable reminders

The system SHALL enable SMS reminders by default for each client. An authenticated client MUST be able to disable or re-enable reminders for their own account. An authenticated vet MUST be able to disable or re-enable reminders for any client. The system MUST send a reminder only when both the client setting and the vet setting are enabled.

#### Scenario: Default is enabled

- **WHEN** a new client account is created and neither party has changed notification settings
- **THEN** the system treats SMS reminders as enabled for that client

#### Scenario: Client opt-out stops SMS

- **WHEN** the client has disabled reminders and a vaccine enters the reminder window
- **THEN** the system does not send an SMS for that client

#### Scenario: Vet disable stops SMS even if client is enabled

- **WHEN** the vet has disabled reminders for a client and the client setting remains enabled
- **THEN** the system does not send an SMS for that client

### Requirement: Per-pet notification expiry age

The system SHALL stop sending vaccination reminder SMS for a pet once the pet's age (from date of birth, in whole years on the reminder date in Europe/Lisbon) is greater than or equal to that pet's notification expiry age. Each pet MUST have a configurable expiry age in years. When a pet is created without an explicit expiry age, the system MUST apply a default of 12 years for dogs, 15 years for cats, and 10 years for any other species. An authenticated vet MUST be able to change a pet's expiry age. An authenticated client MUST be able to view the expiry age but MUST NOT change it.

#### Scenario: Default applied for a new dog

- **WHEN** a dog is created without an explicit expiry age
- **THEN** the system stores a notification expiry age of 12 years for that pet

#### Scenario: No SMS at or after expiry age

- **WHEN** a pet's age in whole years is greater than or equal to its expiry age and a vaccine enters the reminder window
- **THEN** the system does not send an SMS for that pet

#### Scenario: Client cannot change expiry age

- **WHEN** an authenticated client attempts to change a pet's notification expiry age
- **THEN** the system rejects the attempt and leaves the expiry age unchanged

### Requirement: Missing or invalid phone is not fatal to the clinic record

The system SHALL NOT send an SMS when the client's phone number is missing or not a valid E.164 mobile number. The system MUST still keep the client, pet, and schedule records. Failed or skipped sends MUST be recorded so a vet can see that a reminder was not delivered.

#### Scenario: Invalid phone skips send

- **WHEN** a reminder is due but the client's phone is not a valid E.164 mobile number
- **THEN** the system does not call the SMS provider and records that the reminder was skipped

#### Scenario: Historical due date does not produce an overdue SMS

- **WHEN** a vaccination entry is created or retained with a due date before the current Europe/Lisbon date
- **THEN** the reminder job does not send an SMS for that historical due date

### Requirement: Daily processing uses a Lisbon business date

The system SHALL trigger reminder processing daily at 08:00 UTC and MUST compute the business date, reminder window, and pet age using `Europe/Lisbon`. It SHALL record each run against its Lisbon business date and prevent overlapping active or duplicate successful batches for that date. A failed run MUST be visible to monitoring and the current Lisbon business date MUST support a protected manual rerun.

#### Scenario: Daylight-saving time does not change the business date

- **WHEN** the daily UTC trigger runs during either standard time or daylight-saving time
- **THEN** reminder eligibility is calculated from the current calendar date in Europe/Lisbon

#### Scenario: Duplicate batch is prevented

- **WHEN** a second scheduled or manual invocation starts for a Lisbon date that already has an active or successful run
- **THEN** the system exits without processing the reminder batch again

#### Scenario: Failed daily run is recoverable

- **WHEN** the scheduled run fails for the current Lisbon business date
- **THEN** monitoring reports the failure and an authorized operator can initiate a protected rerun for that date
