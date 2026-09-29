import type { Catalog } from '@/lib/i18n';
import { membershipNotificationText, type MembershipEvent } from '@/lib/membership-copy';
import { markNotificationRead } from './membership-actions';

export type MembershipNotification = {
  actor_name: string | null;
  created_at: string;
  event: MembershipEvent;
  id: string;
  read_at: string | null;
  subject_name: string;
};

export function NotificationsPanel({
  locale,
  messages,
  notifications,
}: {
  locale: 'en' | 'pt-PT';
  messages: Catalog;
  notifications: MembershipNotification[];
}): React.JSX.Element {
  const dateLocale = locale === 'en' ? 'en-GB' : 'pt-PT';

  return (
    <section className="card mb-6">
      <h2 className="text-2xl font-bold">{messages.membership.notifications}</h2>
      {notifications.length === 0 ? (
        <p className="mt-3">{messages.membership.noNotifications}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {notifications.map((item) => (
            <li className="border-b pb-3" key={item.id}>
              <p>
                {membershipNotificationText(
                  messages.membership,
                  item.event,
                  item.subject_name,
                  item.actor_name,
                )}
              </p>
              <p className="text-sm text-slate-600">
                {new Date(item.created_at).toLocaleString(dateLocale, {
                  timeZone: 'Europe/Lisbon',
                })}
                {item.read_at ? null : ` · ${messages.membership.unread}`}
              </p>
              {item.read_at ? null : (
                <form action={markNotificationRead} className="mt-2">
                  <input type="hidden" name="notificationId" value={item.id} />
                  <button>{messages.membership.markRead}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
