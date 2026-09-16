import { getTranslations } from 'next-intl/server';

export default async function Page(): Promise<React.JSX.Element> {
  const translations = await getTranslations('privacy');

  return (
    <article className="prose mx-auto card">
      <h1>{translations('title')}</h1>
      <p className="rounded bg-amber-100 p-3">
        <strong>{translations('draftLabel')}:</strong> {translations('draft')}
      </p>
      <h2>{translations('purposesTitle')}</h2>
      <p>{translations('purposes')}</p>
      <p>{translations('contact')}</p>
    </article>
  );
}
