import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');
const schema = read('supabase/migrations/202609270003_multi_vet_role_schema.sql');
const mutations = read('supabase/migrations/202609270005_multi_role_mutations.sql');
const activation = read('supabase/migrations/202609270009_identity_and_notifications.sql');
const adminClients = read('supabase/functions/admin-clients/index.ts');
const adminVets = read('supabase/functions/admin-vets/index.ts');

const compact = (value: string): string => value.replace(/\s+/g, ' ');

describe('multi-vet lifecycle contracts', () => {
  it('matches activation and expiry to the authenticated invited identity', () => {
    const sql = compact(activation);

    expect(sql).toContain("profile_id = auth.uid() and status = 'pending'");
    expect(sql).toContain('expires_at < now()');
    expect(sql).toContain(
      "delete from public.account_roles where profile_id = auth.uid() and role = 'vet'",
    );
  });

  it('requires a current vet role and AAL2 before activation', () => {
    expect(compact(activation)).toContain(
      "if not public.has_role('vet') or coalesce((select auth.jwt()->>'aal'),'aal1') <> 'aal2'",
    );
    expect(schema).toContain("v.status = 'active'");
  });

  it('locks vet email and rejects administrative changes to immutable email', () => {
    expect(activation).toContain('create trigger vet_access_lock_email');
    expect(adminClients).toContain('if (profile.email_immutable)');
    expect(adminClients).toContain("error: 'immutable_email'");
  });

  it('serializes final-vet revocation and invalidates only the target sessions', () => {
    const sql = compact(mutations);

    expect(sql).toContain("from public.account_roles where role='vet' for update");
    expect(sql).toContain("raise exception 'last_vet'");
    expect(sql).toContain('delete from auth.sessions where user_id=p_profile_id');
    expect(sql).toContain("banned_until='infinity'::timestamptz");
  });

  it('persists per-recipient membership notifications and supports reinstatement', () => {
    const sql = compact(activation);

    expect(sql).toContain("membership_event := 'vet_reinstated'");
    expect(sql).toContain(
      'insert into public.in_app_notifications(recipient_id, event, actor_id, subject_id)',
    );
    expect(adminVets).toContain("ban_duration: 'none'");
  });
});
