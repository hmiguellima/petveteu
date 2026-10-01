import { test, expect, enrollVet, login, addPet, card, submitAction } from './support/fixtures';
import { invitationLink, acceptInvitation } from './support/mail';
import { totp } from './support/totp';

test('vet invitation resend/cancel, real email acceptance, notifications and revocation', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await enrollVet(page, await clinic.account('vet'));
  await expect(page.getByText('The last active veterinary owner cannot be revoked.')).toBeVisible();
  const email = clinic.email('invited-vet');
  await page.getByLabel('Vet email', { exact: true }).fill(email);
  await page
    .locator('form')
    .filter({ has: page.getByLabel('Vet email', { exact: true }) })
    .getByRole('button', { name: 'Send invitation' })
    .click();
  await expect(page.getByText(/Invitation sent. The vet role/)).toBeVisible();
  const invited = await clinic.profile(email);
  const pending = page.locator('li').filter({ hasText: email });
  await pending.getByRole('button', { name: 'Resend', exact: true }).click();
  await expect(page.getByText(/Invitation resent/)).toBeVisible();
  const link = await invitationLink(request, email);
  const context = await browser.newContext();
  const second = await context.newPage();
  await acceptInvitation(second, link);
  await expect(second).toHaveURL(/\/mfa/);
  const secret = (await second.locator('code').innerText()).trim();
  await second.getByLabel('Full name').fill('Invited Vet');
  await second.getByRole('combobox', { name: 'Language', exact: true }).selectOption('en');
  await second.getByLabel('Six-digit code').fill(totp(secret));
  await second.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(second).toHaveURL(/\/vet/);
  expect((await clinic.row('vet_invitations', 'profile_id', invited.id)).status).toBe('accepted');
  await page.reload();
  await expect(page.getByText(/Invited Vet became an active veterinary owner/)).toBeVisible();
  const notification = page
    .locator('li')
    .filter({ hasText: /Invited Vet became an active veterinary owner/ });
  await notification.getByRole('button', { name: 'Mark as read' }).click();
  await expect(notification.getByRole('button', { name: 'Mark as read' })).toHaveCount(0);
  await second.getByLabel('I have been shown the current privacy notice').check();
  await second.getByRole('button', { name: 'Activate my client area' }).click();
  await expect(second).toHaveURL(/\/client/);
  await addPet(second, 'Preserved pet');
  await page.reload();
  const target = page
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'Revoke access' }) })
    .filter({ hasText: email });
  await target.getByRole('button', { name: 'Revoke access' }).click();
  await expect(page.getByText('Veterinary access was revoked.')).toBeVisible();
  await second.goto('/vet');
  await expect(second).toHaveURL(/\/sign-in/);
  expect((await clinic.row('pets', 'name', 'Preserved pet')).deleted_at).toBeNull();
  await page.getByLabel('Vet email', { exact: true }).fill(email);
  await page
    .locator('form')
    .filter({ has: page.getByLabel('Vet email', { exact: true }) })
    .getByRole('button', { name: 'Send invitation' })
    .click();
  await expect(page.getByText(/Invitation sent. The vet role/)).toBeVisible();
  expect((await clinic.row('vet_access', 'profile_id', invited.id)).status).toBe('pending_mfa');
  await page
    .locator('li')
    .filter({ hasText: email })
    .filter({ has: page.getByRole('button', { name: 'Cancel', exact: true }) })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(page.getByText('Invitation cancelled.')).toBeVisible();
  await context.close();
});

test('vet client invitation, contact editing, email change request and client invite acceptance', async ({
  page,
  clinic,
  browser,
  request,
}) => {
  await enrollVet(page, await clinic.account('vet'));
  const email = clinic.email('invited-client');
  await page.getByText('Add client', { exact: true }).click();
  const invite = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Send invitation', exact: true }) })
    .filter({ has: page.getByLabel('Mobile (+…)') });
  await invite.getByLabel('Full name').fill('Invited Client');
  await invite.getByLabel('Email', { exact: true }).fill(email);
  await invite.getByLabel('Mobile (+…)').fill('+351934567890');
  await invite.getByRole('combobox', { name: 'Language', exact: true }).selectOption('en');
  const invitationSentAt = Date.now();
  await invite.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.locator('article').filter({ hasText: email })).toBeVisible();
  const profile = await clinic.profile(email);
  const pendingContact = page.locator('article').filter({ hasText: email });
  await pendingContact.getByText('Access and email', { exact: true }).click();
  await expect.poll(() => Date.now() - invitationSentAt).toBeGreaterThan(1000);
  await submitAction(
    page,
    pendingContact.getByRole('button', { name: 'Resend invitation', exact: true }),
  );
  await expect(page).toHaveURL(/status=invite-resent/);
  const context = await browser.newContext();
  const clientPage = await context.newPage();
  await acceptInvitation(clientPage, await invitationLink(request, email));
  await expect(clientPage.getByRole('heading', { name: 'My profile' })).toBeVisible();
  const contact = page.locator('article').filter({ hasText: email });
  await contact.getByLabel('Full name').fill('Clinic Updated Client');
  await contact.getByLabel('Mobile (+…)').fill('+351945678901');
  await contact.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/status=client-saved/);
  expect((await clinic.row('client_settings', 'profile_id', profile.id)).phone).toBe(
    '+351945678901',
  );
  await clientPage.reload();
  await expect(clientPage.getByLabel('Full name')).toHaveValue('Clinic Updated Client');
  await page.reload();
  await contact.getByText('Access and email', { exact: true }).click();
  const changedEmail = clinic.email('changed-client');
  await contact.getByLabel('New email').fill(changedEmail);
  await submitAction(
    page,
    contact.getByRole('button', { name: 'Change sign-in email', exact: true }),
  );
  await expect(page.getByText('Operation completed.')).toBeVisible();
  const { data } = await clinic.admin.auth.admin.getUserById(profile.id);
  expect(data.user?.email === changedEmail || data.user?.new_email === changedEmail).toBe(true);
  await context.close();
});

test('a client invited as vet keeps its client records and other vets cannot edit shared identity', async ({
  page,
  clinic,
  browser,
}) => {
  const client = await clinic.account();
  await login(page, client);
  await addPet(page, 'Existing client pet');
  const context = await browser.newContext();
  const vet = await context.newPage();
  await enrollVet(vet, await clinic.account('vet'));
  await vet.getByLabel('Vet email', { exact: true }).fill(client.email);
  await vet
    .locator('form')
    .filter({ has: vet.getByLabel('Vet email', { exact: true }) })
    .getByRole('button', { name: 'Send invitation' })
    .click();
  await expect(vet.getByText(/Invitation sent. The vet role/)).toBeVisible();
  const clientCard = vet.locator('article').filter({ hasText: client.email });
  await expect(clientCard.getByLabel('Full name')).toHaveAttribute('readonly', '');
  await expect(clientCard.getByRole('combobox', { name: 'Language', exact: true })).toBeDisabled();
  await expect(card(vet, 'Existing client pet')).toBeVisible();
  await expect(clientCard.getByText('Access and email', { exact: true })).toHaveCount(0);
  await context.close();
});
