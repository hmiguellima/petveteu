import { describe, expect, it } from 'vitest';
import { vaccinationSchema } from '@/lib/validation';

const vaccination = {
  id: null,
  petId: '20000000-0000-4000-8000-000000000001',
  vaccineType: '  Raiva  ',
  dueDate: '2020-06-01',
  lastAdministeredDate: '2020-05-01',
  notes: '  Reforço anual  ',
  version: 0,
};

describe('vaccination validation', () => {
  it('normalizes bounded plain text and permits historical due dates', () => {
    expect(vaccinationSchema.parse(vaccination)).toMatchObject({
      vaccineType: 'Raiva',
      dueDate: '2020-06-01',
      notes: 'Reforço anual',
    });
  });

  it('rejects an administered date after the due date', () => {
    expect(() =>
      vaccinationSchema.parse({ ...vaccination, lastAdministeredDate: '2020-06-02' }),
    ).toThrow();
  });

  it('rejects future administered dates and oversized fields', () => {
    expect(() =>
      vaccinationSchema.parse({
        ...vaccination,
        dueDate: '2999-06-01',
        lastAdministeredDate: '2999-05-01',
      }),
    ).toThrow();
    expect(() =>
      vaccinationSchema.parse({ ...vaccination, vaccineType: 'x'.repeat(121) }),
    ).toThrow();
    expect(() => vaccinationSchema.parse({ ...vaccination, notes: 'x'.repeat(2001) })).toThrow();
  });

  it('requires positive concurrency versions for edits while allowing zero on creates', () => {
    expect(vaccinationSchema.parse(vaccination).version).toBe(0);
    expect(
      vaccinationSchema.parse({
        ...vaccination,
        id: '30000000-0000-4000-8000-000000000001',
        version: 2,
      }).version,
    ).toBe(2);
    expect(() =>
      vaccinationSchema.parse({
        ...vaccination,
        id: '30000000-0000-4000-8000-000000000001',
        version: 0,
      }),
    ).toThrow();
  });
});
