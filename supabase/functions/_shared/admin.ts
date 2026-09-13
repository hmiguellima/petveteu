import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SupabaseClient = ReturnType<typeof createClient>;

type DatabaseClients = {
  admin: SupabaseClient;
  caller: SupabaseClient;
};

type VetContext = {
  actor: string;
  admin: SupabaseClient;
};

export function createDatabaseClients(request: Request): DatabaseClients {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonymousKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = request.headers.get('Authorization') ?? '';

  return {
    caller: createClient(supabaseUrl, anonymousKey, {
      global: { headers: { Authorization: authorization } },
    }),
    admin: createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }),
  };
}

export async function requireVet(request: Request): Promise<VetContext> {
  const { caller, admin } = createDatabaseClients(request);
  const {
    data: { user },
  } = await caller.auth.getUser();

  if (!user) {
    throw new Error('unauthorized');
  }

  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();

  if (data?.role !== 'vet') {
    throw new Error('forbidden');
  }

  return { admin, actor: user.id };
}

export async function resendClientInvitation(admin: SupabaseClient, email: string): Promise<void> {
  const { error } = await admin.auth.admin.inviteUserByEmail(email);

  if (error) {
    throw new Error('invitation_resend_failed');
  }
}

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
