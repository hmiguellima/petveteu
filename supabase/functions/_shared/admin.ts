import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export function clients(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!,
    anon = Deno.env.get('SUPABASE_ANON_KEY')!,
    service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  return {
    caller: createClient(url, anon, { global: { headers: { Authorization: auth } } }),
    admin: createClient(url, service, { auth: { persistSession: false } }),
  };
}
export async function requireVet(req: Request) {
  const { caller, admin } = clients(req);
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) throw new Error('unauthorized');
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'vet') throw new Error('forbidden');
  return { admin, actor: user.id };
}
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
