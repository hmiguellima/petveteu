import Link from 'next/link';
import type { Catalog } from '@/lib/i18n';
import {
  activateClientRole,
  cancelVetInvitation,
  inviteVet,
  resendVetInvitation,
  revokeVet,
} from './membership-actions';

export type MembershipInvitation = { email: string; expires_at: string; id: string };
export type MembershipVet = { email: string; full_name: string; id: string };

export function MembershipPanel({
  currentProfileId,
  hasClientRole,
  invitations,
  locale,
  messages,
  noticeVersion,
  vets,
}: {
  currentProfileId: string;
  hasClientRole: boolean;
  invitations: MembershipInvitation[];
  locale: 'en' | 'pt-PT';
  messages: Catalog;
  noticeVersion: string;
  vets: MembershipVet[];
}): React.JSX.Element {
  const canRevokeOthers = vets.length > 1;
  const dateLocale = locale === 'en' ? 'en-GB' : 'pt-PT';

  return (
    <section className="card mb-6">
      <h2 className="text-2xl font-bold">{messages.membership.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{messages.membership.equalAuthority}</p>
      <form action={inviteVet} className="mt-4">
        <label>
          {messages.membership.email}
          <input name="email" required type="email" />
        </label>
        <button>{messages.membership.invite}</button>
      </form>
      <h3 className="mt-6 font-bold">{messages.membership.activeVets}</h3>
      {canRevokeOthers ? null : (
        <p className="text-sm text-slate-600">{messages.membership.finalVet}</p>
      )}
      <ul className="mt-2 space-y-2">
        {vets.length === 0 ? <li>{messages.membership.noVets}</li> : null}
        {vets.map((vet) => (
          <li className="flex flex-wrap items-center gap-2" key={vet.id}>
            <span>
              {vet.full_name} · {vet.email}
              {vet.id === currentProfileId ? ` · ${messages.membership.you}` : ''}
            </span>
            {vet.id !== currentProfileId && canRevokeOthers ? (
              <form action={revokeVet}>
                <input type="hidden" name="profileId" value={vet.id} />
                <button className="bg-coral">{messages.membership.revoke}</button>
              </form>
            ) : vet.id === currentProfileId ? null : (
              <span className="text-sm text-slate-600">{messages.membership.finalVet}</span>
            )}
          </li>
        ))}
      </ul>
      <h3 className="mt-6 font-bold">{messages.membership.pendingInvites}</h3>
      <ul className="mt-2 space-y-2">
        {invitations.length === 0 ? <li>{messages.membership.noInvites}</li> : null}
        {invitations.map((item) => (
          <li className="flex flex-wrap items-center gap-2" key={item.id}>
            <span>
              {item.email} ·{' '}
              {messages.membership.expires.replace(
                '{when}',
                new Date(item.expires_at).toLocaleString(dateLocale, { timeZone: 'Europe/Lisbon' }),
              )}
            </span>
            <form action={resendVetInvitation}>
              <input type="hidden" name="invitationId" value={item.id} />
              <button>{messages.membership.resend}</button>
            </form>
            <form action={cancelVetInvitation}>
              <input type="hidden" name="invitationId" value={item.id} />
              <button className="bg-coral">{messages.membership.cancel}</button>
            </form>
          </li>
        ))}
      </ul>
      {hasClientRole ? null : (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-bold">{messages.membership.activateClient}</h3>
          <p className="mt-2 text-sm text-slate-600">{messages.membership.privacy}</p>
          <Link className="mt-2 inline-block underline" href="/privacy" target="_blank">
            {messages.membership.noticeLink}
          </Link>
          <form action={activateClientRole} className="mt-3">
            <input type="hidden" name="noticeVersion" value={noticeVersion} />
            <label className="flex items-start gap-2">
              <input required type="checkbox" name="noticePresented" />
              {messages.membership.confirmNotice}
            </label>
            <button>{messages.membership.activateClient}</button>
          </form>
        </div>
      )}
    </section>
  );
}
