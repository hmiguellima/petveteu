'use server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
export async function updateClient(f: FormData) {
  const { supabase } = await requireRole('vet');
  await supabase.rpc('vet_update_client', {
    p_id: f.get('id'),
    p_name: f.get('name'),
    p_phone: f.get('phone') || null,
    p_locale: f.get('locale'),
    p_sms: f.get('sms') === 'on',
    p_version: Number(f.get('version')),
  });
  revalidatePath('/vet');
}
export async function saveVaccine(f: FormData) {
  const { supabase } = await requireRole('vet');
  await supabase.rpc('vet_save_vaccination', {
    p_id: null,
    p_pet_id: f.get('petId'),
    p_type: f.get('type'),
    p_due: f.get('due'),
    p_admin: f.get('admin') || null,
    p_notes: f.get('notes') || null,
    p_version: 0,
  });
  revalidatePath('/vet');
}
export async function manualRun() {
  const { supabase } = await requireRole('vet');
  await supabase.functions.invoke('reminders', { body: { source: 'manual' } });
  revalidatePath('/vet');
}
