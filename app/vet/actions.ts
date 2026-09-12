'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';

export async function updateClient(formData: FormData): Promise<void> {
  const { supabase } = await requireRole('vet');

  await supabase.rpc('vet_update_client', {
    p_id: formData.get('id'),
    p_name: formData.get('name'),
    p_phone: formData.get('phone') || null,
    p_locale: formData.get('locale'),
    p_sms: formData.get('sms') === 'on',
    p_version: Number(formData.get('version')),
  });

  revalidatePath('/vet');
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
