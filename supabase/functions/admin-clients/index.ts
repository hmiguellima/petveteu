import { parseAdminClientInput } from '../_shared/admin-input.ts';
import { json, requireVet, resendClientInvitation } from '../_shared/admin.ts';

Deno.serve(async (request) => {
  try {
    const { admin, actor } = await requireVet(request);
    const input = parseAdminClientInput(await request.json());
    let targetId: string | undefined;

    if (input.operation === 'invite') {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
        data: {
          full_name: input.fullName,
          phone: input.phone,
          locale: input.locale,
        },
      });

      if (error) {
        throw error;
      }

      targetId = data.user.id;
    } else {
      targetId = input.clientId;
      const { data: profile } = await admin
        .from('profiles')
        .select('email,email_immutable,account_roles!inner(role)')
        .eq('id', targetId)
        .eq('account_roles.role', 'client')
        .maybeSingle();

      if (!profile) {
        return json({ error: 'invalid_target' }, 400);
      }

      if (input.operation === 'change_email') {
        if (profile.email_immutable) {
          return json({ error: 'immutable_email' }, 400);
        }

        const { error } = await admin.auth.admin.updateUserById(targetId, { email: input.email });

        if (error) {
          throw error;
        }
      } else {
        await resendClientInvitation(admin, profile.email);
      }
    }

    const { error: auditError } = await admin.from('admin_audit_events').insert({
      actor_id: actor,
      target_id: targetId,
      action: `client_${input.operation}`,
      details: {
        ...(input.operation === 'invite' ? { locale: input.locale } : {}),
        privacy_notice_version: 'draft-v1',
      },
    });

    if (auditError) {
      throw new Error('audit_failed');
    }

    return json({ ok: true, targetId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';

    return json(
      { error: ['unauthorized', 'forbidden'].includes(message) ? message : 'request_failed' },
      message === 'unauthorized' ? 401 : message === 'forbidden' ? 403 : 400,
    );
  }
});
