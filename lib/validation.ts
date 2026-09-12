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

export const petSchema = z.object({
  name: z.string().trim().min(1).max(100),
  species: z.enum(['dog', 'cat', 'other']),
  otherSpecies: z.string().trim().max(60).nullable(),
  dateOfBirth: z.string().date(),
  birthDateIsEstimated: z.boolean(),
  breed: z.string().trim().max(100).nullable(),
});
