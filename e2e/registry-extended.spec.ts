import {
  test,
  expect,
  login,
  enrollVet,
  addPet,
  addVaccine,
  card,
  dateIn,
} from './support/fixtures';
import type { Page, Locator } from '@playwright/test';

test('veterinary pet creation and expiry editing are visible but read-only to the client', async ({
  page,
  clinic,
  browser,
}) => {
  const client = await clinic.account();
  await enrollVet(page, await clinic.account('vet'));
  const owner = page.locator('article').filter({ hasText: client.email });
  await owner.locator('summary').filter({ hasText: 'Add pet' }).click();
  const add = owner
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add pet', exact: true }) });
  await add.getByLabel('Name', { exact: true }).fill('Clinic created');
  await add.getByRole('combobox').selectOption('dog');
  await add.getByLabel('Date of birth').fill('2022-01-10');
  await add.getByRole('button', { name: 'Add pet', exact: true }).click();
  await expect(card(page, 'Clinic created')).toBeVisible();
  await card(page, 'Clinic created').getByText('Edit pet', { exact: true }).click();
  await card(page, 'Clinic created').getByLabel('Reminder expiry age').fill('12');
  await card(page, 'Clinic created').getByRole('button', { name: 'Save pet' }).click();
  await expect(page).toHaveURL(/status=pet-saved/);
  const context = await browser.newContext();
  const personal = await context.newPage();
  await login(personal, client);
  await expect(card(personal, 'Clinic created')).toContainText('12');
  await expect(card(personal, 'Clinic created').getByLabel('Reminder expiry age')).toHaveCount(0);
  await context.close();
});

test('vaccination dates and stale concurrent edits cannot overwrite clinical notes', async ({
  page,
  clinic,
  browser,
}) => {
  await login(page, await clinic.account());
  await addPet(page);
  const vetContext = await browser.newContext();
  const vet = await vetContext.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await addVaccine(vet);
  const stale = await vetContext.newPage();
  await stale.goto('/vet');
  for (const tab of [vet, stale]) {
    await card(tab, 'Lua').getByText('Edit vaccine', { exact: true }).click();
  }
  const edit = (tab: Page): Locator => card(tab, 'Lua').locator('li').filter({ hasText: 'Rabies' });
  await edit(vet).getByLabel('Notes').fill('First clinical writer');
  await edit(vet).getByRole('button', { name: 'Save vaccine' }).click();
  await expect(card(vet, 'Lua')).toContainText('First clinical writer');
  await edit(stale).getByLabel('Notes').fill('Stale clinical writer');
  await edit(stale).getByRole('button', { name: 'Save vaccine' }).click();
  await expect(stale).toHaveURL(/error=stale/);
  await expect(card(stale, 'Lua')).toContainText('First clinical writer');
  await vet.reload();
  await card(vet, 'Lua').getByText('Edit vaccine', { exact: true }).click();
  await edit(vet).getByLabel('Last administered').fill(dateIn(3));
  await edit(vet).getByRole('button', { name: 'Save vaccine' }).click();
  await expect(vet).toHaveURL(/error=invalid-vaccine/);
  await vetContext.close();
});

test('client language preference persists in profile, browser cookie and subsequent sign-in', async ({
  page,
  clinic,
  browser,
}) => {
  const client = await clinic.account();
  await login(page, client);
  const form = page.locator('form').filter({ has: page.getByLabel('Receive SMS reminders') });
  await form.getByRole('combobox', { name: 'Language', exact: true }).selectOption('pt-PT');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/status=profile-saved/);
  await expect(page.getByRole('heading', { name: 'O meu perfil', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'O meu perfil', exact: true })).toBeVisible();
  const context = await browser.newContext();
  const returning = await context.newPage();
  await returning.goto('/sign-in');
  await returning.getByLabel('Email', { exact: true }).fill(client.email);
  await returning.getByLabel('Palavra-passe').fill(client.password);
  await returning.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(returning.getByRole('heading', { name: 'O meu perfil', exact: true })).toBeVisible();
  await context.close();
});
