import { createClient } from '@supabase/supabase-js';

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RECOVERY_VET_EMAIL'];
for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}`);
  }
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const email = process.env.RECOVERY_VET_EMAIL.trim().toLowerCase();
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', email)
  .maybeSingle();
if (!profile) {
  throw new Error('Recovery target does not exist; use protected bootstrap for replacement');
}
const { data: factors, error: factorsError } = await supabase.auth.admin.mfa.listFactors({
  userId: profile.id,
});
if (factorsError) {
  throw factorsError;
}
for (const factor of factors.factors) {
  const { error } = await supabase.auth.admin.mfa.deleteFactor({
    id: factor.id,
    userId: profile.id,
  });
  if (error) {
    throw error;
  }
}
await supabase.from('account_roles').upsert({ profile_id: profile.id, role: 'vet' });
await supabase
  .from('vet_access')
  .upsert({ profile_id: profile.id, status: 'pending_mfa', activated_at: null });
await supabase
  .from('admin_audit_events')
  .insert({ target_id: profile.id, action: 'vet_operator_recovery' });
console.log('Vet recovery prepared; the vet must sign in and verify a new MFA factor.');
