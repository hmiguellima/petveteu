import { describe, expect, it } from 'vitest';
import { createCandidate, type CandidateRow } from '../supabase/functions/reminders/candidate';

function candidateRow(phone: string | null): CandidateRow {
  return {
    id: 'vaccination-id',
    due_date: '2026-10-03',
    vaccine_type: 'Tetano',
    pets: {
      name: 'Viviane',
      date_of_birth: '2025-10-03',
      notification_expiry_years: 15,
      deleted_at: null,
      profiles: {
        locale: 'pt-PT',
        client_settings: {
          phone,
          sms_enabled_by_client: true,
          sms_enabled_by_vet: true,
        },
      },
    },
  };
}

describe('reminder candidate data source', () => {
  it('uses incomplete client-role settings for a dual-role account', () => {
    expect(createCandidate(candidateRow(null))).toMatchObject({
      phone: null,
      clientSms: true,
      vetSms: true,
      locale: 'pt-PT',
    });
  });

  it('uses a corrected client-role phone and preserves profile locale', () => {
    const row = candidateRow('+351912345678');
    row.pets.profiles.client_settings = [
      {
        phone: '+351912345678',
        sms_enabled_by_client: true,
        sms_enabled_by_vet: true,
      },
    ];

    expect(createCandidate(row)).toMatchObject({
      phone: '+351912345678',
      clientSms: true,
      vetSms: true,
      locale: 'pt-PT',
    });
  });
});
