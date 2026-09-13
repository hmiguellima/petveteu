import { describe, expect, it } from 'vitest';
import { parseAdminClientInput } from '@/supabase/functions/_shared/admin-input';

describe('administrative client input', () => {
  it('normalizes a narrowly scoped client invitation', () => {
    expect(
      parseAdminClientInput({
        operation: 'invite',
        email: ' CLIENT@EXAMPLE.COM ',
        fullName: ' Client Name ',
        phone: '+351912345678',
      }),
    ).toEqual({
      operation: 'invite',
      email: 'client@example.com',
      fullName: 'Client Name',
      phone: '+351912345678',
      locale: 'pt-PT',
    });
  });

  it.each([
    { operation: 'invite', role: 'vet' },
    { operation: 'invite', email: 'bad', fullName: 'Name', phone: '+351912345678' },
    {
      operation: 'invite',
      email: 'client@example.com',
      fullName: 'Name',
      phone: '912345678',
    },
    { operation: 'change_email', clientId: 'not-a-uuid', email: 'client@example.com' },
    { operation: 'delete_user', clientId: '10000000-0000-4000-8000-000000000001' },
  ])('rejects unsupported or malformed payload %#', (input) => {
    expect(() => parseAdminClientInput(input)).toThrow();
  });
});
