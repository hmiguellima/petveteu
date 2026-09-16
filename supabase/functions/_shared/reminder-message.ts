export type ReminderLocale = 'pt-PT' | 'en';

export type ReminderMessageInput = {
  dueDate: string;
  locale?: ReminderLocale | null;
  petName: string;
  vaccineType: string;
};

const reminderTemplates: Record<ReminderLocale, string> = {
  'pt-PT':
    'Lembrete: {pet} tem a vacina {vaccine} prevista para {date}. Contacte a clínica veterinária.',
  en: "Reminder: {pet}'s {vaccine} vaccination is due on {date}. Please contact the veterinary clinic.",
};

export function renderReminderMessage(input: ReminderMessageInput): string {
  const locale: ReminderLocale = input.locale === 'en' ? 'en' : 'pt-PT';
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'Europe/Lisbon',
  }).format(new Date(`${input.dueDate}T12:00:00Z`));

  return reminderTemplates[locale]
    .replace('{pet}', input.petName)
    .replace('{vaccine}', input.vaccineType)
    .replace('{date}', date);
}
