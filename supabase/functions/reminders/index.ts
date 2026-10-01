import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../_shared/database.types.ts';
import { renderReminderMessage } from '../_shared/reminder-message.ts';
import { createCandidate, findReminderForDueDate, type CandidateRow } from './candidate.ts';
import { submitWithTwilio } from './delivery.ts';
import { decide, lisbonDate } from './engine.ts';
import { hasValidCronCredential, runHealth } from './operations.ts';

type AppSupabaseClient = SupabaseClient<Database>;

type TriggerSource = 'manual' | 'scheduled';
type Invocation = { mode?: 'monitor'; source?: TriggerSource };

function addDays(date: string, numberOfDays: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + numberOfDays);

  return result.toISOString().slice(0, 10);
}

async function invocationFrom(request: Request): Promise<Invocation> {
  try {
    return (await request.clone().json()) as Invocation;
  } catch {
    return {};
  }
}

function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

async function authorizeVet(request: Request, supabase: AppSupabaseClient): Promise<boolean> {
  const authorization = request.headers.get('Authorization') ?? '';
  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

  if (scheme.toLowerCase() !== 'bearer' || !token || extraParts.length > 0) {
    return false;
  }

  const userSupabase = createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  );
  const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
  const actor = claimsData?.claims.sub;

  if (claimsError || !actor) {
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,mfa_required')
    .eq('id', actor)
    .single();

  if (profile?.role !== 'vet') {
    return false;
  }

  return !profile.mfa_required || claimsData.claims.aal === 'aal2';
}

async function sendAlert(businessDate: string, health: 'failed' | 'missing'): Promise<void> {
  const webhookUrl = Deno.env.get('REMINDER_ALERT_WEBHOOK_URL');
  if (!webhookUrl) {
    return;
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessDate, event: 'reminder_run_unhealthy', health }),
  });
}

