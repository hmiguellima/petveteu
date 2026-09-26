import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vetMfaRequirementIsSatisfied } from '@/lib/mfa';
import { createStructuredLogRecord } from '@/lib/security-logging';

describe('vet MFA gate', () => {
  it('requires aal2 when the production profile requires MFA', () => {
    expect(vetMfaRequirementIsSatisfied(true, 'aal1')).toBe(false);
    expect(vetMfaRequirementIsSatisfied(true, null)).toBe(false);
    expect(vetMfaRequirementIsSatisfied(true, 'aal2')).toBe(true);
  });

  it('does not impose MFA when the profile policy is disabled', () => {
    expect(vetMfaRequirementIsSatisfied(false, 'aal1')).toBe(true);
  });

  it('enforces AAL2 at the shared database authorization boundary', () => {
    const migration = readFileSync(
      'supabase/migrations/202609160003_vet_mfa_enforcement.sql',
      'utf8',
    );

    expect(migration).toContain("auth.jwt() ->> 'aal'");
    expect(migration).toContain('not mfa_required');
    expect(migration).toContain("= 'aal2'");
  });
});

describe('structured security logs', () => {
  it('emits only the documented allowlisted fields', () => {
    const record = createStructuredLogRecord(
      {
        correlationId: 'request-123',
        errorCode: 'provider_timeout',
        event: 'reminder.batch.failed',
        severity: 'error',
      },
      new Date('2026-09-16T08:00:00.000Z'),
    );

    expect(record).toEqual({
      correlation_id: 'request-123',
      error_code: 'provider_timeout',
      event: 'reminder.batch.failed',
      severity: 'error',
      timestamp: '2026-09-16T08:00:00.000Z',
    });
    expect(JSON.stringify(record)).not.toMatch(/body|email|name|phone|token|credential/i);
  });

  it('drops values that could contain personal data or secrets', () => {
    const record = createStructuredLogRecord({
      correlationId: 'Bearer secret-token',
      errorCode: '+351912345678',
      event: 'sent to owner@example.com',
      severity: 'warn',
    });

    expect(record).toMatchObject({ event: 'invalid_event', severity: 'warn' });
    expect(record).not.toHaveProperty('correlation_id');
    expect(record).not.toHaveProperty('error_code');
  });
});
