import { createClient } from '@supabase/supabase-js';
import { test, expect, login, addPet } from './support/fixtures';

test('authenticated client cannot read foreign records, mutate vaccines or invoke veterinary operations', async ({
  page,
  clinic,
}) => {
  const owner = await clinic.account();
  await login(page, owner);
  await addPet(page, 'Private record');
  const pet = await clinic.row('pets', 'name', 'Private record');
  const outsider = await clinic.account();
  const caller = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await caller.auth.signInWithPassword({
    email: outsider.email,
    password: outsider.password,
  });
  expect(error).toBeNull();
  const foreign = await caller.from('pets').select('id').eq('id', pet.id);
  expect(foreign.error).toBeNull();
  expect(foreign.data).toEqual([]);
  const mutation = await caller.rpc('vet_remove_pet', { p_id: pet.id, p_version: 1 });
  expect(mutation.error).not.toBeNull();
  const write = await caller
    .from('vaccination_entries')
    .insert({ pet_id: pet.id, vaccine_type: 'Unauthorized', due_date: '2026-10-03' });
  expect(write.error).not.toBeNull();
  for (const operation of ['reminders', 'admin-vets', 'admin-clients']) {
    const response = await page.request.post(
      `${process.env.E2E_SUPABASE_URL}/functions/v1/${operation}`,
      {
        headers: { Authorization: `Bearer ${data.session!.access_token}` },
        data: { operation: 'invite', email: clinic.email('denied'), source: 'manual' },
      },
    );
    expect(response.status()).toBe(403);
  }
  expect((await clinic.row('pets', 'name', 'Private record')).deleted_at).toBeNull();
});

test('vet password session without MFA cannot read clinic records or process reminders', async ({
  page,
  clinic,
}) => {
  const vet = await clinic.account('vet');
  const caller = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await caller.auth.signInWithPassword({
    email: vet.email,
    password: vet.password,
  });
  expect(error).toBeNull();
  const profiles = await caller.from('profiles').select('id');
  expect(profiles.data?.every((profile: { id: string }) => profile.id === vet.id)).toBe(true);
  const response = await page.request.post(
    `${process.env.E2E_SUPABASE_URL}/functions/v1/reminders`,
    {
      headers: { Authorization: `Bearer ${data.session!.access_token}` },
      data: { source: 'manual' },
    },
  );
  expect(response.status()).toBe(403);
  await login(page, vet);
  await expect(page).toHaveURL(/\/mfa/);
});
