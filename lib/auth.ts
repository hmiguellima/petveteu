import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export type Role = 'client' | 'vet';
export async function requireRole(role: Role) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== role) redirect(profile?.role === 'vet' ? '/vet' : '/client');
  if (role === 'vet' && profile.mfa_required) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== 'aal2') redirect('/mfa');
  }
  return { supabase, user, profile };
}
