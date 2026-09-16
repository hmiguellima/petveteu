'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { phoneSchema, vetClientSchema, vetPetSchema } from '@/lib/validation';

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().min(1).max(120),
  locale: z.enum(['pt-PT', 'en']).default('pt-PT'),
  phone: phoneSchema,
});

const emailChangeSchema = z.object({
  clientId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
});

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
    notificationExpiryYears: formData.get('expiry') || null,
    ownerId: formData.get('ownerId'),
  };
}

function vetPath(error: unknown, success: string): string {
  if (!error) {
    return `/vet?status=${success}`;
  }

  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const code = message.includes('stale_or_forbidden') ? 'stale' : 'request';

  return `/vet?error=${code}`;
}

export async function inviteClient(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('name'),
    locale: formData.get('locale') || 'pt-PT',
    phone: formData.get('phone'),
  });

  if (!parsed.success) {
    redirect('/vet?error=invalid-client');
  }

  const { error } = await supabase.functions.invoke('admin-clients', {
    body: { operation: 'invite', ...parsed.data },
  });

  revalidatePath('/vet');
  redirect(vetPath(error, 'client-invited'));
}

export async function updateClient(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const parsed = vetClientSchema.safeParse({
    fullName: formData.get('name'),
    phone: String(formData.get('phone') ?? ''),
    locale: formData.get('locale'),
    smsEnabled: formData.get('sms') === 'on',
    version: formData.get('version'),
  });

  if (!parsed.success) {
    redirect('/vet?error=invalid-client');
  }

  const { error } = await supabase.rpc('vet_update_client', {
    p_id: formData.get('id'),
    p_name: parsed.data.fullName,
    p_phone: parsed.data.phone,
    p_locale: parsed.data.locale,
    p_sms: parsed.data.smsEnabled,
    p_version: parsed.data.version,
  });

  revalidatePath('/vet');
  redirect(vetPath(error, 'client-saved'));
}

export async function changeClientEmail(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const parsed = emailChangeSchema.safeParse({
    clientId: formData.get('id'),
    email: formData.get('email'),
  });

  if (!parsed.success) {
    redirect('/vet?error=invalid-email');
  }

  const { error } = await supabase.functions.invoke('admin-clients', {
    body: { operation: 'change_email', ...parsed.data },
  });

  revalidatePath('/vet');
  redirect(vetPath(error, 'email-requested'));
}

export async function resendClientInvite(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const clientId = z.string().uuid().safeParse(formData.get('id'));

  if (!clientId.success) {
    redirect('/vet?error=invalid-client');
  }

  const { error } = await supabase.functions.invoke('admin-clients', {
    body: { operation: 'resend', clientId: clientId.data },
  });

  redirect(vetPath(error, 'invite-resent'));
}

export async function createVetPet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const parsed = vetPetSchema.safeParse(petInput(formData));

  if (!parsed.success) {
    redirect('/vet?error=invalid-pet');
  }

  const { error } = await supabase.rpc('vet_create_pet', {
    p_owner_id: parsed.data.ownerId,
    p_name: parsed.data.name,
    p_species: parsed.data.species,
    p_other_species: parsed.data.otherSpecies,
    p_birth: parsed.data.dateOfBirth,
    p_estimated: parsed.data.birthDateIsEstimated,
    p_breed: parsed.data.breed,
    p_expiry: parsed.data.notificationExpiryYears,
  });

  revalidatePath('/vet');
  redirect(vetPath(error, 'pet-created'));
}

export async function updateVetPet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const parsed = vetPetSchema.safeParse(petInput(formData));
  const id = z.string().uuid().safeParse(formData.get('id'));
  const version = z.coerce.number().int().positive().safeParse(formData.get('version'));

  if (
    !parsed.success ||
    !id.success ||
    !version.success ||
    parsed.data.notificationExpiryYears === null
  ) {
    redirect('/vet?error=invalid-pet');
  }

  const { error } = await supabase.rpc('vet_update_pet', {
    p_id: id.data,
    p_name: parsed.data.name,
    p_species: parsed.data.species,
    p_other_species: parsed.data.otherSpecies,
    p_birth: parsed.data.dateOfBirth,
    p_estimated: parsed.data.birthDateIsEstimated,
    p_breed: parsed.data.breed,
    p_expiry: parsed.data.notificationExpiryYears,
    p_version: version.data,
  });

  revalidatePath('/vet');
  redirect(vetPath(error, 'pet-saved'));
}

export async function removeVetPet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');
  const { error } = await supabase.rpc('vet_remove_pet', {
    p_id: formData.get('id'),
    p_version: Number(formData.get('version')),
  });

  revalidatePath('/vet');
  redirect(vetPath(error, 'pet-removed'));
}

export async function saveVaccine(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');

  await supabase.rpc('vet_save_vaccination', {
    p_id: null,
    p_pet_id: formData.get('petId'),
    p_type: formData.get('type'),
    p_due: formData.get('due'),
    p_admin: formData.get('admin') || null,
    p_notes: formData.get('notes') || null,
    p_version: 0,
  });

  revalidatePath('/vet');
}

export async function manualRun(): Promise<void> {
  const { supabase } = await requireRole('vet');

  await supabase.functions.invoke('reminders', { body: { source: 'manual' } });

  revalidatePath('/vet');
}
