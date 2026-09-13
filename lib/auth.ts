import { redirect } from 'next/navigation';
import { redirectForRoleAccess } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type Role = 'client' | 'vet';

type Profile = {
  full_name: string;
  id: string;
  locale: 'pt-PT' | 'en';
  mfa_required: boolean;
  phone: string | null;
  role: Role;
  sms_enabled_by_client: boolean;
  sms_enabled_by_vet: boolean;
  version: number;
};

type RoleContext = {
  profile: Profile;
  supabase: ReturnType<typeof createClient>;
  user: User;
};

export async function requireRole(role: Role): Promise<RoleContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect('/sign-in?error=profile');
  }

  const roleRedirect = redirectForRoleAccess(profile.role, role);

  if (roleRedirect) {
    redirect(roleRedirect);
  }

  if (role === 'vet' && profile.mfa_required) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== 'aal2') {
      redirect('/mfa');
    }
  }

  return { supabase, user, profile };
}
