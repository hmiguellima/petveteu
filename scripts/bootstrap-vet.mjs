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
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'vet');
if (count) {
  throw new Error('Vet already exists');
}

const { data, error } = await supabase.auth.admin.createUser({
  email: process.env.BOOTSTRAP_VET_EMAIL.trim().toLowerCase(),
  password: process.env.BOOTSTRAP_VET_PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: 'Veterinário', locale: 'pt-PT' },
});

if (error) {
  throw error;
}

const { error: updateError } = await supabase
  .from('profiles')
  .update({ role: 'vet', mfa_required: true })
  .eq('id', data.user.id);
if (updateError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  throw updateError;
}

console.log('Vet created; configure MFA before production.');
