import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from './database.types.ts';

type AppSupabaseClient = SupabaseClient<Database>;

type DatabaseClients = {
  admin: AppSupabaseClient;
  caller: AppSupabaseClient;
};

type VetContext = {
  actor: string;
  admin: AppSupabaseClient;
};

function getBearerToken(request: Request): string {
  const authorization = request.headers.get('Authorization') ?? '';
  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

  if (scheme.toLowerCase() !== 'bearer' || !token || extraParts.length > 0) {
    throw new Error('unauthorized');
  }

  return token;
}

export function createDatabaseClients(request: Request): DatabaseClients {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonymousKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = request.headers.get('Authorization') ?? '';

  return {
    caller: createClient<Database>(supabaseUrl, anonymousKey, {
      global: { headers: { Authorization: authorization } },
    }),
    admin: createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    }),
  };
}

export async function requireVet(request: Request): Promise<VetContext> {
  const { caller, admin } = createDatabaseClients(request);
  const token = getBearerToken(request);
  const { data, error: claimsError } = await caller.auth.getClaims(token);
  const actor = data?.claims.sub;

  if (claimsError || !actor) {
    throw new Error('unauthorized');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role,mfa_required')
    .eq('id', actor)
    .single();

  if (profile?.role !== 'vet') {
    throw new Error('forbidden');
  }

  if (profile.mfa_required && data.claims.aal !== 'aal2') {
    throw new Error('forbidden');
  }

  return { admin, actor };
}

export async function resendClientInvitation(
  admin: AppSupabaseClient,
  email: string,
): Promise<void> {
  const { error } = await admin.auth.admin.inviteUserByEmail(email);

  if (error) {
    throw new Error('invitation_resend_failed');
  }
}

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
