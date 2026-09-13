'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';

export async function updateProfile(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');

  await supabase.rpc('update_my_profile', {
    p_full_name: formData.get('name'),
    p_phone: formData.get('phone'),
    p_locale: formData.get('locale'),
    p_sms: formData.get('sms') === 'on',
    p_version: Number(formData.get('version')),
  });

  revalidatePath('/client');
}

export async function createPet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');

  await supabase.rpc('client_create_pet', {
    p_name: formData.get('name'),
    p_species: formData.get('species'),
    p_other_species: formData.get('otherSpecies') || null,
    p_birth: formData.get('birth'),
    p_estimated: formData.get('estimated') === 'on',
    p_breed: formData.get('breed') || null,
  });

  revalidatePath('/client');
}

export async function removePet(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('client');

  await supabase.rpc('client_remove_pet', {
    p_id: formData.get('id'),
    p_version: Number(formData.get('version')),
  });

  revalidatePath('/client');
}
