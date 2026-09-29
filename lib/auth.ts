import { redirect } from 'next/navigation';
import { redirectForRoleAccess } from '@/lib/auth-routing';
import { vetMfaRequirementIsSatisfied } from '@/lib/mfa';
import { toPortalProfile, type PortalProfile } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type Role = 'client' | 'vet';

type RoleContext = {
  profile: PortalProfile;
  roles: Role[];
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

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id,email,full_name,locale,version,email_immutable,account_roles(role),client_settings(phone,is_incomplete,sms_enabled_by_client,sms_enabled_by_vet)',
    )
    .eq('id', user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect('/sign-in?error=profile');
  }

  const portalProfile = toPortalProfile(profile);
  const roles = portalProfile.roles;
  const roleRedirect = redirectForRoleAccess(roles, role);

  if (roleRedirect) {
    redirect(roleRedirect);
  }

  if (roles.includes('vet')) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!vetMfaRequirementIsSatisfied(true, data?.currentLevel)) {
      redirect('/mfa');
    }
  }

  return { supabase, user, profile: portalProfile, roles };
}
