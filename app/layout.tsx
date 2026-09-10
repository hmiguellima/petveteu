import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
export const metadata = {
  title: 'PetVet EU',
  description: 'Portal veterinário e lembretes de vacinação',
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <main className="mx-auto min-h-screen max-w-6xl p-6">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
