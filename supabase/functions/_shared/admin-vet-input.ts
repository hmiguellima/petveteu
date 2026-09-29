export type AdminVetInput =
  | { email: string; operation: 'invite' }
  | { invitationId: string; operation: 'cancel' | 'resend' }
  | { operation: 'revoke'; profileId: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new Error('invalid_id');
  }

  return value;
}

export function parseAdminVetInput(value: unknown): AdminVetInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_payload');
  }
  const input = value as Record<string, unknown>;
  if (input.operation === 'invite') {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (
      Object.keys(input).some((key) => !['operation', 'email'].includes(key)) ||
      !emailPattern.test(email) ||
      email.length > 320
    ) {
      throw new Error('invalid_email');
    }

    return { email, operation: 'invite' };
  }
  if (input.operation === 'cancel' || input.operation === 'resend') {
    return { invitationId: parseUuid(input.invitationId), operation: input.operation };
  }
  if (input.operation === 'revoke') {
    return { operation: 'revoke', profileId: parseUuid(input.profileId) };
  }
  throw new Error('unsupported_operation');
}
