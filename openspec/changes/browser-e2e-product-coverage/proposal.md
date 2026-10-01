## Why

API smoke and component tests do not verify complete browser workflows, allowing removal and multi-role reminder regressions to escape. The product needs repeatable coverage against real local Auth, database, and Edge Functions with a controlled SMS provider.

## What Changes

- Add Playwright suites for public pages, authentication/MFA, registry, vaccinations, membership, notifications, privacy, and reminders.
- Add isolated test fixtures, a local Twilio HTTP mock, managed test services, failure artifacts, and CI.
- Correct product regressions exposed by these tests, including deleted-record visibility and normalized reminder authorization.

## Capabilities

### New Capabilities

- `browser-e2e-testing`: Repeatable browser product verification using local Supabase and mocked SMS delivery.

### Modified Capabilities

None.

## Impact

Development dependencies, scripts, test configuration, local Edge Function delivery configuration, portal queries, and documentation. No production data is used by the suite.
