import {
  test,
  expect,
  login,
  enrollVet,
  addPet,
  addVaccine,
  card,
  dateIn,
  submitAction,
} from './support/fixtures';

test('client profile/contact/consent and pet species CRUD survive reload', async ({
  page,
  clinic,
}) => {
  const client = await clinic.account();
  await login(page, client);
  const profile = page.locator('form').filter({ has: page.getByLabel('Receive SMS reminders') });
  await profile.getByLabel('Full name').fill('Changed Client');
  await profile.getByLabel('Mobile (+…)').fill('+351 923 456 789');
  await profile.getByLabel('Receive SMS reminders').uncheck();
  await profile.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  expect((await clinic.row('client_settings', 'profile_id', client.id)).phone).toBe(
    '+351923456789',
  );
  expect((await clinic.row('client_settings', 'profile_id', client.id)).sms_enabled_by_client).toBe(
    false,
  );
  for (const [name, species] of [
    ['Dog', 'dog'],
    ['Cat', 'cat'],
    ['Rabbit', 'other'],
  ]) {
    await addPet(page, name, species);
  }
  await card(page, 'Cat').getByText('Edit details', { exact: true }).click();
  const edit = card(page, 'Cat')
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save pet' }) });
  await edit.getByLabel('Name', { exact: true }).fill('Updated Cat');
  await edit.getByLabel('Estimated date').check();
  await edit.getByLabel('Breed').fill('European');
  await submitAction(page, edit.getByRole('button', { name: 'Save pet' }));
  await expect(page).toHaveURL(/status=pet-saved/);
  await page.reload();
  await expect(card(page, 'Updated Cat')).toContainText('15');
  await expect(card(page, 'Updated Cat').getByLabel('Reminder expiry age')).toHaveCount(0);
  await card(page, 'Updated Cat').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(card(page, 'Updated Cat')).toHaveCount(0);
  expect((await clinic.row('pets', 'name', 'Updated Cat')).deleted_at).not.toBeNull();
});

test('pet validation and optimistic concurrency prevent invalid and stale writes', async ({
  page,
  clinic,
  context,
}) => {
  await login(page, await clinic.account());
  const add = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add pet', exact: true }) });
  await add.getByLabel('Name', { exact: true }).fill('Future Pet');
  await add.getByLabel('Date of birth').fill(dateIn(1));
  await add.getByRole('button', { name: 'Add pet', exact: true }).click();
  await expect(card(page, 'Future Pet')).toHaveCount(0);
  await addPet(page, 'Concurrent');
  const stale = await context.newPage();
  await stale.goto('/client');
  for (const tab of [page, stale]) {
    await card(tab, 'Concurrent').getByText('Edit details', { exact: true }).click();
  }
  await card(page, 'Concurrent').getByLabel('Breed').fill('First writer');
  await card(page, 'Concurrent').getByRole('button', { name: 'Save pet' }).click();
  await card(stale, 'Concurrent').getByLabel('Breed').fill('Stale writer');
  await card(stale, 'Concurrent').getByRole('button', { name: 'Save pet' }).click();
  await expect(stale.getByText(/O registo foi alterado entretanto/)).toBeVisible();
  expect((await clinic.row('pets', 'name', 'Concurrent')).breed).toBe('First writer');
});

test('vet pet/vaccination CRUD hides soft-deleted records in both portals', async ({
  page,
  clinic,
  browser,
}) => {
  const client = await clinic.account();
  await login(page, client);
  await addPet(page);
  const vetContext = await browser.newContext();
  const vetPage = await vetContext.newPage();
  await enrollVet(vetPage, await clinic.account('vet'));
  await addVaccine(vetPage);
  await page.reload();
  await expect(card(page, 'Lua')).toContainText('Rabies');
  const vaccine = card(vetPage, 'Lua').locator('li').filter({ hasText: 'Rabies' });
  await vaccine.getByText('Edit vaccine', { exact: true }).click();
  await vaccine.getByLabel('Vaccine', { exact: true }).fill('Booster');
  await vaccine.getByLabel('Due date').fill(dateIn(3));
  await vaccine.getByLabel('Notes').fill('Updated clinical notes');
  await vaccine.getByRole('button', { name: 'Save vaccine' }).click();
  await expect(card(vetPage, 'Lua')).toContainText('Updated clinical notes');
  await addVaccine(vetPage, 'Lua', 'Booster', 3);
  await expect(vetPage.getByText(/An active vaccine with the same type/)).toBeVisible();
  await card(vetPage, 'Lua').getByRole('button', { name: 'Remove vaccine' }).click();
  await expect(card(vetPage, 'Lua').getByText('Booster', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(card(page, 'Lua')).not.toContainText('Booster');
  expect(
    (await clinic.row('vaccination_entries', 'vaccine_type', 'Booster')).deleted_at,
  ).not.toBeNull();
  await card(vetPage, 'Lua').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(card(vetPage, 'Lua')).toHaveCount(0);
  await page.reload();
  await expect(card(page, 'Lua')).toHaveCount(0);
  expect((await clinic.row('pets', 'name', 'Lua')).deleted_at).not.toBeNull();
  await vetContext.close();
});
