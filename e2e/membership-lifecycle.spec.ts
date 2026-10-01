import { test, expect, enrollVet, login, addPet, card, submitAction } from './support/fixtures';
import { totp } from './support/totp';
import type { Page } from '@playwright/test';

async function invite(page: Page, email: string): Promise<void> {
  await page.getByLabel('Vet email', { exact: true }).fill(email);
  await submitAction(
    page,
    page
      .locator('form')
      .filter({ has: page.getByLabel('Vet email', { exact: true }) })
      .getByRole('button', { name: 'Send invitation' }),
  );
  await expect(page).toHaveURL(/status=vet-invite/);
}

test('revoked dual-role client completes real MFA reinstatement and preserves its pets', async ({
  page,
  clinic,
  browser,
}) => {
  const client = await clinic.account();
  const context = await browser.newContext();
  const personal = await context.newPage();
  await login(personal, client);
  await addPet(personal, 'Restored pet');
  await enrollVet(page, await clinic.account('vet'));
  await invite(page, client.email);
  await personal.goto('/vet');
  await expect(personal).toHaveURL(/\/mfa/);
  const secret = (await personal.locator('code').innerText()).trim();
  const firstCode = totp(secret);
  await personal.getByLabel('Six-digit code').fill(firstCode);
  await personal.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(personal).toHaveURL(/\/vet/);
  await page.reload();
  await submitAction(
    page,
    page
      .locator('li')
      .filter({ hasText: client.email })
      .filter({ has: page.getByRole('button', { name: 'Revoke access' }) })
      .getByRole('button', { name: 'Revoke access' }),
  );
  await expect(page).toHaveURL(/status=vet-revoke/);
  await personal.goto('/vet');
  await expect(personal).toHaveURL(/\/sign-in/);
  await invite(page, client.email);
  await login(personal, client);
  await expect(personal).toHaveURL(/\/mfa/);
  await expect(personal.locator('code')).toHaveCount(0);
  await expect.poll(() => totp(secret), { timeout: 35_000 }).not.toBe(firstCode);
  await personal.getByLabel('Six-digit code').fill(totp(secret));
  await personal.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(personal).toHaveURL(/\/vet/);
  expect((await clinic.row('vet_access', 'profile_id', client.id)).status).toBe('active');
  await page.reload();
  await expect(page.getByText(/was reinstated as a veterinary owner/)).toBeVisible();
  await personal.getByRole('link', { name: 'Open personal client area' }).click();
  await expect(card(personal, 'Restored pet')).toBeVisible();
  await context.close();
});

test('expired veterinary invitation cannot grant access and preserves the existing client role', async ({
  page,
  clinic,
  browser,
}) => {
  const client = await clinic.account();
  await enrollVet(page, await clinic.account('vet'));
  await invite(page, client.email);
  const expiration = await clinic.admin
    .from('vet_invitations')
    .update({
      created_at: new Date(Date.now() - 8 * 86_400_000).toISOString(),
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    })
    .eq('profile_id', client.id);
  expect(expiration.error).toBeNull();
  const context = await browser.newContext();
  const personal = await context.newPage();
  await login(personal, client);
  const secret = (await personal.locator('code').innerText()).trim();
  await personal.getByLabel('Six-digit code').fill(totp(secret));
  await personal.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(personal).toHaveURL(/\/client/);
  expect((await clinic.row('vet_invitations', 'profile_id', client.id)).status).toBe('expired');
  const { data, error } = await clinic.admin
    .from('account_roles')
    .select('role')
    .eq('profile_id', client.id);
  expect(error).toBeNull();
  expect(data).toEqual([{ role: 'client' }]);
  await personal.goto('/vet');
  await expect(personal).toHaveURL(/\/client/);
  await context.close();
});
