import pt from '@/messages/pt-PT.json';
import en from '@/messages/en.json';

export type Locale = 'pt-PT' | 'en';
type Catalog = typeof pt;
export const getCatalog = (locale: Locale): Catalog =>
  locale === 'en' ? deepFallback(pt, en) : pt;

function deepFallback<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? deepFallback(
            (base[key] as Record<string, unknown>) ?? {},
            value as Record<string, unknown>,
          )
        : value;
  }
  return result as T;
}

export function reminderText(locale: Locale, pet: string, vaccine: string, dueDate: string) {
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'Europe/Lisbon',
  }).format(new Date(`${dueDate}T12:00:00Z`));
  const template = getCatalog(locale).sms.reminder;
  return template.replace('{pet}', pet).replace('{vaccine}', vaccine).replace('{date}', date);
}
