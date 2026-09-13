import { createClient } from '@supabase/supabase-js';

const requiredEnvironmentVariables = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing ${variableName}`);
  }
}

const anonymousClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const verificationId = Date.now();
const email = `auth-verification-${verificationId}@example.test`;
const duplicatePhoneEmail = `auth-phone-conflict-${verificationId}@example.test`;
const phone = `+3519${String(verificationId).slice(-8)}`;
const password = 'Local-verification-password-1';
let createdUserId;

try {
  const { data: signup, error: signupError } = await anonymousClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Auth Verification',
        phone,
        locale: 'pt-PT',
        role: 'vet',
      },
    },
  });

  if (signupError || !signup.user) {
    throw signupError ?? new Error('Signup did not create a user');
  }

  createdUserId = signup.user.id;

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('email,phone,locale,role')
    .eq('id', createdUserId)
    .single();

  if (profileError) {
    throw profileError;
  }

  if (
    profile.email !== email ||
    profile.phone !== phone ||
    profile.locale !== 'pt-PT' ||
    profile.role !== 'client'
  ) {
    throw new Error('Signup profile was not normalized as a Portuguese client');
  }

  const { error: phoneConflictError } = await anonymousClient.auth.signUp({
    email: duplicatePhoneEmail,
    password,
    options: {
      data: {
        full_name: 'Duplicate Phone',
        phone,
        locale: 'pt-PT',
      },
    },
  });

  if (!phoneConflictError) {
    throw new Error('Duplicate phone signup was not rejected');
  }

  await anonymousClient.auth.signUp({ email, password });

  const { data: users, error: usersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    throw usersError;
  }

  if (users.users.filter((user) => user.email === email).length !== 1) {
    throw new Error('Duplicate email signup created another account');
  }

  const { data: signIn, error: signInError } = await anonymousClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signIn.session) {
    throw signInError ?? new Error('Client sign-in did not create a session');
  }

  console.log('Auth verification passed: signup, conflicts, client role, and sign-in session.');
} finally {
  if (createdUserId) {
    await adminClient.auth.admin.deleteUser(createdUserId);
  }

  const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const duplicatePhoneUser = data?.users.find((user) => user.email === duplicatePhoneEmail);

  if (duplicatePhoneUser) {
    await adminClient.auth.admin.deleteUser(duplicatePhoneUser.id);
  }
}
