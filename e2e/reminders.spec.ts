import {
  test,
  expect,
  login,
  enrollVet,
  addPet,
  addVaccine,
  card,
  submitAction,
  dateIn,
  type ClinicFixtures,
} from './support/fixtures';
import type { Page, APIRequestContext } from '@playwright/test';

async function configureMock(request: APIRequestContext, responses: unknown[] = []): Promise<void> {
  const response = await request.post('http://127.0.0.1:3101/control', { data: { responses } });
  expect(response.ok()).toBe(true);
}

async function deliveries(
  request: APIRequestContext,
): Promise<{ To: string; From: string; Body: string }[]> {
  return (await request.get('http://127.0.0.1:3101/requests')).json();
}

async function processReminders(page: Page): Promise<void> {
  await submitAction(
    page,
    page.getByRole('button', { name: "Process today's reminders", exact: true }),
  );
  await expect(page.getByText(/The reminder batch completed/)).toBeVisible();
}

async function attempts(
  clinic: ClinicFixtures,
): Promise<{ outcome: string; reason_code: string | null }[]> {
  const { data, error } = await clinic.admin
    .from('reminder_attempts')
    .select('outcome,reason_code');
  if (error) {
    throw error;
  }

  return data;
}

test('real HTTP Twilio submission, localized body and duplicate run suppression', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await configureMock(request);
  const client = await clinic.account();
  await login(page, client);
  await addPet(page);
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet);
  await processReminders(vet);
  await expect(card(vet, 'Lua')).toContainText('submitted to provider');
  expect(await deliveries(request)).toEqual([
    expect.objectContaining({
      To: client.phone,
      Body: expect.stringContaining("Lua's Rabies vaccination"),
    }),
  ]);
  await submitAction(vet, vet.getByRole('button', { name: "Process today's reminders" }));
  await expect(vet.getByText(/No new batch was started/)).toBeVisible();
  expect(await deliveries(request)).toHaveLength(1);
  expect(await attempts(clinic)).toEqual([{ outcome: 'submitted', reason_code: null }]);
  await clinic.permitNextBatch();
  await processReminders(vet);
  expect(await deliveries(request)).toHaveLength(1);
  await context.close();
});

for (const failure of [
  {
    name: 'transient HTTP',
    response: { status: 503, body: { code: 20429 } },
    reason: 'twilio_transient_20429',
  },
  { name: 'network disconnect', response: { disconnect: true }, reason: 'twilio_network_error' },
]) {
  test(`${failure.name} records failure and retries on a later batch`, async ({
    page,
    clinic,
    browser,
    request,
  }) => {
    await configureMock(request, [failure.response]);
    await login(page, await clinic.account());
    await addPet(page);
    const context = await browser.newContext();
    const vet = await context.newPage();
    await enrollVet(vet, await clinic.account('vet'));
    await addVaccine(vet);
    await processReminders(vet);
    await expect(card(vet, 'Lua')).toContainText('temporary failure');
    expect(await attempts(clinic)).toContainEqual({
      outcome: 'transient_failure',
      reason_code: failure.reason,
    });
    await clinic.permitNextBatch();
    await processReminders(vet);
    await expect(card(vet, 'Lua')).toContainText('submitted to provider');
    expect(await deliveries(request)).toHaveLength(2);
    expect(await attempts(clinic)).toContainEqual({ outcome: 'submitted', reason_code: null });
    await context.close();
  });
}

test('permanent Twilio rejection stays skipped on subsequent batches', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await configureMock(request, [{ status: 400, body: { code: 21211 } }]);
  await login(page, await clinic.account());
  await addPet(page);
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet);
  await processReminders(vet);
  await expect(card(vet, 'Lua')).toContainText('twilio_permanent_21211');
  await clinic.permitNextBatch();
  await processReminders(vet);
  expect(await deliveries(request)).toHaveLength(1);
  expect(await attempts(clinic)).toHaveLength(1);
  await context.close();
});

test('client and clinic opt-outs suppress sends and corrected settings reopen history', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await configureMock(request);
  const client = await clinic.account();
  await login(page, client);
  await addPet(page);
  const profile = page.locator('form').filter({ has: page.getByLabel('Receive SMS reminders') });
  await profile.getByLabel('Receive SMS reminders').uncheck();
  await submitAction(page, profile.getByRole('button', { name: 'Save', exact: true }));
  await expect(page).toHaveURL(/status=profile-saved/);
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet);
  await processReminders(vet);
  await expect(card(vet, 'Lua')).toContainText('client_opt_out');
  expect(await deliveries(request)).toHaveLength(0);
  await profile.getByLabel('Receive SMS reminders').check();
  await submitAction(page, profile.getByRole('button', { name: 'Save', exact: true }));
  await expect(page).toHaveURL(/status=profile-saved/);
  await vet.reload();
  const contact = vet.locator('article').filter({ hasText: client.email });
  await contact.getByLabel('SMS authorized by the clinic').uncheck();
  await submitAction(vet, contact.getByRole('button', { name: 'Save', exact: true }));
  await expect(vet).toHaveURL(/status=client-saved/);
  await clinic.permitNextBatch();
  await processReminders(vet);
  await expect(card(vet, 'Lua')).toContainText('vet_opt_out');
  await contact.getByLabel('SMS authorized by the clinic').check();
  await submitAction(vet, contact.getByRole('button', { name: 'Save', exact: true }));
  await clinic.permitNextBatch();
  await processReminders(vet);
  expect(await deliveries(request)).toHaveLength(1);
  expect(await attempts(clinic)).toHaveLength(3);
  await context.close();
});

