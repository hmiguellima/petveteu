'use server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
export async function updateProfile(f: FormData) {
  const { supabase } = await requireRole('client');
  await supabase.rpc('update_my_profile', {
    p_full_name: f.get('name'),
    p_phone: f.get('phone'),
    p_locale: f.get('locale'),
    p_sms: f.get('sms') === 'on',
    p_version: Number(f.get('version')),
  });
  revalidatePath('/client');
}
export async function createPet(f: FormData) {
  const { supabase } = await requireRole('client');
  await supabase.rpc('client_create_pet', {
    p_name: f.get('name'),
    p_species: f.get('species'),
    p_other_species: f.get('otherSpecies') || null,
    p_birth: f.get('birth'),
    p_estimated: f.get('estimated') === 'on',
    p_breed: f.get('breed') || null,
  });
  revalidatePath('/client');
}
export async function removePet(f: FormData) {
  const { supabase } = await requireRole('client');
  await supabase.rpc('remove_pet', { p_id: f.get('id'), p_version: Number(f.get('version')) });
  revalidatePath('/client');
}
