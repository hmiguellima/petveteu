import { describe, expect, it } from 'vitest';
import { reminderRunPath } from '@/lib/reminder-run';

describe('manual reminder run feedback', () => {
  it('reports a completed batch', () => {
    expect(reminderRunPath({ ok: true }, null)).toBe('/vet?status=reminder-run-completed');
  });

  it('reports a duplicate-suppressed batch', () => {
    expect(reminderRunPath({ skipped: 'already_running_or_succeeded' }, null)).toBe(
      '/vet?status=reminder-run-skipped',
    );
  });

  it('reports invocation and malformed-response failures', () => {
    expect(reminderRunPath(null, new Error('failed'))).toBe('/vet?error=reminder-run');
    expect(reminderRunPath({}, null)).toBe('/vet?error=reminder-run');
  });
});
