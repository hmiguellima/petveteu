import { parseAdminVetInput } from '../_shared/admin-vet-input.ts';
import { json, requireVet, type AppSupabaseClient } from '../_shared/admin.ts';

async function unbanExistingProfile(
  admin: AppSupabaseClient,
  profileId: string,
  createdUser: boolean,
): Promise<void> {
  if (createdUser) {
    return;
  }

  const { error } = await admin.auth.admin.updateUserById(profileId, { ban_duration: 'none' });
  if (error) {
    throw error;
  }
}

Deno.serve(async (request) => {
  try {
    const { admin, actor, caller } = await requireVet(request);
    const input = parseAdminVetInput(await request.json());
    if (input.operation === 'revoke') {
      const { error } = await caller.rpc('vet_revoke_role', { p_profile_id: input.profileId });
      if (error) {
        throw error;
      }

      return json({ ok: true });
    }
    if (input.operation === 'cancel' || input.operation === 'resend') {
      const { data } = await admin
        .from('vet_invitations')
        .select('*')
        .eq('id', input.invitationId)
        .eq('status', 'pending')
        .single();
      if (!data) {
        return json({ error: 'invalid_invitation' }, 400);
      }
      if (input.operation === 'cancel') {
        await admin
          .from('vet_invitations')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', data.id);
        await admin
          .from('account_roles')
          .delete()
          .eq('profile_id', data.profile_id)
          .eq('role', 'vet');
        await admin
          .from('vet_access')
          .delete()
          .eq('profile_id', data.profile_id)
          .eq('status', 'pending_mfa');
      } else {
        const { error } = await admin.auth.signInWithOtp({
          email: data.email,
          options: { shouldCreateUser: false },
        });
        if (error) {
          throw error;
        }
        await admin
          .from('vet_invitations')
          .update({ expires_at: new Date(Date.now() + 604800000).toISOString() })
          .eq('id', data.id);
      }
      await admin.from('admin_audit_events').insert({
        actor_id: actor,
        target_id: data.profile_id,
        action: `vet_invitation_${input.operation}`,
      });
      return json({ ok: true });
    }
    if (input.operation !== 'invite') {
      throw new Error('unsupported_operation');
    }

    let { data: profile } = await admin
      .from('profiles')
      .select('id,email,locale')
      .eq('email', input.email)
      .maybeSingle();
    let createdUser = false;
    if (!profile) {
      const result = await admin.auth.admin.inviteUserByEmail(input.email, {
        data: { initial_role: 'vet', invitation_language: 'bilingual', locale: 'pt-PT' },
      });
      if (result.error) {
        throw result.error;
      }
      createdUser = true;
      profile = { email: input.email, id: result.data.user.id, locale: 'pt-PT' };
    } else {
      const metadataUpdate = await admin.auth.admin.updateUserById(profile.id, {
        user_metadata: { invitation_language: 'localized', locale: profile.locale },
      });
      if (metadataUpdate.error) {
        throw metadataUpdate.error;
      }
      const { error } = await admin.auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: false },
      });
      if (error) {
        throw error;
      }
    }
    await unbanExistingProfile(admin, profile.id, createdUser);
    const results = await Promise.all([
      admin.from('account_roles').upsert({ profile_id: profile.id, role: 'vet' }),
      admin
        .from('vet_access')
        .upsert({ profile_id: profile.id, status: 'pending_mfa', activated_at: null }),
      admin
        .from('vet_invitations')
        .insert({ email: input.email, invited_by: actor, profile_id: profile.id }),
    ]);
    if (results.some(({ error }) => error)) {
      if (createdUser) {
        await admin.auth.admin.deleteUser(profile.id);
      }
      throw new Error('invitation_state_failed');
    }
    await admin
      .from('admin_audit_events')
      .insert({ actor_id: actor, target_id: profile.id, action: 'vet_invitation_created' });
    return json({ ok: true, targetId: profile.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';

    return json(
      { error: ['unauthorized', 'forbidden'].includes(message) ? message : 'request_failed' },
      message === 'unauthorized' ? 401 : message === 'forbidden' ? 403 : 400,
    );
  }
});
