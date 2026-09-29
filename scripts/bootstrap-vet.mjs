import { createClient } from '@supabase/supabase-js';

const requiredEnvironmentVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BOOTSTRAP_VET_EMAIL',
  'BOOTSTRAP_VET_PASSWORD',
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing ${variableName}`);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { count } = await supabase
  .from('account_roles')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'vet');
const { count: pendingCount } = await supabase
  .from('vet_invitations')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending');
if (count || pendingCount) {
  throw new Error('Vet already exists');
}

const { data, error } = await supabase.auth.admin.createUser({
  email: process.env.BOOTSTRAP_VET_EMAIL.trim().toLowerCase(),
  password: process.env.BOOTSTRAP_VET_PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: 'Veterinário', initial_role: 'vet', locale: 'pt-PT' },
});

if (error) {
  throw error;
}

const { error: accessError } = await supabase
  .from('vet_access')
  .upsert({ profile_id: data.user.id, status: 'pending_mfa', activated_at: null });
if (accessError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  throw accessError;
}

console.log('Vet created; configure MFA before production.');
