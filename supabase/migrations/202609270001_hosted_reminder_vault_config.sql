-- Hosted Supabase prevents project roles from persisting arbitrary custom GUCs.
-- Read the reminder endpoint and cron credential from Vault instead.

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname in ('daily-vaccine-reminders', 'monitor-daily-vaccine-reminders')
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'daily-vaccine-reminders',
  '0 8 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'reminder_url'
      ),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'reminder_cron_secret'
        )
      ),
      body := '{"source":"scheduled"}'::jsonb
    )
  $$
);

select cron.schedule(
  'monitor-daily-vaccine-reminders',
  '0 9 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'reminder_url'
      ),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'reminder_cron_secret'
        )
      ),
      body := '{"source":"scheduled","mode":"monitor"}'::jsonb
    )
  $$
);
