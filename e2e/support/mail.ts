import { expect, type APIRequestContext, type Page } from '@playwright/test';

export async function invitationLink(request: APIRequestContext, email: string): Promise<string> {
  const base = process.env.E2E_MAIL_URL!;
  let messageId = '';
  await expect
    .poll(async () => {
      const response = await request.get(`${base}/api/v1/messages`);
      const data = await response.json();
      const message = data.messages?.find((item: { To: { Address: string }[] }) =>
        item.To.some((recipient) => recipient.Address === email),
      );
      messageId = message?.ID ?? '';
      return messageId;
    })
    .not.toBe('');
  const message = await (await request.get(`${base}/api/v1/message/${messageId}`)).json();
  const match = message.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/);
  if (!match) {
    throw new Error('Local invitation lacks an app confirmation link');
  }
  const link = match[1].replace(/&amp;/g, '&');
  const url = new URL(link);
  if (url.origin !== 'http://127.0.0.1:3100') {
    throw new Error('Invitation must target the local app');
  }

  return link;
}

export async function acceptInvitation(page: Page, link: string): Promise<void> {
  await page.goto(link);
  await expect(page).toHaveURL(/\/(mfa|client)(\?|$)/);
  await page.getByRole('combobox', { name: 'Language / Idioma' }).selectOption('en');
}
