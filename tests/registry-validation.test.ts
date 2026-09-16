import { describe, expect, it } from 'vitest';
import {
  petMutationSchema,
  petSchema,
  profileSchema,
  vetClientSchema,
  vetPetSchema,
} from '@/lib/validation';

const pet = {
  name: '  Bolota  ',
  species: 'dog',
  otherSpecies: null,
  dateOfBirth: '2020-05-01',
  birthDateIsEstimated: true,
  breed: '  Rafeiro  ',
} as const;

describe('registry validation', () => {
  it('normalizes client contact fields and validates its concurrency version', () => {
    expect(
      profileSchema.parse({
        fullName: '  Maria Silva ',
        phone: '+351 912 345 678',
        locale: 'pt-PT',
        smsEnabled: true,
        version: '3',
      }),
    ).toMatchObject({ fullName: 'Maria Silva', phone: '+351912345678', version: 3 });
  });

  it('allows an explicitly incomplete vet-managed client but not an incomplete self-service profile', () => {
    expect(
      vetClientSchema.parse({
        fullName: 'Cliente incompleto',
        phone: '',
        locale: 'en',
        smsEnabled: false,
        version: 1,
      }).phone,
    ).toBeNull();
    expect(() =>
      profileSchema.parse({
        fullName: 'Cliente',
        phone: '',
        locale: 'en',
        smsEnabled: true,
        version: 1,
      }),
    ).toThrow();
  });

  it('requires an other-species label only for other animals', () => {
    expect(() => petSchema.parse({ ...pet, species: 'other' })).toThrow();
    expect(() => petSchema.parse({ ...pet, otherSpecies: 'Raposa' })).toThrow();
    expect(petSchema.parse(pet)).toMatchObject({ name: 'Bolota', breed: 'Rafeiro' });
  });

  it('rejects future dates and stale mutation metadata shapes', () => {
    expect(() => petSchema.parse({ ...pet, dateOfBirth: '2999-01-01' })).toThrow();
    expect(() => petMutationSchema.parse({ ...pet, id: 'invalid', version: 0 })).toThrow();
  });

  it('accepts intentional expiry at or below the pet age and enforces the 1–50 bounds', () => {
    const base = {
      ...pet,
      ownerId: '10000000-0000-4000-8000-000000000001',
    };

    expect(
      vetPetSchema.parse({ ...base, notificationExpiryYears: 1 }).notificationExpiryYears,
    ).toBe(1);
    expect(() => vetPetSchema.parse({ ...base, notificationExpiryYears: 51 })).toThrow();
  });
});
