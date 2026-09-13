/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/typedef */
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

const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anonymousClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const password = 'Local-verification-password-1';
const verificationId = Date.now();
const vetEmail = `admin-vet-${verificationId}@example.test`;
const clientEmail = `admin-client-${verificationId}@example.test`;
const changedEmail = `admin-client-changed-${verificationId}@example.test`;
const invitedEmail = `admin-invited-${verificationId}@example.test`;
const injectedEmail = `admin-injected-${verificationId}@example.test`;
const createdUserIds = [];
let vetUserId;

async function createConfirmedUser(email, fullName, phone) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, locale: 'pt-PT' },
  });

  if (error) {
    throw error;
  }

  createdUserIds.push(data.user.id);

  return data.user;
}

async function signIn(email) {
  const { data, error } = await anonymousClient.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw error ?? new Error(`Could not sign in ${email}`);
  }

  return data.session.access_token;
}

async function invoke(accessToken, body) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/admin-clients`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return { response, body: await response.json() };
}

try {
  const vet = await createConfirmedUser(vetEmail, 'Verification Vet', null);
  vetUserId = vet.id;
  const client = await createConfirmedUser(clientEmail, 'Verification Client', '+351912345671');

  const { error: promoteError } = await adminClient
    .from('profiles')
    .update({ role: 'vet' })
    .eq('id', vet.id);

  if (promoteError) {
    throw promoteError;
  }

  const vetToken = await signIn(vetEmail);
  const clientToken = await signIn(clientEmail);

  const clientAttempt = await invoke(clientToken, {
    operation: 'resend',
    clientId: client.id,
  });

  if (clientAttempt.response.status !== 403) {
    throw new Error('Client administrative call was not forbidden');
  }

  const roleInjection = await invoke(vetToken, {
    operation: 'invite',
    email: injectedEmail,
    fullName: 'Injected Vet',
    phone: '+351912345672',
    locale: 'pt-PT',
    role: 'vet',
  });

  if (roleInjection.response.status !== 400) {
    throw new Error('Role-bearing administrative payload was not rejected');
  }

  const vetTargetAttempt = await invoke(vetToken, {
    operation: 'change_email',
    clientId: vet.id,
    email: injectedEmail,
  });

  if (vetTargetAttempt.response.status !== 400) {
    throw new Error('Vet target was not rejected');
  }

  const emailChange = await invoke(vetToken, {
    operation: 'change_email',
    clientId: client.id,
    email: changedEmail,
  });

  if (!emailChange.response.ok) {
    throw new Error(`Client email change failed: ${emailChange.body.error}`);
  }

  const { data: changedProfile } = await adminClient
    .from('profiles')
    .select('email,role')
    .eq('id', client.id)
    .single();

  if (changedProfile?.email !== changedEmail || changedProfile.role !== 'client') {
    throw new Error('Canonical email change did not preserve and synchronize the client role');
  }

  const invitation = await invoke(vetToken, {
    operation: 'invite',
    email: invitedEmail,
    fullName: 'Invited Client',
    phone: '+351912345673',
    locale: 'en',
  });

  if (!invitation.response.ok || !invitation.body.targetId) {
    throw new Error(`Client invitation failed: ${invitation.body.error}`);
  }

  createdUserIds.push(invitation.body.targetId);

  const invitationResend = await invoke(vetToken, {
    operation: 'resend',
    clientId: invitation.body.targetId,
  });

  if (!invitationResend.response.ok) {
    throw new Error(`Invitation resend failed: ${invitationResend.body.error}`);
  }

  const { data: invitedProfile } = await adminClient
    .from('profiles')
    .select('email,locale,role')
    .eq('id', invitation.body.targetId)
    .single();

  if (
    invitedProfile?.email !== invitedEmail ||
    invitedProfile.locale !== 'en' ||
    invitedProfile.role !== 'client'
  ) {
    throw new Error('Invitation did not create the expected client profile');
  }

  const { count: auditCount } = await adminClient
    .from('admin_audit_events')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', vet.id);

  if (auditCount !== 3) {
    throw new Error('Successful administrative operations were not audited');
  }

  console.log(
    'Admin verification passed: vet boundary, client targets, invite, email, resend, audit.',
  );
} finally {
  if (vetUserId) {
    await adminClient.from('admin_audit_events').delete().eq('actor_id', vetUserId);
  }

  for (const userId of createdUserIds.reverse()) {
    await adminClient.auth.admin.deleteUser(userId);
  }
}
