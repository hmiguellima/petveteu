import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

export const phoneSchema = z
  .string()
  .transform((phoneNumber) => parsePhoneNumberFromString(phoneNumber)?.number)
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/));

export const registrationSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: phoneSchema,
  password: z.string().min(10).max(128),
  locale: z.enum(['pt-PT', 'en']).default('pt-PT'),
});

export const petSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    species: z.enum(['dog', 'cat', 'other']),
    otherSpecies: z.string().trim().max(60).nullable(),
    dateOfBirth: z.string().date(),
    birthDateIsEstimated: z.boolean(),
    breed: z.string().trim().max(100).nullable(),
  })
  .superRefine((pet, context) => {
    if (pet.species === 'other' && !pet.otherSpecies) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherSpecies'],
        message: 'required',
      });
    }

    if (pet.species !== 'other' && pet.otherSpecies) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherSpecies'],
        message: 'unexpected',
      });
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(
      new Date(),
    );

    if (pet.dateOfBirth > today) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'future' });
    }
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  locale: z.enum(['pt-PT', 'en']),
  smsEnabled: z.boolean(),
  version: z.coerce.number().int().positive(),
});

export const vetClientSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.union([phoneSchema, z.literal('')]).transform((phone) => phone || null),
  locale: z.enum(['pt-PT', 'en']),
  smsEnabled: z.boolean(),
  version: z.coerce.number().int().positive(),
});

export const petMutationSchema = petSchema.and(
  z.object({
    id: z.string().uuid(),
    version: z.coerce.number().int().positive(),
  }),
);

export const vetPetSchema = petSchema.and(
  z.object({
    notificationExpiryYears: z.coerce.number().int().min(1).max(50).nullable(),
    ownerId: z.string().uuid(),
  }),
);

export const vaccinationSchema = z
  .object({
    id: z.string().uuid().nullable(),
    petId: z.string().uuid(),
    vaccineType: z.string().trim().min(1).max(120),
    dueDate: z.string().date(),
    lastAdministeredDate: z.string().date().nullable(),
    notes: z.string().trim().max(2000).nullable(),
    version: z.coerce.number().int().nonnegative(),
  })
  .superRefine((vaccination, context) => {
    if (
      (vaccination.id === null && vaccination.version !== 0) ||
      (vaccination.id && vaccination.version < 1)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['version'],
        message: 'invalid_version',
      });
    }

    if (!vaccination.lastAdministeredDate) {
      return;
    }

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(
      new Date(),
    );

    if (
      vaccination.lastAdministeredDate > vaccination.dueDate ||
      vaccination.lastAdministeredDate > today
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastAdministeredDate'],
        message: 'invalid_administered_date',
      });
    }
  });