test('dual-role missing phone is skipped, then saving contact allows submission', async ({
  page,
  clinic,
  request,
}) => {
  await configureMock(request);
  const vet = await clinic.account('vet');
  await enrollVet(page, vet);
  await page.getByLabel('I have been shown the current privacy notice').check();
  await page.getByRole('button', { name: 'Activate my client area' }).click();
  await addPet(page);
  await page.getByRole('link', { name: 'Open clinic portal' }).click();
  await addVaccine(page);
  await processReminders(page);
  await expect(card(page, 'Lua')).toContainText('invalid_phone');
  expect(await deliveries(request)).toHaveLength(0);
  await page.getByRole('link', { name: 'Open personal client area' }).click();
  const form = page.locator('form').filter({ has: page.getByLabel('Receive SMS reminders') });
  await form.getByLabel('Mobile (+…)').fill(vet.phone);
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Open clinic portal' }).click();
  await clinic.permitNextBatch();
  await processReminders(page);
  expect(await deliveries(request)).toHaveLength(1);
  expect(await attempts(clinic)).toHaveLength(2);
});

test('date window, expiry age and removed pet/vaccine suppress provider requests', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await configureMock(request);
  await login(page, await clinic.account());
  for (const name of ['Historical', 'Future', 'Expired', 'Removed pet', 'Removed vaccine']) {
    await addPet(page, name);
  }
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet, 'Historical', 'History', -1);
  await addVaccine(vet, 'Future', 'Later', 3);
  await addVaccine(vet, 'Expired', 'Expiry');
  await card(vet, 'Expired').getByText('Edit pet', { exact: true }).click();
  await card(vet, 'Expired').getByLabel('Reminder expiry age').fill('1');
  await card(vet, 'Expired').getByRole('button', { name: 'Save pet' }).click();
  await addVaccine(vet, 'Removed pet', 'Deleted owner');
  await card(vet, 'Removed pet').getByRole('button', { name: 'Remove', exact: true }).click();
  await addVaccine(vet, 'Removed vaccine', 'Deleted schedule');
  await card(vet, 'Removed vaccine').getByRole('button', { name: 'Remove vaccine' }).click();
  await processReminders(vet);
  expect(await deliveries(request)).toHaveLength(0);
  await expect(card(vet, 'Expired')).toContainText('age_expired');
  const outcomes = await attempts(clinic);
  expect(outcomes).toContainEqual({ outcome: 'permanent_skip', reason_code: 'age_expired' });
  expect(outcomes.some((attempt) => attempt.outcome === 'submitted')).toBe(false);
  await context.close();
});

test('rescheduling cancels a pending reminder, preserves attempts and submits the new Portuguese schedule', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await configureMock(request, [{ status: 503 }]);
  const client = await clinic.account();
  await login(page, client);
  await addPet(page);
  const profile = page.locator('form').filter({ has: page.getByLabel('Receive SMS reminders') });
  await profile.getByRole('combobox', { name: 'Language', exact: true }).selectOption('pt-PT');
  await submitAction(page, profile.getByRole('button', { name: 'Save', exact: true }));
  await expect(page).toHaveURL(/status=profile-saved/);
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet);
  await processReminders(vet);
  const vaccine = await clinic.row('vaccination_entries', 'vaccine_type', 'Rabies');
  const edit = card(vet, 'Lua').locator('li').filter({ hasText: 'Rabies' });
  await edit.getByText('Edit vaccine', { exact: true }).click();
  await edit.getByLabel('Due date').fill(dateIn(1));
  await submitAction(vet, edit.getByRole('button', { name: 'Save vaccine' }));
  await expect(vet).toHaveURL(/status=vaccine-saved/);
  const oldReminder = await clinic.admin
    .from('reminders')
    .select('status')
    .eq('vaccination_entry_id', vaccine.id)
    .eq('due_date', dateIn(2))
    .single();
  expect(oldReminder.error).toBeNull();
  expect(oldReminder.data?.status).toBe('cancelled');
  await clinic.permitNextBatch();
  await processReminders(vet);
  const requests = await deliveries(request);
  expect(requests).toHaveLength(2);
  expect(requests[1].Body).toContain('Lua tem a vacina Rabies');
  const newReminder = await clinic.admin
    .from('reminders')
    .select('status')
    .eq('vaccination_entry_id', vaccine.id)
    .eq('due_date', dateIn(1))
    .single();
  expect(newReminder.error).toBeNull();
  expect(newReminder.data?.status).toBe('submitted');
  expect(await attempts(clinic)).toHaveLength(2);
  await context.close();
});
