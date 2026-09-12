import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decide, lisbonDate, type Candidate } from './engine.ts';

const texts = {
  'pt-PT': (petName: string, vaccineType: string, dueDate: string) =>
    `Lembrete: ${petName} tem a vacina ${vaccineType} prevista para ${formatDueDate('pt-PT', dueDate)}. Contacte a clínica veterinária.`,
  en: (petName: string, vaccineType: string, dueDate: string) =>
    `Reminder: ${petName}'s ${vaccineType} vaccination is due on ${formatDueDate('en', dueDate)}. Please contact the veterinary clinic.`,
};

type ReminderAttemptRow = { outcome: string; reason_code: string | null };
type ReminderRow = {
  id: string;
  due_date: string;
  status: string;
  reminder_attempts?: ReminderAttemptRow[];
};
type ProfileRow = {
  phone: string | null;
  locale: 'pt-PT' | 'en';
  sms_enabled_by_client: boolean;
  sms_enabled_by_vet: boolean;
};
type PetRow = {
  name: string;
  date_of_birth: string;
  notification_expiry_years: number;
  deleted_at: string | null;
  profiles: ProfileRow;
};
type CandidateRow = {
  id: string;
  due_date: string;
  vaccine_type: string;
  pets: PetRow;
  reminders?: ReminderRow[];
};

function formatDueDate(locale: 'pt-PT' | 'en', dueDate: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'Europe/Lisbon',
  }).format(new Date(`${dueDate}T12:00:00Z`));
}

async function getTriggerSource(request: Request): Promise<'manual' | 'scheduled'> {
  try {
    const body = await request.clone().json();

    return body.source === 'manual' ? 'manual' : 'scheduled';
  } catch {
    return 'scheduled';
  }
}

function addDays(date: string, numberOfDays: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + numberOfDays);

  return result.toISOString().slice(0, 10);
}

function findReminderForDueDate(row: CandidateRow): ReminderRow | undefined {
  return row.reminders?.find((reminder) => reminder.due_date === row.due_date);
}

function createCandidate(row: CandidateRow, existingReminder?: ReminderRow): Candidate {
  const pet = row.pets;
  const profile = pet.profiles;
  const lastAttempt = existingReminder?.reminder_attempts?.at(-1);

  return {
    entryId: row.id,
    dueDate: row.due_date,
    petName: pet.name,
    birthDate: pet.date_of_birth,
    expiryYears: pet.notification_expiry_years,
    deletedAt: pet.deleted_at,
    phone: profile.phone,
    clientSms: profile.sms_enabled_by_client,
    vetSms: profile.sms_enabled_by_vet,
    locale: profile.locale,
    vaccineType: row.vaccine_type,
    reminderStatus: existingReminder?.status,
    permanentReason: lastAttempt?.outcome === 'permanent_skip' ? lastAttempt.reason_code : null,
  };
}

Deno.serve(async (request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const today = lisbonDate();
  const source = await getTriggerSource(request);

  if (source === 'manual') {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return new Response('unauthorized', { status: 401 });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } },
    );
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id ?? '')
      .single();

    if (profile?.role !== 'vet') {
      return new Response('forbidden', { status: 403 });
    }
  }

  const { data: run, error: lockError } = await supabase
    .from('reminder_job_runs')
    .insert({ business_date: today, trigger_source: source })
    .select()
    .single();
  if (lockError) {
    return Response.json({ skipped: 'already_running_or_succeeded' });
  }

  try {
    const windowEndDate = addDays(today, 2);
    const { data: rows, error } = await supabase
      .from('vaccination_entries')
      .select(
        'id,due_date,vaccine_type,pets!inner(name,date_of_birth,notification_expiry_years,deleted_at,profiles!inner(phone,locale,sms_enabled_by_client,sms_enabled_by_vet)),reminders(id,status,reminder_attempts(reason_code,outcome))',
      )
      .gte('due_date', today)
      .lte('due_date', windowEndDate)
      .is('deleted_at', null);
    if (error) {
      throw error;
    }

    for (const rawRow of rows ?? []) {
      const row = rawRow as unknown as CandidateRow;
      const pet = row.pets;
      const profile = pet.profiles;
      const existingReminder = findReminderForDueDate(row);
      const decision = decide(createCandidate(row, existingReminder), today);
      if (decision.reason === 'outside_window' || decision.reason === 'already_submitted') {
        continue;
      }

      const { data: reminder } = existingReminder
        ? { data: existingReminder }
        : await supabase
            .from('reminders')
            .upsert(
              { vaccination_entry_id: row.id, due_date: row.due_date },
              { onConflict: 'vaccination_entry_id,due_date' },
            )
            .select()
            .single();
      if (decision.kind !== 'eligible') {
        await supabase.from('reminder_attempts').insert({
          reminder_id: reminder.id,
          outcome: 'permanent_skip',
          reason_code: decision.reason,
        });
        await supabase
          .from('reminders')
          .update({
            status: decision.kind === 'exhaust' ? 'exhausted' : 'permanently_skipped',
          })
          .eq('id', reminder.id);
        continue;
      }

      if (Deno.env.get('SMS_DRY_RUN') !== 'false') {
        await supabase
          .from('reminder_attempts')
          .insert({ reminder_id: reminder.id, outcome: 'dry_run', reason_code: 'configured' });
        continue;
      }

      const body = texts[profile.locale === 'en' ? 'en' : 'pt-PT'](
        pet.name,
        row.vaccine_type,
        row.due_date,
      );
      const params = new URLSearchParams({
        To: profile.phone,
        From: Deno.env.get('TWILIO_FROM_NUMBER')!,
        Body: body,
      });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(
              `${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`,
            )}`,
          },
          body: params,
        },
      );
      if (response.ok) {
        const message = await response.json();
        await supabase
          .from('reminder_attempts')
          .insert({ reminder_id: reminder.id, outcome: 'submitted', provider_sid: message.sid });
        await supabase.from('reminders').update({ status: 'submitted' }).eq('id', reminder.id);
      } else {
        await supabase.from('reminder_attempts').insert({
          reminder_id: reminder.id,
          outcome: 'transient_failure',
          reason_code: `twilio_${response.status}`,
        });
      }
    }

    await supabase
      .from('reminder_job_runs')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('id', run.id);
    return Response.json({ ok: true, businessDate: today });
  } catch (_error) {
    await supabase
      .from('reminder_job_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_code: 'batch_failed',
      })
      .eq('id', run.id);
    return Response.json({ error: 'batch_failed' }, { status: 500 });
  }
});
