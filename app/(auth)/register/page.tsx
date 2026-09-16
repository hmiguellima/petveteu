import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { register } from '../actions';

type PageProperties = {
  searchParams: { error?: string };
};

export default async function Page({ searchParams }: PageProperties): Promise<React.JSX.Element> {
  const translations = await getTranslations();
  const errorMessage = searchParams.error
    ? translations(searchParams.error === 'conflict' ? 'auth.conflict' : 'auth.invalid')
    : undefined;

  return (
    <section className="mx-auto my-12 max-w-lg card">
      <h1 className="mb-6 text-3xl font-bold">{translations('auth.register')}</h1>
      {errorMessage ? (
        <p role="alert" className="mb-4 text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <form action={register}>
        <label>
          {translations('auth.name')}
          <input required name="fullName" maxLength={120} />
        </label>
        <label>
          {translations('auth.email')}
          <input required type="email" name="email" />
        </label>
        <label>
          {translations('auth.phone')}
          <input required name="phone" placeholder="+351912345678" />
        </label>
        <label>
          {translations('auth.password')}
          <input required minLength={10} type="password" name="password" />
        </label>
        <label>
          {translations('auth.language')}
          <select name="locale">
            <option value="pt-PT">Português</option>
            <option value="en">English</option>
          </select>
        </label>
        <p className="text-sm">
          {translations('auth.privacyPrefix')}{' '}
          <Link className="underline" href="/privacy">
            {translations('auth.privacyLink')}
          </Link>
          .
        </p>
        <button>{translations('auth.register')}</button>
      </form>
    </section>
  );
}
