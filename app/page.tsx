import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function Home(): Promise<React.JSX.Element> {
  const translations = await getTranslations();

  return (
    <div className="grid min-h-[80vh] place-items-center">
      <section className="max-w-2xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[.3em] text-sage">
          {translations('common.app')}
        </p>
        <h1 className="text-5xl font-bold">{translations('home.title')}</h1>
        <p className="my-6 text-xl">{translations('home.lead')}</p>
        <div className="flex justify-center gap-3">
          <Link className="button" href="/sign-in">
            {translations('auth.signIn')}
          </Link>
          <Link className="button bg-coral" href="/register">
            {translations('auth.register')}
          </Link>
        </div>
      </section>
    </div>
  );
}
