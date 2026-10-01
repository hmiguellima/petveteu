import type { Candidate } from './engine.ts';

export type ReminderAttemptRow = {
  outcome: string;
  reason_code: string | null;
  created_at: string;
};

export type ReminderRow = {
  id: string;
  due_date: string;
  status: string;
  reminder_attempts?: ReminderAttemptRow[];
};

type ClientSettingsRow = {
  phone: string | null;
  sms_enabled_by_client: boolean;
  sms_enabled_by_vet: boolean;
};

type ProfileRow = {
  locale: 'pt-PT' | 'en';
  client_settings: ClientSettingsRow | ClientSettingsRow[];
};

type PetRow = {
  name: string;
  date_of_birth: string;
  notification_expiry_years: number;
  deleted_at: string | null;
  profiles: ProfileRow;
};

export type CandidateRow = {
  id: string;
  due_date: string;
  vaccine_type: string;
  pets: PetRow;
  reminders?: ReminderRow[];
};

function oneRelation<T>(relation: T | T[]): T {
  return Array.isArray(relation) ? relation[0] : relation;
}

export function findReminderForDueDate(row: CandidateRow): ReminderRow | undefined {
  return row.reminders?.find((reminder) => reminder.due_date === row.due_date);
}

export function createCandidate(row: CandidateRow, existingReminder?: ReminderRow): Candidate {
  const pet = row.pets;
  const profile = pet.profiles;
  const settings = oneRelation(profile.client_settings);
  const attempt = existingReminder?.reminder_attempts?.toSorted((left, right) =>
    right.created_at.localeCompare(left.created_at),
  )[0];

  return {
    entryId: row.id,
    dueDate: row.due_date,
    petName: pet.name,
    birthDate: pet.date_of_birth,
    expiryYears: pet.notification_expiry_years,
    deletedAt: pet.deleted_at,
    phone: settings.phone,
    clientSms: settings.sms_enabled_by_client,
    vetSms: settings.sms_enabled_by_vet,
    locale: profile.locale,
    vaccineType: row.vaccine_type,
    reminderStatus: existingReminder?.status,
    permanentReason: attempt?.outcome === 'permanent_skip' ? attempt.reason_code : null,
  };
}
