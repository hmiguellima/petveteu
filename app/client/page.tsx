import { getLocale } from 'next-intl/server';
import { requireRole } from '@/lib/auth';
import { createPet, removePet, updatePet, updateProfile } from './actions';
import { ReadOnlySchedule, type ClientVaccinationView } from './read-only-schedule';
import { getCatalog, resolveLocale, type Catalog } from '@/lib/i18n';
import { PortalHeader } from '@/app/portal-header';
import { deactivateClientRole } from '@/app/vet/membership-actions';

type PageProps = {
  searchParams?: { error?: string; status?: string };
};

type PetView = {
  birth_date_is_estimated: boolean;
  breed: string | null;
  date_of_birth: string;
  id: string;
  name: string;
  notification_expiry_years: number;
  other_species: string | null;
  species: 'cat' | 'dog' | 'other';
  vaccination_entries?: ClientVaccinationView[];
  version: number;
};

export default async function Page({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { supabase, profile, roles } = await requireRole('client');
  const messages = getCatalog(resolveLocale(await getLocale()));
  const { data: pets } = await supabase
    .from('pets')
    .select('*,vaccination_entries(id,vaccine_type,due_date)')
    .is('deleted_at', null)
    .is('vaccination_entries.deleted_at', null)
    .eq('owner_id', profile.id)
    .order('name');

  return (
    <>
      <PortalHeader
        currentPortal="client"
        privacyLabel={messages.common.privacy}
        profileName={profile.full_name}
        roles={roles}
        subtitle={messages.common.app}
        switchLabel={messages.client.clinicPortal}
        title={messages.client.hello.replace('{name}', profile.full_name)}
      />
      <Feedback error={searchParams?.error} status={searchParams?.status} messages={messages} />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="card">
          <h2 className="mb-4 text-xl font-bold">{messages.client.profile}</h2>
          <p className="mb-4 text-sm">
            {messages.client.accessEmail.replace('{email}', profile.email)}
            {profile.is_incomplete ? ` · ${messages.client.completeContact}` : ''}
          </p>
          <form action={updateProfile}>
            <input type="hidden" name="version" value={profile.version} />
            <label>
              {messages.auth.name}
              <input name="name" defaultValue={profile.full_name} />
            </label>
            <label>
              {messages.auth.phone}
              <input name="phone" defaultValue={profile.phone ?? ''} />
            </label>
            <label>
              {messages.auth.language}
              <select name="locale" defaultValue={profile.locale}>
                <option value="pt-PT">Português</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="flex">
              <input type="checkbox" name="sms" defaultChecked={profile.sms_enabled_by_client} />{' '}
              {messages.client.sms}
            </label>
            <button>{messages.common.save}</button>
          </form>
          {roles.includes('vet') ? (
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 text-sm text-slate-600">{messages.client.deactivateHelp}</p>
              <form action={deactivateClientRole}>
                <button className="bg-coral">{messages.client.deactivateClient}</button>
              </form>
            </div>
          ) : null}
          <hr className="my-6" />
          <h2 className="mb-4 text-xl font-bold">{messages.client.addPet}</h2>
          <PetForm messages={messages} />
        </aside>
        <section className="space-y-4">
          {pets?.map((pet: PetView) => (
            <article className="card" key={pet.id}>
              <div className="flex justify-between">
                <h2 className="text-2xl font-bold">{pet.name}</h2>
                <form action={removePet}>
                  <input type="hidden" name="id" value={pet.id} />
                  <input type="hidden" name="version" value={pet.version} />
                  <button className="bg-coral">{messages.common.remove}</button>
                </form>
              </div>
              <p>
                {pet.species} · {pet.date_of_birth}
                {pet.birth_date_is_estimated ? ' (estimada)' : ''} · lembretes até{' '}
                {pet.notification_expiry_years} anos
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer font-bold">{messages.client.editPet}</summary>
                <PetForm messages={messages} pet={pet} />
              </details>
              <ReadOnlySchedule
                labels={{
                  empty: messages.client.noVaccines,
                  schedule: messages.client.scheduleLabel,
                  vaccines: messages.client.schedule,
                }}
                vaccinations={pet.vaccination_entries}
              />
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function Feedback({
  error,
  status,
  messages,
}: {
  error?: string;
  status?: string;
  messages: Catalog;
}): React.JSX.Element | null {
  if (!error && !status) {
    return null;
  }

  const message = error
    ? error === 'stale'
      ? messages.validation.stale
      : error === 'client-closure'
        ? messages.client.closureRequired
        : messages.validation.invalid
    : messages.client.saved;

  return (
    <p className={`mb-5 rounded-lg p-3 ${error ? 'bg-red-100 text-red-900' : 'bg-green-100'}`}>
      {message}
    </p>
  );
}

function PetForm({ messages, pet }: { messages: Catalog; pet?: PetView }): React.JSX.Element {
  return (
    <form action={pet ? updatePet : createPet} className={pet ? 'mt-4' : undefined}>
      {pet ? (
        <>
          <input type="hidden" name="id" value={pet.id} />
          <input type="hidden" name="version" value={pet.version} />
        </>
      ) : null}
      <label>
        {messages.pet.name}
        <input required name="name" maxLength={100} defaultValue={pet?.name} />
      </label>
      <label>
        {messages.pet.species}
        <select name="species" defaultValue={pet?.species ?? 'dog'}>
          <option value="dog">{messages.pet.dog}</option>
          <option value="cat">{messages.pet.cat}</option>
          <option value="other">{messages.pet.other}</option>
        </select>
      </label>
      <label>
        {messages.pet.otherSpecies}
        <input name="otherSpecies" maxLength={60} defaultValue={pet?.other_species ?? ''} />
      </label>
      <label>
        {messages.pet.birth}
        <input required type="date" name="birth" defaultValue={pet?.date_of_birth} />
      </label>
      <label className="flex">
        <input type="checkbox" name="estimated" defaultChecked={pet?.birth_date_is_estimated} />{' '}
        {messages.pet.estimated}
      </label>
      <label>
        {messages.pet.breed}
        <input name="breed" maxLength={100} defaultValue={pet?.breed ?? ''} />
      </label>
      {pet ? (
        <p className="text-sm text-slate-600">
          {messages.client.expirySentence.replace('{years}', String(pet.notification_expiry_years))}
        </p>
      ) : null}
      <button>{pet ? messages.client.savePet : messages.client.addPet}</button>
    </form>
  );
}
