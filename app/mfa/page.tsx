import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/auth';
import { getCatalog, resolveLocale } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';
import { MfaFlow } from './mfa-flow';

export default async function Page(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_roles(role),full_name,locale,version')
    .eq('id', user.id)
    .single();
  const roles = profile?.account_roles.map(({ role }: { role: Role }) => role) ?? [];
  if (!roles.includes('vet')) {
    redirect(roles.includes('client') ? '/client' : '/sign-in?error=profile');
  }

  const messages = getCatalog(resolveLocale(await getLocale()));

  return (
    <section className="mx-auto mt-20 max-w-md card">
      <h1 className="text-2xl font-bold">{messages.mfa.title}</h1>
      <p className="mt-3">{messages.mfa.instructions}</p>
      <MfaFlow
        initialFullName={profile.full_name}
        initialLocale={profile.locale}
        messages={{
          ...messages.mfa,
          language: messages.auth.language,
          name: messages.auth.name,
        }}
        profileVersion={profile.version}
      />
    </section>
  );
}
