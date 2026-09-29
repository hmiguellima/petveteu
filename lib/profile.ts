import type { Role } from '@/lib/auth';
import { oneRelation } from '@/lib/relations';

export type AccountRoleRow = { role: Role };

export type ClientSettingsView = {
  is_incomplete: boolean;
  phone: string | null;
  sms_enabled_by_client: boolean;
  sms_enabled_by_vet: boolean;
};

export type ProfileRow = {
  account_roles?: AccountRoleRow[] | null;
  client_settings?: ClientSettingsView | ClientSettingsView[] | null;
  email: string;
  email_immutable?: boolean;
  full_name: string;
  id: string;
  locale: 'en' | 'pt-PT';
  version: number;
};

export type PortalProfile = ClientSettingsView & {
  email: string;
  email_immutable: boolean;
  full_name: string;
  id: string;
  locale: 'en' | 'pt-PT';
  roles: Role[];
  version: number;
};

export function rolesFrom(accountRoles: AccountRoleRow[] | null | undefined): Role[] {
  return (accountRoles ?? []).map((assignment) => assignment.role);
}

export function toPortalProfile(row: ProfileRow): PortalProfile {
  const settings = oneRelation(row.client_settings);

  return {
    email: row.email,
    email_immutable: Boolean(row.email_immutable),
    full_name: row.full_name,
    id: row.id,
    is_incomplete: settings?.is_incomplete ?? false,
    locale: row.locale,
    phone: settings?.phone ?? null,
    roles: rolesFrom(row.account_roles),
    sms_enabled_by_client: settings?.sms_enabled_by_client ?? true,
    sms_enabled_by_vet: settings?.sms_enabled_by_vet ?? true,
    version: row.version,
  };
}
