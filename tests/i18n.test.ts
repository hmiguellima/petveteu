import { describe, expect, it } from 'vitest';
import { getCatalog, reminderText, resolveLocale } from '@/lib/i18n';

describe('catalogs', () => {
  it('falls back to Portuguese for a key omitted from English', () =>
    expect(getCatalog('en').validation.stale).toBe(
      'O registo foi alterado entretanto. Reveja os dados atuais e tente novamente.',
    ));
  it('uses Portuguese for absent or unsupported locale preferences', () => {
    expect(resolveLocale(undefined)).toBe('pt-PT');
    expect(resolveLocale('fr')).toBe('pt-PT');
    expect(resolveLocale('en')).toBe('en');
  });
  it('renders both SMS locales', () => {
    expect(reminderText('pt-PT', 'Lua', 'Raiva', '2026-09-12')).toBe(
      'Lembrete: Lua tem a vacina Raiva prevista para 12 de setembro de 2026. Contacte a clínica veterinária.',
    );
    expect(reminderText('en', 'Lua', 'Rabies', '2026-09-12')).toBe(
      "Reminder: Lua's Rabies vaccination is due on September 12, 2026. Please contact the veterinary clinic.",
    );
  });
});
