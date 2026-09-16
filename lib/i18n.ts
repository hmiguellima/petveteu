import pt from '@/messages/pt-PT.json';
import en from '@/messages/en.json';
import {
  renderReminderMessage,
  type ReminderLocale,
} from '@/supabase/functions/_shared/reminder-message';

export { renderReminderMessage };

export type Locale = 'pt-PT' | 'en';
export type Catalog = typeof pt;
export const defaultLocale: Locale = 'pt-PT';

export function resolveLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : defaultLocale;
}

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

export function reminderText(
  locale: Locale,
  pet: string,
  vaccine: string,
  dueDate: string,
): string {
  return renderReminderMessage({
    dueDate,
    locale: locale as ReminderLocale,
    petName: pet,
    vaccineType: vaccine,
  });
}
