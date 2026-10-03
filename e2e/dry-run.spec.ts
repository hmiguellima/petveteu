import { test, expect, login, enrollVet, addPet, addVaccine, card } from './support/fixtures';

test('dry-run mode records pending attempts without calling Twilio', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await request.post('http://127.0.0.1:3101/control', { data: {} });
  await login(page, await clinic.account());
  await addPet(page);
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet);
  await vet.getByRole('button', { name: "Process today's reminders" }).click();
  await expect(vet.getByText(/The reminder batch completed/)).toBeVisible();
  await expect(card(vet, 'Lua')).toContainText('dry run (not sent)');
  expect(await (await request.get('http://127.0.0.1:3101/requests')).json()).toEqual([]);
  const { data: reminders, error } = await clinic.admin
    .from('reminders')
    .select('status,reminder_attempts(outcome,provider_sid)');
  expect(error).toBeNull();
  expect(reminders).toEqual([
    expect.objectContaining({
      status: 'pending',
      reminder_attempts: [expect.objectContaining({ outcome: 'dry_run', provider_sid: null })],
    }),
  ]);
  await context.close();
});
