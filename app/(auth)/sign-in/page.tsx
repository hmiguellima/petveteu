import { signIn } from '../actions';
import { getTranslations } from 'next-intl/server';

type PageProperties = {
  searchParams: { error?: string; registered?: string };
};

export default async function Page({ searchParams }: PageProperties): Promise<React.JSX.Element> {
  const translations = await getTranslations();
  const errorMessage = searchParams.error
    ? translations(searchParams.error === 'credentials' ? 'auth.credentials' : 'auth.profileError')
    : undefined;

  return (
    <section className="mx-auto mt-20 max-w-md card">
      <h1 className="mb-6 text-3xl font-bold">{translations('auth.signIn')}</h1>
      {searchParams.registered ? (
        <p role="status" className="mb-4 text-green-700">
          {translations('auth.registered')}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mb-4 text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <form action={signIn}>
        <label>
          {translations('auth.email')}
          <input required type="email" name="email" autoComplete="email" />
        </label>
        <label>
          {translations('auth.password')}
          <input required type="password" name="password" autoComplete="current-password" />
        </label>
        <button>{translations('auth.signIn')}</button>
      </form>
    </section>
  );
}
