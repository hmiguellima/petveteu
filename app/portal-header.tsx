import Link from 'next/link';
import type { Role } from '@/lib/auth';
import { switchPortalPath } from '@/lib/auth-routing';

export function PortalHeader({
  currentPortal,
  privacyLabel,
  profileName,
  roles,
  subtitle,
  switchLabel,
  title,
}: {
  currentPortal: Role;
  privacyLabel: string;
  profileName: string;
  roles: readonly Role[];
  subtitle: string;
  switchLabel: string;
  title: string;
}): React.JSX.Element {
  const otherPortal = switchPortalPath(roles, currentPortal);

  return (
    <header className="mb-8 flex justify-between gap-4">
      <div>
        <p className="text-sage">{subtitle}</p>
        <h1 className="text-4xl font-bold">{title}</h1>
        <p>{profileName}</p>
      </div>
      <nav className="flex flex-wrap items-start justify-end gap-3">
        {otherPortal ? (
          <Link className="button" href={otherPortal}>
            {switchLabel}
          </Link>
        ) : null}
        <Link href="/privacy">{privacyLabel}</Link>
      </nav>
    </header>
  );
}
