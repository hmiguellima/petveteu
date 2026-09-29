import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const schemaMigration = readFileSync(
  'supabase/migrations/202609270003_multi_vet_role_schema.sql',
  'utf8',
);
const authorizationMigration = readFileSync(
  'supabase/migrations/202609270004_multi_role_authorization.sql',
  'utf8',
);
const mutationMigration = readFileSync(
  'supabase/migrations/202609270005_multi_role_mutations.sql',
  'utf8',
);

describe('multi-role schema migration', () => {
  it('backfills current client and vet assignments and role-specific state', () => {
    expect(schemaMigration).toContain(
      'insert into public.account_roles(profile_id, role) select id, role from public.profiles',
    );
    expect(schemaMigration).toContain("from public.profiles where role = 'client'");
    expect(schemaMigration).toContain("from public.profiles where role = 'vet'");
    expect(schemaMigration).toContain('pet_owner_without_client_role');
  });

  it('invalidates migrated application sessions before enabling normalized authorization', () => {
    expect(schemaMigration).toContain('delete from auth.sessions as session');
    expect(schemaMigration).toContain('using public.profiles as profile');
    expect(schemaMigration).toContain('where session.user_id = profile.id');
  });

  it('uses normalized roles and AAL2 for current vet authority', () => {
    expect(schemaMigration).toContain('create function public.has_role');
    expect(schemaMigration).toContain("r.role = 'vet'");
    expect(schemaMigration).toContain("v.status = 'active'");
    expect(schemaMigration).toContain("auth.jwt() ->> 'aal'");
  });

  it('removes assignments on revocation while preserving audit history', () => {
    expect(mutationMigration).toContain(
      "delete from public.account_roles where profile_id=p_profile_id and role='vet'",
    );
    expect(mutationMigration).toContain("'vet_role_revoked'");
    expect(mutationMigration).toContain("'last_vet'");
  });

  it('creates client assignments for new public registrations', () => {
    expect(authorizationMigration).toContain(
      "insert into public.account_roles(profile_id, role) values (new.id, 'client')",
    );
    expect(authorizationMigration).toContain('insert into public.client_settings');
  });
});
