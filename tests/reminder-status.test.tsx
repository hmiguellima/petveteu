import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReminderStatus, type AttemptView, type ReminderView } from '@/app/vet/reminder-status';
import { getCatalog, type Locale } from '@/lib/i18n';

function render(
  status: ReminderView['status'],
  attempts: AttemptView[] = [],
  locale: Locale = 'pt-PT',
): string {
  const messages = getCatalog(locale);

  return renderToStaticMarkup(
    <ReminderStatus
      labels={{
        attempts: {
          dry_run: messages.vaccine.dryRun,
          permanent_skip: messages.vaccine.permanentlySkipped,
          submitted: messages.vaccine.submitted,
          transient_failure: messages.vaccine.transientFailure,
        },
        statuses: {
          cancelled: messages.vaccine.cancelled,
          delivered: messages.vaccine.delivered,
          exhausted: messages.vaccine.exhausted,
          pending: messages.vaccine.pending,
          permanently_skipped: messages.vaccine.permanentlySkipped,
          submitted: messages.vaccine.submitted,
        },
      }}
      reminder={{ status, reminder_attempts: attempts }}
    />,
  );
}

describe('vet reminder status', () => {
  it.each([
    ['submitted', 'submetido ao operador'],
    ['exhausted', 'tentativas esgotadas'],
    ['permanently_skipped', 'ignorado permanentemente'],
  ] as const)('renders the %s lifecycle', (status, label) => {
    expect(render(status)).toContain(label);
  });

  it('never presents a dry run as sent', () => {
    const html = render('pending', [
      { created_at: '2026-09-16T08:00:00Z', outcome: 'dry_run', reason_code: null },
    ]);

    expect(html).toContain('simulação (não enviado)');
    expect(html).not.toContain('submetido ao operador');
  });

  it('shows the latest failed attempt even when attempts are unordered', () => {
    const html = render('pending', [
      { created_at: '2026-09-16T08:00:00Z', outcome: 'dry_run', reason_code: null },
      {
        created_at: '2026-09-17T08:00:00Z',
        outcome: 'transient_failure',
        reason_code: 'provider_unavailable',
      },
    ]);

    expect(html).toContain('falha temporária');
    expect(html).toContain('provider_unavailable');
  });

  it('renders lifecycle labels from the English catalog', () => {
    expect(render('delivered', [], 'en')).toContain('delivered');
    expect(
      render(
        'pending',
        [{ created_at: '2026-09-16T08:00:00Z', outcome: 'dry_run', reason_code: null }],
        'en',
      ),
    ).toContain('dry run (not sent)');
  });
});
