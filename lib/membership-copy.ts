import type { Catalog } from '@/lib/i18n';

export type MembershipEvent = 'vet_activated' | 'vet_revoked' | 'vet_reinstated';

export function membershipNotificationText(
  messages: Catalog['membership'],
  event: MembershipEvent,
  subject: string,
  actor: string | null,
): string {
  const actorPhrase = actor ? messages.actorPhrase.replace('{actor}', actor) : '';

  return messages.events[event].replace('{subject}', subject).replace('{actorPhrase}', actorPhrase);
}
