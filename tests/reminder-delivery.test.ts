import { describe, expect, it, vi } from 'vitest';
import { submitWithTwilio } from '../supabase/functions/reminders/delivery';
import { lisbonDate } from '../supabase/functions/reminders/engine';
import { hasValidCronCredential, runHealth } from '../supabase/functions/reminders/operations';

const configuration = {
  accountSid: 'AC_test',
  authToken: 'token',
  fromNumber: '+351210000000',
};

const message = {
  to: '+351912345678',
  body: 'Reminder text',
};

describe('Twilio delivery', () => {
  it('stores the provider SID from a successful submission', async () => {
    const fetchImplementation = vi.fn(async () => Response.json({ sid: 'SM123' }, { status: 201 }));

    await expect(submitWithTwilio(message, configuration, fetchImplementation)).resolves.toEqual({
      kind: 'submitted',
      providerSid: 'SM123',
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it('classifies provider and network failures without using real Twilio', async () => {
    const invalidPhone = vi.fn(async () => Response.json({ code: 21211 }, { status: 400 }));
    const unavailable = vi.fn(async () => new Response(null, { status: 503 }));
    const networkFailure = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(submitWithTwilio(message, configuration, invalidPhone)).resolves.toEqual({
      kind: 'permanent_skip',
      reasonCode: 'twilio_permanent_21211',
    });
    await expect(submitWithTwilio(message, configuration, unavailable)).resolves.toEqual({
      kind: 'transient_failure',
      reasonCode: 'twilio_transient_503',
    });
    await expect(submitWithTwilio(message, configuration, networkFailure)).resolves.toEqual({
      kind: 'transient_failure',
      reasonCode: 'twilio_network_error',
    });
  });
});

describe('run operations', () => {
  it('distinguishes successful, failed, and missing runs', () => {
    expect(runHealth([{ status: 'succeeded' }])).toBe('healthy');
    expect(runHealth([{ status: 'failed' }])).toBe('failed');
    expect(runHealth([])).toBe('missing');
  });

  it('requires the exact configured cron credential', () => {
    expect(hasValidCronCredential('Bearer cron-secret', 'cron-secret')).toBe(true);
    expect(hasValidCronCredential('Bearer wrong', 'cron-secret')).toBe(false);
    expect(hasValidCronCredential(null, 'cron-secret')).toBe(false);
    expect(hasValidCronCredential('Bearer cron-secret', undefined)).toBe(false);
  });

  it.each([
    ['standard time before UTC midnight', '2026-01-15T23:30:00Z', '2026-01-15'],
    ['standard time at UTC midnight', '2026-01-16T00:00:00Z', '2026-01-16'],
    ['daylight-saving date before Lisbon midnight', '2026-07-15T22:59:59Z', '2026-07-15'],
    ['daylight-saving date after Lisbon midnight', '2026-07-15T23:00:00Z', '2026-07-16'],
  ])('calculates the Lisbon business date in %s', (_description, instant, expected) => {
    expect(lisbonDate(new Date(instant))).toBe(expected);
  });

  it('treats an earlier failure as recoverable after a later successful rerun', () => {
    expect(runHealth([{ status: 'failed' }, { status: 'succeeded' }])).toBe('healthy');
  });
});
