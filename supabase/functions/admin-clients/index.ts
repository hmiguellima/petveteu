import { json, requireVet } from '../_shared/admin.ts';

Deno.serve(async (request) => {
  try {
    const { admin, actor } = await requireVet(request);
    const input = await request.json();

    if ('role' in input) {
      return json({ error: 'unsupported_field' }, 400);
    }

    const operation = String(input.operation);

    if (!['invite', 'change_email', 'resend'].includes(operation)) {
      return json({ error: 'unsupported_operation' }, 400);
    }

    const email = String(input.email ?? '')
      .trim()
      .toLowerCase();
    let targetId: string | undefined;

    if (operation === 'invite') {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: String(input.fullName ?? '').trim(),
          phone: input.phone ?? null,
          locale: input.locale === 'en' ? 'en' : 'pt-PT',
        },
      });

      if (error) {
        throw error;
      }

      targetId = data.user.id;
    } else {
      targetId = String(input.clientId);
      const { data: profile } = await admin
        .from('profiles')
        .select('role,email')
        .eq('id', targetId)
        .single();

      if (profile?.role !== 'client') {
        return json({ error: 'invalid_target' }, 400);
      }

      if (operation === 'change_email') {
        const { error } = await admin.auth.admin.updateUserById(targetId, { email });

        if (error) {
          throw error;
        }
      } else {
        const { error } = await admin.auth.admin.generateLink({
          type: 'invite',
          email: profile.email,
        });

        if (error) {
          throw error;
        }
      }
    }

    await admin.from('admin_audit_events').insert({
      actor_id: actor,
      target_id: targetId,
      action: `client_${operation}`,
      details: {
        locale: input.locale === 'en' ? 'en' : 'pt-PT',
        privacy_notice_version: 'draft-v1',
      },
    });

    return json({ ok: true, targetId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';

    return json(
      { error: ['unauthorized', 'forbidden'].includes(message) ? message : 'request_failed' },
      message === 'unauthorized' ? 401 : message === 'forbidden' ? 403 : 400,
    );
  }
});
