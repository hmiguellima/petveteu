import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReminderStatus, type AttemptView, type ReminderView } from '@/app/vet/reminder-status';

function render(status: ReminderView['status'], attempts: AttemptView[] = []): string {
  return renderToStaticMarkup(
    <ReminderStatus reminder={{ status, reminder_attempts: attempts }} />,
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
});
