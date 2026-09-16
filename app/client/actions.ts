'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { petMutationSchema, petSchema, profileSchema } from '@/lib/validation';

function optionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();

  return text || null;
}

function petInput(formData: FormData): Record<string, unknown> {
  const species = formData.get('species');

  return {
    name: formData.get('name'),
    species,
    otherSpecies: species === 'other' ? optionalText(formData.get('otherSpecies')) : null,
    dateOfBirth: formData.get('birth'),
    birthDateIsEstimated: formData.get('estimated') === 'on',
    breed: optionalText(formData.get('breed')),
  };
}

function resultPath(error: unknown, success: string): string {
  if (!error) {
    return `/client?status=${success}`;
  }

  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const code = message.includes('stale_or_forbidden') ? 'stale' : 'invalid';

  return `/client?error=${code}`;
}

export async function updateProfile(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');
  const parsed = profileSchema.safeParse({
    fullName: formData.get('name'),
    phone: formData.get('phone'),
    locale: formData.get('locale'),
    smsEnabled: formData.get('sms') === 'on',
    version: formData.get('version'),
  });

  if (!parsed.success) {
    redirect('/client?error=invalid');
  }

  const { error } = await supabase.rpc('update_my_profile', {
    p_full_name: parsed.data.fullName,
    p_phone: parsed.data.phone,
    p_locale: parsed.data.locale,
    p_sms: parsed.data.smsEnabled,
    p_version: parsed.data.version,
  });

  if (!error) {
    cookies().set('locale', parsed.data.locale, { sameSite: 'lax', path: '/' });
  }

  revalidatePath('/client');
  redirect(resultPath(error, 'profile-saved'));
}

export async function createPet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');
  const parsed = petSchema.safeParse(petInput(formData));

  if (!parsed.success) {
    redirect('/client?error=invalid-pet');
  }

  const { error } = await supabase.rpc('client_create_pet', {
    p_name: parsed.data.name,
    p_species: parsed.data.species,
    p_other_species: parsed.data.otherSpecies,
    p_birth: parsed.data.dateOfBirth,
    p_estimated: parsed.data.birthDateIsEstimated,
    p_breed: parsed.data.breed,
  });

  revalidatePath('/client');
  redirect(resultPath(error, 'pet-created'));
}

export async function updatePet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');
  const parsed = petMutationSchema.safeParse({
    ...petInput(formData),
    id: formData.get('id'),
    version: formData.get('version'),
  });

  if (!parsed.success) {
    redirect('/client?error=invalid-pet');
  }

  const { error } = await supabase.rpc('client_update_pet', {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_species: parsed.data.species,
    p_other_species: parsed.data.otherSpecies,
    p_birth: parsed.data.dateOfBirth,
    p_estimated: parsed.data.birthDateIsEstimated,
    p_breed: parsed.data.breed,
    p_version: parsed.data.version,
  });

  revalidatePath('/client');
  redirect(resultPath(error, 'pet-saved'));
}

export async function removePet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');

  const { error } = await supabase.rpc('client_remove_pet', {
    p_id: formData.get('id'),
    p_version: Number(formData.get('version')),
  });

  revalidatePath('/client');
  redirect(resultPath(error, 'pet-removed'));
}
