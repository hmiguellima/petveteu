/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/typedef */
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const requiredEnvironmentVariables = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing ${variableName}`);
  }
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
  throw new Error('The end-to-end smoke test is restricted to local Supabase');
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const verificationId = Date.now();
const email = `e2e-smoke-${verificationId}@example.test`;
const password = 'Local-e2e-password-1';
const testPhone = '+15005550006';
const createdPetIds = [];
const createdVaccinationIds = [];
const createdReminderIds = [];
const createdRunIds = [];
let createdUserId;

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createVetToken(vetId) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeJwtPart({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJwtPart({
    aal: 'aal2',
    amr: [{ method: 'totp', timestamp: issuedAt }],
    aud: 'authenticated',
    exp: issuedAt + 300,
    iat: issuedAt,
    iss: `${process.env.SUPABASE_URL}/auth/v1`,
    role: 'authenticated',
    sub: vetId,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

function lisbonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
  }).formatToParts();
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date, numberOfDays) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + numberOfDays);

  return result.toISOString().slice(0, 10);
}

function assertNoError(error) {
  if (error) {
    throw error;
  }
}

async function invokeReminderBatch(vetToken) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/reminders`, {
    body: JSON.stringify({ source: 'manual' }),
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${vetToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Reminder batch failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

async function rememberCurrentRun(businessDate) {
  const { data, error } = await admin
    .from('reminder_job_runs')
    .select('id')
    .eq('business_date', businessDate)
    .eq('trigger_source', 'manual')
    .single();
  assertNoError(error);
  createdRunIds.push(data.id);
}

async function loadAttempts() {
  const { data: reminders, error: reminderError } = await admin
    .from('reminders')
    .select('id,vaccination_entry_id')
    .in('vaccination_entry_id', createdVaccinationIds);
  assertNoError(reminderError);

  for (const reminder of reminders) {
    if (!createdReminderIds.includes(reminder.id)) {
      createdReminderIds.push(reminder.id);
    }
  }

  const reminderIds = reminders.map((reminder) => reminder.id);
  if (reminderIds.length === 0) {
    return { attempts: [], reminders };
  }

  const { data: attempts, error: attemptError } = await admin
    .from('reminder_attempts')
    .select('reminder_id,outcome,reason_code,provider_sid')
    .in('reminder_id', reminderIds);
  assertNoError(attemptError);

  return { attempts, reminders };
}

async function clearBatchArtifacts() {
  if (createdReminderIds.length > 0) {
    assertNoError(
      (await admin.from('reminder_attempts').delete().in('reminder_id', createdReminderIds)).error,
    );
    assertNoError((await admin.from('reminders').delete().in('id', createdReminderIds)).error);
    createdReminderIds.length = 0;
  }

  if (createdRunIds.length > 0) {
    assertNoError((await admin.from('reminder_job_runs').delete().in('id', createdRunIds)).error);
    createdRunIds.length = 0;
  }
}

const businessDate = lisbonDate();

try {
  const { count: existingRunCount, error: existingRunError } = await admin
    .from('reminder_job_runs')
    .select('*', { count: 'exact', head: true })
    .eq('business_date', businessDate);
  assertNoError(existingRunError);

  if (existingRunCount) {
    throw new Error(
      `A reminder run already exists for ${businessDate}; use a clean local database`,
    );
  }

  const { data: vet, error: vetError } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'vet')
    .single();
  assertNoError(vetError);
  const vetToken = createVetToken(vet.id);
  const vetClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${vetToken}` } },
  });

  const { data: signup, error: signupError } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'E2E Smoke Client',
        locale: 'pt-PT',
        phone: testPhone,
      },
    },
  });
  assertNoError(signupError);

  if (!signup.user || !signup.session) {
    throw new Error('Local client registration did not create an authenticated session');
  }
  createdUserId = signup.user.id;

  for (const pet of [
    { breed: 'Labrador', name: 'Lume', species: 'dog' },
    { breed: 'Europeu', name: 'Lua', species: 'cat' },
  ]) {
    const { data, error } = await client.rpc('client_create_pet', {
      p_birth: '2022-01-10',
      p_breed: pet.breed,
      p_estimated: false,
      p_name: pet.name,
      p_other_species: null,
      p_species: pet.species,
    });
    assertNoError(error);
    createdPetIds.push(data.id);
  }

  const dueDates = [addDays(businessDate, 2), addDays(businessDate, 1)];
  for (const [index, petId] of createdPetIds.entries()) {
    const { data, error } = await vetClient.rpc('vet_save_vaccination', {
      p_admin: null,
      p_due: dueDates[index],
      p_id: null,
      p_notes: 'Local end-to-end smoke fixture',
      p_pet_id: petId,
      p_type: index === 0 ? 'Raiva' : 'Reforço anual',
      p_version: 0,
    });
    assertNoError(error);
    createdVaccinationIds.push(data.id);
  }

  await invokeReminderBatch(vetToken);
  await rememberCurrentRun(businessDate);
  const firstBatch = await loadAttempts();
  const dryRuns = firstBatch.attempts.filter((attempt) => attempt.outcome === 'dry_run');

  if (firstBatch.reminders.length !== 2 || dryRuns.length !== 2) {
    throw new Error('Expected one dry-run reminder attempt for each due vaccination entry');
  }
  if (dryRuns.some((attempt) => attempt.provider_sid !== null)) {
    throw new Error('Dry-run attempts must not contain provider message identifiers');
  }
  if (new Set(dryRuns.map((attempt) => attempt.reminder_id)).size !== 2) {
    throw new Error('Dry-run attempts were not unique per due vaccination entry');
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('full_name,phone,locale,version')
    .eq('id', createdUserId)
    .single();
  assertNoError(profileError);
  assertNoError(
    (
      await client.rpc('update_my_profile', {
        p_locale: profile.locale,
        p_full_name: profile.full_name,
        p_phone: profile.phone,
        p_sms: false,
        p_version: profile.version,
      })
    ).error,
  );

  await clearBatchArtifacts();
  await invokeReminderBatch(vetToken);
  await rememberCurrentRun(businessDate);
  const optedOutBatch = await loadAttempts();
  const deliverableAttempts = optedOutBatch.attempts.filter((attempt) =>
    ['dry_run', 'submitted'].includes(attempt.outcome),
  );
  const optOutSkips = optedOutBatch.attempts.filter(
    (attempt) => attempt.outcome === 'permanent_skip' && attempt.reason_code === 'client_opt_out',
  );

  if (deliverableAttempts.length !== 0 || optOutSkips.length !== 2) {
    throw new Error('Client opt-out did not suppress both reminder submissions');
  }

  console.log(
    'End-to-end smoke passed: registration, two pets, two schedules, dry-run attempts, and client opt-out.',
  );
} finally {
  await clearBatchArtifacts();

  if (createdVaccinationIds.length > 0) {
    await admin.from('vaccination_entries').delete().in('id', createdVaccinationIds);
  }
  if (createdPetIds.length > 0) {
    await admin.from('pets').delete().in('id', createdPetIds);
  }
  if (createdUserId) {
    await admin.auth.admin.deleteUser(createdUserId);
  }
}
