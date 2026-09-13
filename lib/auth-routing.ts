import type { Role } from '@/lib/auth';

export type PortalPath = '/client' | '/vet';

export function portalPathForRole(role: Role): PortalPath {
  return role === 'vet' ? '/vet' : '/client';
}

export function redirectForRoleAccess(currentRole: Role, requiredRole: Role): PortalPath | null {
  return currentRole === requiredRole ? null : portalPathForRole(currentRole);
}
