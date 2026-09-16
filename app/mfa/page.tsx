import { getLocale } from 'next-intl/server';
import { getCatalog, resolveLocale } from '@/lib/i18n';

export default async function Page(): Promise<React.JSX.Element> {
  const messages = getCatalog(resolveLocale(await getLocale()));

  return (
    <section className="mx-auto mt-20 max-w-md card">
      <h1 className="text-2xl font-bold">{messages.mfa.title}</h1>
      <p className="mt-3">{messages.mfa.instructions}</p>
    </section>
  );
}
