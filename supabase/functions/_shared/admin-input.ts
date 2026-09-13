export type ClientLocale = 'en' | 'pt-PT';

export type InviteClientInput = {
  email: string;
  fullName: string;
  locale: ClientLocale;
  operation: 'invite';
  phone: string;
};

export type ChangeClientEmailInput = {
  clientId: string;
  email: string;
  operation: 'change_email';
};

export type ResendClientInvitationInput = {
  clientId: string;
  operation: 'resend';
};

export type AdminClientInput =
  InviteClientInput | ChangeClientEmailInput | ResendClientInvitationInput;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+[1-9][0-9]{7,14}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_payload');
  }

  return value as Record<string, unknown>;
}

function rejectUnknownFields(input: Record<string, unknown>, allowedFields: string[]): void {
  if (Object.keys(input).some((fieldName) => !allowedFields.includes(fieldName))) {
    throw new Error('unsupported_field');
  }
}

function parseEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (email.length > 320 || !emailPattern.test(email)) {
    throw new Error('invalid_email');
  }

  return email;
}

function parseClientId(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new Error('invalid_client');
  }

  return value;
}

export function parseAdminClientInput(value: unknown): AdminClientInput {
  const input = requireObject(value);

  if (input.operation === 'invite') {
    rejectUnknownFields(input, ['operation', 'email', 'fullName', 'phone', 'locale']);

    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
    const locale = input.locale ?? 'pt-PT';

    if (fullName.length < 1 || fullName.length > 120) {
      throw new Error('invalid_name');
    }

    if (!phonePattern.test(phone)) {
      throw new Error('invalid_phone');
    }

    if (locale !== 'pt-PT' && locale !== 'en') {
      throw new Error('invalid_locale');
    }

    return {
      operation: 'invite',
      email: parseEmail(input.email),
      fullName,
      phone,
      locale,
    };
  }

  if (input.operation === 'change_email') {
    rejectUnknownFields(input, ['operation', 'clientId', 'email']);

    return {
      operation: 'change_email',
      clientId: parseClientId(input.clientId),
      email: parseEmail(input.email),
    };
  }

  if (input.operation === 'resend') {
    rejectUnknownFields(input, ['operation', 'clientId']);

    return {
      operation: 'resend',
      clientId: parseClientId(input.clientId),
    };
  }

  throw new Error('unsupported_operation');
}
