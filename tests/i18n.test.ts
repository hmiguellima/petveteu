import { describe, expect, it } from 'vitest';
import { getCatalog, reminderText } from '@/lib/i18n';

describe('catalogs', () => {
  it('falls back to Portuguese structure', () =>
    expect(getCatalog('en').common.app).toBe('PetVet EU'));
  it('renders both SMS locales', () => {
    expect(reminderText('pt-PT', 'Lua', 'Raiva', '2026-09-12')).toContain('Lua');
    expect(reminderText('en', 'Lua', 'Rabies', '2026-09-12')).toContain('Rabies');
  });
});
