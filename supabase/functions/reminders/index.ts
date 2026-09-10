import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decide, lisbonDate } from './engine.ts';
const texts = {
  'pt-PT': (p: string, v: string, d: string) =>
    `Lembrete: ${p} tem a vacina ${v} prevista para ${new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long', timeZone: 'Europe/Lisbon' }).format(new Date(d + 'T12:00:00Z'))}. Contacte a clínica veterinária.`,
  en: (p: string, v: string, d: string) =>
    `Reminder: ${p}'s ${v} vaccination is due on ${new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'Europe/Lisbon' }).format(new Date(d + 'T12:00:00Z'))}. Please contact the veterinary clinic.`,
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
Deno.serve(async (req) => {
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const today = lisbonDate();
  let source = 'scheduled';
  try {
    source = (await req.clone().json()).source === 'manual' ? 'manual' : 'scheduled';
  } catch {}
  if (source === 'manual') {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response('unauthorized', { status: 401 });
    const userDb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
    } = await userDb.auth.getUser();
    const { data: p } = await db
      .from('profiles')
      .select('role')
      .eq('id', user?.id ?? '')
      .single();
    if (p?.role !== 'vet') return new Response('forbidden', { status: 403 });
  }
  const { data: run, error: lockError } = await db
    .from('reminder_job_runs')
    .insert({ business_date: today, trigger_source: source })
    .select()
    .single();
  if (lockError) return Response.json({ skipped: 'already_running_or_succeeded' });
  try {
    const end = new Date(today + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + 2);
    const { data: rows, error } = await db
      .from('vaccination_entries')
      .select(
        'id,due_date,vaccine_type,pets!inner(name,date_of_birth,notification_expiry_years,deleted_at,profiles!inner(phone,locale,sms_enabled_by_client,sms_enabled_by_vet)),reminders(id,status,reminder_attempts(reason_code,outcome))',
      )
      .gte('due_date', today)
      .lte('due_date', end.toISOString().slice(0, 10))
      .is('deleted_at', null);
    if (error) throw error;
    for (const rawRow of rows ?? []) {
      const row = rawRow as unknown as CandidateRow;
      const pet = row.pets,
        profile = pet.profiles,
        existing = row.reminders?.find((reminder) => reminder.due_date === row.due_date);
      const last = existing?.reminder_attempts?.at(-1);
      const d = decide(
        {
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
          reminderStatus: existing?.status,
          permanentReason: last?.outcome === 'permanent_skip' ? last.reason_code : null,
        },
        today,
      );
      if (d.reason === 'outside_window' || d.reason === 'already_submitted') continue;
      const { data: rem } = existing
        ? { data: existing }
        : await db
            .from('reminders')
            .upsert(
              { vaccination_entry_id: row.id, due_date: row.due_date },
              { onConflict: 'vaccination_entry_id,due_date' },
            )
            .select()
            .single();
      if (d.kind !== 'eligible') {
        await db
          .from('reminder_attempts')
          .insert({ reminder_id: rem.id, outcome: 'permanent_skip', reason_code: d.reason });
        await db
          .from('reminders')
          .update({ status: d.kind === 'exhaust' ? 'exhausted' : 'permanently_skipped' })
          .eq('id', rem.id);
        continue;
      }
      if (Deno.env.get('SMS_DRY_RUN') !== 'false') {
        await db
          .from('reminder_attempts')
          .insert({ reminder_id: rem.id, outcome: 'dry_run', reason_code: 'configured' });
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
            Authorization:
              'Basic ' +
              btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`),
          },
          body: params,
        },
      );
      if (response.ok) {
        const msg = await response.json();
        await db
          .from('reminder_attempts')
          .insert({ reminder_id: rem.id, outcome: 'submitted', provider_sid: msg.sid });
        await db.from('reminders').update({ status: 'submitted' }).eq('id', rem.id);
      } else
        await db.from('reminder_attempts').insert({
          reminder_id: rem.id,
          outcome: 'transient_failure',
          reason_code: `twilio_${response.status}`,
        });
    }
    await db
      .from('reminder_job_runs')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('id', run.id);
    return Response.json({ ok: true, businessDate: today });
  } catch (_error) {
    await db
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
