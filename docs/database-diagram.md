# Database diagram

This diagram represents the schema created by
[`202609100001_initial.sql`](../supabase/migrations/202609100001_initial.sql). `AUTH_USERS`
represents the external `auth.users` table managed by Supabase Auth.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "owns identity"
    PROFILES ||--o{ PETS : owns
    PETS ||--o{ VACCINATION_ENTRIES : has
    VACCINATION_ENTRIES ||--o{ REMINDERS : schedules
    REMINDERS ||--o{ REMINDER_ATTEMPTS : records
    PROFILES o|--o{ ADMIN_AUDIT_EVENTS : performs
    PROFILES ||--o{ DATA_SUBJECT_REQUESTS : submits

    AUTH_USERS {
        uuid id PK
    }

    PROFILES {
        uuid id PK, FK
        user_role role
        text email UK
        text full_name
        text phone UK
        app_locale locale
        boolean is_incomplete
        boolean sms_enabled_by_client
        boolean sms_enabled_by_vet
        boolean mfa_required
        boolean processing_restricted
        date legal_hold_until
        timestamptz created_at
        timestamptz updated_at
        bigint version
    }

    PETS {
        uuid id PK
        uuid owner_id FK
        text name
        pet_species species
        text other_species
        date date_of_birth
        boolean birth_date_is_estimated
        text breed
        int notification_expiry_years
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
        bigint version
    }

    VACCINATION_ENTRIES {
        uuid id PK
        uuid pet_id FK
        text vaccine_type
        date due_date
        date last_administered_date
        text notes
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
        bigint version
    }

    REMINDERS {
        uuid id PK
        uuid vaccination_entry_id FK
        date due_date
        reminder_status status
        timestamptz created_at
        timestamptz updated_at
    }

    REMINDER_ATTEMPTS {
        uuid id PK
        uuid reminder_id FK
        attempt_outcome outcome
        text reason_code
        text provider_sid
        timestamptz created_at
    }

    REMINDER_JOB_RUNS {
        uuid id PK
        date business_date
        text trigger_source
        run_status status
        timestamptz started_at
        timestamptz completed_at
        text error_code
    }

    ADMIN_AUDIT_EVENTS {
        uuid id PK
        uuid actor_id FK
        uuid target_id
        text action
        jsonb details
        timestamptz created_at
    }

    DATA_SUBJECT_REQUESTS {
        uuid id PK
        uuid profile_id FK
        text request_type
        timestamptz verified_at
        text outcome
        text retention_basis
        timestamptz completed_at
        timestamptz created_at
    }
```

## Enumerations

| Type              | Values                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| `user_role`       | `client`, `vet`                                                                      |
| `app_locale`      | `pt-PT`, `en`                                                                        |
| `pet_species`     | `dog`, `cat`, `other`                                                                |
| `reminder_status` | `pending`, `submitted`, `delivered`, `exhausted`, `cancelled`, `permanently_skipped` |
| `attempt_outcome` | `dry_run`, `submitted`, `transient_failure`, `permanent_skip`                        |
| `run_status`      | `running`, `succeeded`, `failed`                                                     |

## Important constraints

- A profile maps one-to-one to a Supabase Auth user and is deleted when that user is deleted.
- Only one profile can have the `vet` role.
- Profile email addresses are unique case-insensitively; non-null phone numbers are also unique.
- A pet's `other_species` value is required only when its species is `other`.
- Active vaccination entries are unique by pet, normalized vaccine type, and due date.
- A reminder is unique by vaccination entry and due date.
- A submitted reminder attempt must have a provider SID; other outcomes must not have one.
- Only one running or successful reminder job may exist for a business date.
- `ADMIN_AUDIT_EVENTS.target_id` is intentionally not declared as a foreign key in the initial schema.
- All application tables have row-level security enabled. Authenticated access is read-only at the table level; mutations use security-definer functions.
