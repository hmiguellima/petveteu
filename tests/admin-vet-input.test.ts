import { describe, expect, it } from 'vitest';
import { parseAdminVetInput } from '@/supabase/functions/_shared/admin-vet-input';

describe('vet administration input', () => {
  it('normalizes an email-only invitation', () => {
    expect(parseAdminVetInput({ operation: 'invite', email: ' VET@EXAMPLE.COM ' })).toEqual({
      email: 'vet@example.com',
      operation: 'invite',
    });
  });

  it('accepts narrowly scoped membership operations', () => {
    const id = '3d594650-3436-4b8a-9f91-49a75d243c2a';
    expect(parseAdminVetInput({ operation: 'cancel', invitationId: id })).toEqual({
      invitationId: id,
      operation: 'cancel',
    });
    expect(parseAdminVetInput({ operation: 'revoke', profileId: id })).toEqual({
      operation: 'revoke',
      profileId: id,
    });
  });

  it('rejects role injection and unsupported fields', () => {
    expect(() =>
      parseAdminVetInput({ operation: 'invite', email: 'vet@example.com', role: 'vet' }),
    ).toThrow('invalid_email');
    expect(() => parseAdminVetInput({ operation: 'delete_all' })).toThrow('unsupported_operation');
  });
});
