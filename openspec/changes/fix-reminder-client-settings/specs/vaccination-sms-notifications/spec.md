## MODIFIED Requirements

### Requirement: Retry transient failures through the due date

The system SHALL record every reminder attempt separately from the reminder lifecycle. A transient provider or network failure MUST remain eligible for retry on a later scheduled run through the vaccine due date in Europe/Lisbon. The system MUST NOT retry after the due date. Permanent conditions, including an invalid phone, client or vet opt-out, a removed pet, or notification-age expiry, MUST NOT be retried unless the underlying authoritative client or pet data changes and the vaccination entry is still within its reminder window. Changing a client phone or either SMS consent flag MUST re-evaluate a correctable permanent skip without deleting its attempt history.

#### Scenario: Transient failure is retried

- **WHEN** a provider or network failure occurs before the vaccine due date and the reminder remains otherwise eligible on the next scheduled run
- **THEN** the system records the failed attempt and tries the reminder again

#### Scenario: Retry stops after the due date

- **WHEN** no submission succeeds by the end of the vaccine due date
- **THEN** the system marks the reminder exhausted and does not send an overdue reminder

#### Scenario: Permanent skip is not retried unchanged

- **WHEN** an attempt is skipped because of a permanent eligibility condition and that condition remains unchanged
- **THEN** the system records the skip and does not call the SMS provider again for that reminder

#### Scenario: Corrected client settings reopen a skip

- **WHEN** a reminder was permanently skipped for a missing phone or SMS opt-out, its due date has not passed, and the authoritative client settings are corrected
- **THEN** the system preserves the earlier attempt and makes the reminder eligible for evaluation by a later batch

### Requirement: Daily processing uses a Lisbon business date

The system SHALL trigger reminder processing daily at 08:00 UTC and MUST compute the business date, reminder window, and pet age using `Europe/Lisbon`. It SHALL record each run against its Lisbon business date and prevent overlapping active or duplicate successful batches for that date. A failed run MUST be visible to monitoring and the current Lisbon business date MUST support a protected manual rerun. The veterinary UI MUST report whether a protected manual invocation completed, was suppressed because a successful or active run already exists, or failed.

#### Scenario: Daylight-saving time does not change the business date

- **WHEN** the daily UTC trigger runs during either standard time or daylight-saving time
- **THEN** reminder eligibility is calculated from the current calendar date in Europe/Lisbon

#### Scenario: Duplicate batch is prevented

- **WHEN** a second scheduled or manual invocation starts for a Lisbon date that already has an active or successful run
- **THEN** the system exits without processing the reminder batch again and the manual operator sees that no new batch ran

#### Scenario: Failed daily run is recoverable

- **WHEN** the scheduled run fails for the current Lisbon business date
- **THEN** monitoring reports the failure and an authorized operator can initiate a protected rerun for that date

#### Scenario: Manual batch outcome is visible

- **WHEN** an authorized vet invokes reminder processing manually
- **THEN** the veterinary UI reports the completed, duplicate-suppressed, or failed outcome without implying that every candidate produced an SMS
