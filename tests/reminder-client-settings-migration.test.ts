import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/202610010001_reminder_client_settings.sql',
  'utf8',
);

describe('reminder client-settings migration', () => {
  it('moves the eligibility trigger from profiles to client settings', () => {
    expect(migration).toContain(
      'drop trigger if exists profiles_reopen_reminders_after_eligibility_change on public.profiles',
    );
    expect(migration).toContain('on public.client_settings');
    expect(migration).toContain('after update of phone, sms_enabled_by_client, sms_enabled_by_vet');
    expect(migration).toContain('public.pets.owner_id = new.profile_id');
  });

  it('repairs only unexpired correctable permanent skips', () => {
    expect(migration).toContain("reminder.status = 'permanently_skipped'");
    expect(migration).toContain("time zone 'Europe/Lisbon'");
    expect(migration).toContain("when 'invalid_phone' then settings.phone is not null");
    expect(migration).toContain("when 'client_opt_out' then settings.sms_enabled_by_client");
    expect(migration).toContain("when 'vet_opt_out' then settings.sms_enabled_by_vet");
    expect(migration).toContain('else false');
  });
});
