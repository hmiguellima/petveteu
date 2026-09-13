import { describe, expect, it } from 'vitest';
import { portalPathForRole, redirectForRoleAccess } from '@/lib/auth-routing';
import { registrationSchema } from '@/lib/validation';

describe('registration validation', () => {
  it('normalizes registration contact fields and defaults to Portuguese', () => {
    const result = registrationSchema.parse({
      fullName: '  Maria Silva  ',
      email: '  MARIA@EXAMPLE.COM ',
      phone: '+351 912 345 678',
      password: 'long-password',
    });

    expect(result).toMatchObject({
      fullName: 'Maria Silva',
      email: 'maria@example.com',
      phone: '+351912345678',
      locale: 'pt-PT',
    });
  });

  it('rejects malformed phones and weak passwords', () => {
    expect(() =>
      registrationSchema.parse({
        fullName: 'Maria Silva',
        email: 'maria@example.com',
        phone: 'invalid',
        password: 'short',
      }),
    ).toThrow();
  });
});

describe('portal routing', () => {
  it('routes each database role to its own portal', () => {
    expect(portalPathForRole('client')).toBe('/client');
    expect(portalPathForRole('vet')).toBe('/vet');
    expect(redirectForRoleAccess('client', 'client')).toBeNull();
    expect(redirectForRoleAccess('vet', 'vet')).toBeNull();
    expect(redirectForRoleAccess('client', 'vet')).toBe('/client');
    expect(redirectForRoleAccess('vet', 'client')).toBe('/vet');
  });
});
