import type { Role } from '@/lib/auth';

export type PortalPath = '/client' | '/vet';

export function portalPathForRoles(roles: readonly Role[]): PortalPath {
  return roles.includes('vet') ? '/vet' : '/client';
}

export function redirectForRoleAccess(
  currentRoles: readonly Role[],
  requiredRole: Role,
): PortalPath | null {
  return currentRoles.includes(requiredRole) ? null : portalPathForRoles(currentRoles);
}

export function switchPortalPath(
  currentRoles: readonly Role[],
  currentPortal: Role,
): PortalPath | null {
  if (currentPortal === 'vet' && currentRoles.includes('client')) {
    return '/client';
  }

  if (currentPortal === 'client' && currentRoles.includes('vet')) {
    return '/vet';
  }

  return null;
}