// The handler intentionally keeps the complete batch transaction flow together
// so each attempt is persisted before its lifecycle status is advanced.
// eslint-disable-next-line max-lines-per-function, complexity
Deno.serve(async (request) => {
  const supabase = createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const today = lisbonDate();
  const invocation = await invocationFrom(request);
  const source: TriggerSource = invocation.source === 'manual' ? 'manual' : 'scheduled';

  if (source === 'manual') {
    if (!(await authorizeVet(request, supabase))) {
      return new Response('forbidden', { status: 403 });
    }
  } else if (
    !hasValidCronCredential(
      request.headers.get('Authorization'),
      Deno.env.get('REMINDER_CRON_SECRET'),
    )
  ) {
    return new Response('unauthorized', { status: 401 });
  }

  if (invocation.mode === 'monitor') {
    const { data, error } = await supabase
      .from('reminder_job_runs')
      .select('status')
      .eq('business_date', today);
    assertNoError(error);
    const health = runHealth(data ?? []);
    if (health !== 'healthy') {
      await sendAlert(today, health);
      await supabase.from('admin_audit_events').insert({
        action: 'reminder_run_alert',
        details: { business_date: today, health },
      });
    }

    return Response.json({ businessDate: today, health });
  }

  const { data: run, error: lockError } = await supabase
    .from('reminder_job_runs')
    .insert({ business_date: today, trigger_source: source })
    .select()
    .single();
  if (lockError || !run) {
    return Response.json({ businessDate: today, skipped: 'already_running_or_succeeded' });
  }

  try {
    const expired = await supabase
      .from('reminders')
      .update({ status: 'exhausted' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id');
    assertNoError(expired.error);
    if (expired.data?.length) {
      const { error } = await supabase.from('reminder_attempts').insert(
        expired.data.map(({ id }) => ({
          reminder_id: id,
          outcome: 'permanent_skip',
          reason_code: 'past_due',
        })),
      );
      assertNoError(error);
    }

    const windowEndDate = addDays(today, 2);
    const { data: rows, error } = await supabase
      .from('vaccination_entries')
      .select(
        'id,due_date,vaccine_type,pets!inner(name,date_of_birth,notification_expiry_years,deleted_at,profiles!inner(locale,client_settings!inner(phone,sms_enabled_by_client,sms_enabled_by_vet))),reminders(id,due_date,status,reminder_attempts(reason_code,outcome,created_at))',
      )
      .gte('due_date', today)
      .lte('due_date', windowEndDate)
      .is('deleted_at', null);
    assertNoError(error);

    for (const rawRow of rows ?? []) {
      const row = rawRow as unknown as CandidateRow;
      const pet = row.pets;
      const profile = pet.profiles;
      const settings = Array.isArray(profile.client_settings)
        ? profile.client_settings[0]
        : profile.client_settings;
      const existingReminder = findReminderForDueDate(row);
      const decision = decide(createCandidate(row, existingReminder), today);
      if (decision.reason === 'outside_window' || decision.reason === 'already_submitted') {
        continue;
      }

      const reminderResult = existingReminder
        ? { data: existingReminder, error: null }
        : await supabase
            .from('reminders')
            .upsert(
              { vaccination_entry_id: row.id, due_date: row.due_date },
              { onConflict: 'vaccination_entry_id,due_date' },
            )
            .select()
            .single();
      assertNoError(reminderResult.error);
      const reminder = reminderResult.data;
      if (!reminder) {
        throw new Error('reminder_missing_after_upsert');
      }

      if (decision.kind !== 'eligible') {
        if (decision.recordAttempt !== false) {
          const { error: attemptError } = await supabase.from('reminder_attempts').insert({
            reminder_id: reminder.id,
            outcome: 'permanent_skip',
            reason_code: decision.reason,
          });
          assertNoError(attemptError);
          const { error: reminderError } = await supabase
            .from('reminders')
            .update({ status: decision.kind === 'exhaust' ? 'exhausted' : 'permanently_skipped' })
            .eq('id', reminder.id);
          assertNoError(reminderError);
        }
        continue;
      }

      if (Deno.env.get('SMS_DRY_RUN') !== 'false') {
        const { error: attemptError } = await supabase.from('reminder_attempts').insert({
          reminder_id: reminder.id,
          outcome: 'dry_run',
          reason_code: 'configured',
        });
        assertNoError(attemptError);
        const { error: reminderError } = await supabase
          .from('reminders')
          .update({ status: 'pending' })
          .eq('id', reminder.id);
        assertNoError(reminderError);
        continue;
      }

      const delivery = await submitWithTwilio(
        {
          body: renderReminderMessage({
            dueDate: row.due_date,
            locale: profile.locale,
            petName: pet.name,
            vaccineType: row.vaccine_type,
          }),
          to: settings.phone!,
        },
        {
          accountSid: Deno.env.get('TWILIO_ACCOUNT_SID')!,
          authToken: Deno.env.get('TWILIO_AUTH_TOKEN')!,
          fromNumber: Deno.env.get('TWILIO_FROM_NUMBER')!,
        },
      );
      const { error: attemptError } = await supabase.from('reminder_attempts').insert({
        reminder_id: reminder.id,
        outcome: delivery.kind,
        provider_sid: delivery.kind === 'submitted' ? delivery.providerSid : null,
        reason_code: delivery.kind === 'submitted' ? null : delivery.reasonCode,
      });
      assertNoError(attemptError);

      const nextStatus =
        delivery.kind === 'submitted'
          ? 'submitted'
          : delivery.kind === 'permanent_skip'
            ? 'permanently_skipped'
            : 'pending';
      const { error: reminderError } = await supabase
        .from('reminders')
        .update({ status: nextStatus })
        .eq('id', reminder.id);
      assertNoError(reminderError);
    }

    const { error: completionError } = await supabase
      .from('reminder_job_runs')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('id', run.id);
    assertNoError(completionError);

    return Response.json({ ok: true, businessDate: today });
  } catch {
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
