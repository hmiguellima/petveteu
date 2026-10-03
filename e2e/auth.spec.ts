import { test, expect, english, login, enrollVet, addPet, card } from './support/fixtures';
import { totp } from './support/totp';

test('public pages, language switching, privacy and anonymous route protection', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Cuidados veterinários, sem esquecimentos' }),
  ).toBeVisible();
  await english(page);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy notice', exact: true })).toBeVisible();
  for (const route of ['/client', '/vet', '/mfa']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in/);
  }
});

test('browser registration, invalid phone, duplicate identity and password sign-in', async ({
  page,
  clinic,
  browser,
}) => {
  await english(page);
  const email = clinic.email('registered');
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Registered Browser Client');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mobile (+…)').fill('invalid');
  await page.getByLabel('Password').fill('Local-Browser-Test-123!');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Check the information' })).toBeVisible();
  await page.getByLabel('Full name').fill('Registered Browser Client');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mobile (+…)').fill('+351912345678');
  await page.getByLabel('Password').fill('Local-Browser-Test-123!');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/client/);
  const profile = await clinic.profile(email);
  const settings = await clinic.row('client_settings', 'profile_id', profile.id);
  expect(settings.phone).toBe('+351912345678');
  const context = await browser.newContext();
  const second = await context.newPage();
  await english(second);
  await second.goto('/register');
  await second.getByLabel('Full name').fill('Duplicate');
  await second.getByLabel('Email', { exact: true }).fill(clinic.email('duplicate'));
  await second.getByLabel('Mobile (+…)').fill('+351912345678');
  await second.getByLabel('Password').fill('Local-Browser-Test-123!');
  await second.getByRole('button', { name: 'Create account' }).click();
  await expect(second.getByRole('alert').filter({ hasText: /already exists/ })).toBeVisible();
  await second.goto('/sign-in');
  await second.getByLabel('Email', { exact: true }).fill(email);
  await second.getByLabel('Password').fill('wrong-password');
  await second.getByRole('button', { name: 'Sign in' }).click();
  await expect(second.getByText('Incorrect email or password.')).toBeVisible();
  await login(second, {
    id: profile.id,
    email,
    password: 'Local-Browser-Test-123!',
    name: profile.full_name,
    phone: settings.phone!,
  });
  await expect(
    second.getByText('Registered Browser Client', { exact: true }).first(),
  ).toBeVisible();
  await context.close();
});

test('client cannot enter vet portal or read another client pets', async ({ page, clinic }) => {
  const owner = await clinic.account();
  const outsider = await clinic.account();
  await login(page, owner);
  await addPet(page, 'Private pet');
  await page.context().clearCookies();
  await login(page, outsider);
  await expect(card(page, 'Private pet')).toHaveCount(0);
  await page.goto('/vet');
  await expect(page).toHaveURL(/\/client/);
  const response = await page.request.post(
    `${process.env.E2E_SUPABASE_URL}/functions/v1/reminders`,
    { data: { source: 'manual' } },
  );
  expect(response.status()).toBe(403);
});

test('real vet MFA enrollment, invalid challenge and returning-session challenge', async ({
  page,
  clinic,
  browser,
}) => {
  const account = await clinic.account('vet');
  await login(page, account);
  await expect(page).toHaveURL(/\/mfa/);
  const secret = (await page.locator('code').innerText()).trim();
  await page.getByLabel('Six-digit code').fill('000000');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: /code could not be verified/ }),
  ).toBeVisible();
  await page.getByLabel('Six-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(/\/vet/);
  expect((await clinic.row('vet_access', 'profile_id', account.id)).status).toBe('active');
  const context = await browser.newContext();
  const returning = await context.newPage();
  await login(returning, account);
  await expect(returning).toHaveURL(/\/mfa/);
  await expect(returning.locator('code')).toHaveCount(0);
  // Wait for the next TOTP counter: GoTrue rejects replay of an already-used code.
  await expect.poll(() => totp(secret), { timeout: 35_000 }).not.toBe(totp(secret));
  await returning.getByLabel('Six-digit code').fill(totp(secret));
  await returning.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(returning).toHaveURL(/\/vet/);
  await context.close();
});

test('dual-role activation, empty deactivation, shared identity and portal switching', async ({
  page,
  clinic,
}) => {
  const vet = await clinic.account('vet');
  await enrollVet(page, vet);
  await page.getByLabel('I have been shown the current privacy notice').check();
  await page.getByRole('button', { name: 'Activate my client area' }).click();
  await expect(page).toHaveURL(/\/client/);
  expect((await clinic.row('client_settings', 'profile_id', vet.id)).phone).toBeNull();
  await page.getByRole('button', { name: 'Deactivate my client area' }).click();
  await expect(page).toHaveURL(/\/vet/);
  await page.getByLabel('I have been shown the current privacy notice').check();
  await page.getByRole('button', { name: 'Activate my client area' }).click();
  await addPet(page, 'Dual role pet');
  await page.getByRole('button', { name: 'Deactivate my client area' }).click();
  await expect(page.getByText(/Client-area records still exist/)).toBeVisible();
  await page.getByRole('link', { name: 'Open clinic portal' }).click();
  await expect(card(page, 'Dual role pet')).toBeVisible();
  await page.getByRole('link', { name: 'Open personal client area' }).click();
  await expect(card(page, 'Dual role pet')).toBeVisible();
});
