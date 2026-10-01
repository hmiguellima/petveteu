import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { portalPathForRoles } from '@/lib/auth-routing';
import type { Role } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const supabase = createClient();
  if (
    tokenHash &&
    (type === 'invite' || type === 'magiclink' || type === 'signup' || type === 'email_change')
  ) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_roles(role)')
        .eq('id', data.user.id)
        .single();
      const roles = profile?.account_roles.map(({ role }: { role: Role }) => role) ?? [];

      return new NextResponse(null, {
        status: 303,
        headers: { Location: portalPathForRoles(roles) },
      });
    }
  }

  return new NextResponse(null, {
    status: 303,
    headers: { Location: '/sign-in?error=credentials' },
  });
}
