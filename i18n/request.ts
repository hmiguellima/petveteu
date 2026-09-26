import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { getCatalog, resolveLocale } from '@/lib/i18n';

export default getRequestConfig(async () => {
  const requested = cookies().get('locale')?.value;
  const locale = resolveLocale(requested);

  return { locale, messages: getCatalog(locale) };
});
