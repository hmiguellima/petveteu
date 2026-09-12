import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { getCatalog, type Locale } from '@/lib/i18n';

export default getRequestConfig(async () => {
  const requested = cookies().get('locale')?.value;
  const locale: Locale = requested === 'en' ? 'en' : 'pt-PT';

  return { locale, messages: getCatalog(locale) };
});
