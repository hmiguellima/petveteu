import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReadOnlySchedule } from '@/app/client/read-only-schedule';

describe('client vaccination schedule', () => {
  it('renders owned schedule data without mutation controls', () => {
    const html = renderToStaticMarkup(
      <ReadOnlySchedule
        vaccinations={[
          {
            id: '30000000-0000-4000-8000-000000000001',
            vaccine_type: 'Raiva',
            due_date: '2026-10-02',
          },
        ]}
      />,
    );

    expect(html).toContain('Raiva');
    expect(html).toContain('2026-10-02');
    expect(html).not.toMatch(/<(?:button|form|input|select|textarea)\b/);
  });

  it('shows a clear empty state', () => {
    expect(renderToStaticMarkup(<ReadOnlySchedule vaccinations={[]} />)).toContain(
      'Sem vacinas registadas.',
    );
  });
});
