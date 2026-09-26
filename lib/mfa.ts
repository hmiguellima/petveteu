export type AuthenticatorAssuranceLevel = string | null | undefined;

export function vetMfaRequirementIsSatisfied(
  mfaRequired: boolean,
  currentLevel: AuthenticatorAssuranceLevel,
): boolean {
  return !mfaRequired || currentLevel === 'aal2';
}
