import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('browser-exposed regressions', () => {
  it('filters soft-deleted pets and vaccines in both portal queries', () => {
    for (const portal of ['client', 'vet']) {
      const source = readFileSync(`app/${portal}/page.tsx`, 'utf8');
      expect(source).toContain(".is('deleted_at', null)");
      expect(source).toContain(".is('vaccination_entries.deleted_at', null)");
    }
  });

  it('preserves the authenticated caller for permission-checked revocation', () => {
    const source = readFileSync('supabase/functions/admin-vets/index.ts', 'utf8');
    expect(source).toContain("caller.rpc('vet_revoke_role'");
    expect(source).not.toContain("admin.rpc('vet_revoke_role'");
  });

  it('uses a timestamp-only trigger for vet_access, which has no version column', () => {
    const migration = readFileSync(
      'supabase/migrations/202610010002_vet_access_timestamp.sql',
      'utf8',
    );
    expect(migration).toContain('new.updated_at := now()');
    expect(migration).not.toContain('new.version');
    expect(migration).toContain(
      'for each row execute function public.touch_vet_access_timestamp()',
    );
  });
});
