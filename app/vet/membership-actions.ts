'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { privacyNoticeVersion } from '@/lib/privacy';

const emailSchema = z.string().trim().toLowerCase().email();
const idSchema = z.string().uuid();
const identitySchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  locale: z.enum(['en', 'pt-PT']),
  version: z.coerce.number().int().positive(),
});

async function invoke(operation: string, values: Record<string, string>): Promise<void> {
  const { supabase } = await requireRole('vet');
  const { error } = await supabase.functions.invoke('admin-vets', {
    body: { operation, ...values },
  });
  revalidatePath('/vet');
  redirect(error ? '/vet?error=membership' : `/vet?status=vet-${operation}`);
}

export async function inviteVet(formData: FormData): Promise<void> {
  const email = emailSchema.safeParse(formData.get('email'));
  if (!email.success) {
    redirect('/vet?error=invalid-email');
  }
  await invoke('invite', { email: email.data });
}

export async function cancelVetInvitation(formData: FormData): Promise<void> {
  const invitationId = idSchema.safeParse(formData.get('invitationId'));
  if (!invitationId.success) {
    redirect('/vet?error=membership');
  }
  await invoke('cancel', { invitationId: invitationId.data });
}

export async function resendVetInvitation(formData: FormData): Promise<void> {
  const invitationId = idSchema.safeParse(formData.get('invitationId'));
  if (!invitationId.success) {
    redirect('/vet?error=membership');
  }
  await invoke('resend', { invitationId: invitationId.data });
}

export async function revokeVet(formData: FormData): Promise<void> {
  const profileId = idSchema.safeParse(formData.get('profileId'));
  if (!profileId.success) {
    redirect('/vet?error=membership');
  }
  await invoke('revoke', { profileId: profileId.data });
}

export async function activateClientRole(formData: FormData): Promise<void> {
  const noticeVersion = privacyNoticeVersion();
  if (formData.get('noticePresented') !== 'on' || formData.get('noticeVersion') !== noticeVersion) {
    redirect('/vet?error=privacy-notice');
  }
  const { supabase } = await requireRole('vet');
  const { error } = await supabase.rpc('activate_my_client_role', {
    p_notice_version: noticeVersion,
  });
  revalidatePath('/vet');
  revalidatePath('/client');
  redirect(error ? '/vet?error=client-role' : '/client?status=client-activated');
}

export async function deactivateClientRole(): Promise<void> {
  const { supabase } = await requireRole('vet');
  const { error } = await supabase.rpc('deactivate_my_empty_client_role');
  revalidatePath('/vet');
  revalidatePath('/client');
  if (error?.message.includes('client_closure_required')) {
    redirect('/client?error=client-closure');
  }
  redirect(error ? '/vet?error=client-role' : '/vet?status=client-deactivated');
}

export async function markNotificationRead(formData: FormData): Promise<void> {
  const notificationId = idSchema.safeParse(formData.get('notificationId'));
  if (!notificationId.success) {
    redirect('/vet?error=membership');
  }
  const { supabase } = await requireRole('vet');
  await supabase.rpc('mark_notification_read', { p_id: notificationId.data });
  revalidatePath('/vet');
}

export async function updateSharedIdentity(formData: FormData): Promise<void> {
  const parsed = identitySchema.safeParse({
    fullName: formData.get('name'),
    locale: formData.get('locale'),
    version: formData.get('version'),
  });
  if (!parsed.success) {
    redirect('/vet?error=invalid');
  }
  const { supabase } = await requireRole('vet');
  const { error } = await supabase.rpc('update_my_shared_identity', {
    p_full_name: parsed.data.fullName,
    p_locale: parsed.data.locale,
    p_version: parsed.data.version,
  });
  if (!error) {
    cookies().set('locale', parsed.data.locale, { sameSite: 'lax', path: '/' });
  }
  revalidatePath('/vet');
  redirect(error ? '/vet?error=stale' : '/vet?status=identity-saved');
}
