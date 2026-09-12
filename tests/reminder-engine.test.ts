import { describe, expect, it } from 'vitest';
import { decide, wholeYears } from '../supabase/functions/reminders/engine';

const baseCandidate = {
  entryId: 'e',
  dueDate: '2026-09-12',
  petName: 'Lua',
  birthDate: '2020-01-01',
  expiryYears: 12,
  deletedAt: null,
  phone: '+351912345678',
  clientSms: true,
  vetSms: true,
  locale: 'pt-PT' as const,
  vaccineType: 'Raiva',
};
describe('reminder eligibility', () => {
  it('is eligible two days before', () =>
    expect(decide(baseCandidate, '2026-09-10')).toEqual({ kind: 'eligible' }));
  it('never sends historical reminders', () =>
    expect(decide(baseCandidate, '2026-09-13').kind).toBe('exhaust'));
  it.each([
    ['clientSms', 'client_opt_out'],
    ['vetSms', 'vet_opt_out'],
  ] as const)('honours %s', (key, reason) =>
    expect(decide({ ...baseCandidate, [key]: false }, '2026-09-10').reason).toBe(reason),
  );
  it('permanently skips invalid phone', () =>
    expect(decide({ ...baseCandidate, phone: '912' }, '2026-09-10')).toEqual({
      kind: 'skip',
      reason: 'invalid_phone',
    }));
  it('stops at expiry birthday', () =>
    expect(decide({ ...baseCandidate, birthDate: '2014-09-10' }, '2026-09-10').reason).toBe(
      'age_expired',
    ));
  it('deduplicates submitted reminders', () =>
    expect(decide({ ...baseCandidate, reminderStatus: 'submitted' }, '2026-09-10').reason).toBe(
      'already_submitted',
    ));
  it('does not retry permanent conditions unchanged', () =>
    expect(
      decide({ ...baseCandidate, permanentReason: 'invalid_phone' }, '2026-09-10').reason,
    ).toBe('invalid_phone'));
  it('calculates whole years', () => expect(wholeYears('2020-09-11', '2026-09-10')).toBe(5));
});
