import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getCatalog, resolveLocale, type Catalog } from '@/lib/i18n';
import {
  changeClientEmail,
  createVetPet,
  manualRun,
  removeVetPet,
  removeVaccine,
  resendClientInvite,
  saveVaccine,
  updateClient,
  updateVetPet,
} from './actions';
import { InviteClientForm } from './invite-client-form';
import { ReminderStatus, type ReminderStatusLabels, type ReminderView } from './reminder-status';

type PageProps = { searchParams?: { error?: string; status?: string } };
type RunStatus = 'failed' | 'running' | 'succeeded';
type ClientView = {
  email: string;
  full_name: string;
  id: string;
  is_incomplete: boolean;
  locale: 'en' | 'pt-PT';
  phone: string | null;
  sms_enabled_by_client: boolean;
  sms_enabled_by_vet: boolean;
  version: number;
};
type PetView = {
  birth_date_is_estimated: boolean;
  breed: string | null;
  date_of_birth: string;
  id: string;
  name: string;
  notification_expiry_years: number;
  other_species: string | null;
  owner_id: string;
  species: 'cat' | 'dog' | 'other';
  vaccination_entries?: VaccinationView[];
  version: number;
};

// The portal intentionally keeps its two registry columns together so their server-fetched
// snapshots and concurrency versions are rendered atomically.
// eslint-disable-next-line max-lines-per-function
export default async function Page({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { supabase, profile } = await requireRole('vet');
  const messages = getCatalog(resolveLocale(await getLocale()));
  const [{ data: clients }, { data: pets }, { data: runs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'client').order('full_name'),
    supabase
      .from('pets')
      .select('*,vaccination_entries(*,reminders(*,reminder_attempts(*)))')
      .order('name'),
    supabase
      .from('reminder_job_runs')
      .select('*')
      .order('business_date', { ascending: false })
      .limit(10),
  ]);

  return (
    <>
      <header className="mb-8 flex justify-between">
        <div>
          <p className="text-sage">{messages.common.app}</p>
          <h1 className="text-4xl font-bold">{messages.vet.title}</h1>
          <p>{profile.full_name}</p>
        </div>
        <Link href="/privacy">{messages.common.privacy}</Link>
      </header>
      <Feedback error={searchParams?.error} messages={messages} status={searchParams?.status} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-2xl font-bold">{messages.vet.clients}</h2>
          <details className="card mb-3">
            <summary className="cursor-pointer font-bold">{messages.vet.addClient}</summary>
            <InviteClientForm messages={messages} />
          </details>
          <div className="space-y-3">
            {clients?.map((client: ClientView) => (
              <article className="card" key={client.id}>
                <form action={updateClient}>
                  <input type="hidden" name="id" value={client.id} />
                  <input type="hidden" name="version" value={client.version} />
                  <label>
                    {messages.auth.name}
                    <input name="name" defaultValue={client.full_name} />
                  </label>
                  <p className="text-sm">
                    {client.email}
                    {client.is_incomplete ? ` · ${messages.vet.incompleteContact}` : ''}
                  </p>
                  <label>
                    {messages.auth.phone}
                    <input name="phone" defaultValue={client.phone ?? ''} />
                  </label>
                  <label>
                    {messages.auth.language}
                    <select name="locale" defaultValue={client.locale}>
                      <option value="pt-PT">Português</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label className="flex">
                    <input type="checkbox" name="sms" defaultChecked={client.sms_enabled_by_vet} />{' '}
                    {messages.vet.clinicSms}
                  </label>
                  <p className="text-sm text-slate-600">
                    {messages.vet.clientPreference.replace(
                      '{status}',
                      client.sms_enabled_by_client ? messages.vet.enabled : messages.vet.disabled,
                    )}{' '}
                    ·{' '}
                    {messages.vet.effectiveDelivery.replace(
                      '{status}',
                      client.sms_enabled_by_client && client.sms_enabled_by_vet
                        ? messages.vet.active
                        : messages.vet.blocked,
                    )}
                  </p>
                  <button>{messages.common.save}</button>
                </form>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold">
                    {messages.vet.accessAndEmail}
                  </summary>
                  <form action={changeClientEmail} className="mt-3">
                    <input type="hidden" name="id" value={client.id} />
                    <label>
                      {messages.vet.newEmail}
                      <input required name="email" type="email" defaultValue={client.email} />
                    </label>
                    <button>{messages.vet.changeEmail}</button>
                  </form>
                  <form action={resendClientInvite} className="mt-3">
                    <input type="hidden" name="id" value={client.id} />
                    <button>{messages.vet.resendInvite}</button>
                  </form>
                </details>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold">
                    {messages.vet.addPet}
                  </summary>
                  <VetPetForm messages={messages} ownerId={client.id} />
                </details>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-2xl font-bold">{messages.vet.petsAndVaccines}</h2>
          <div className="space-y-3">
            {pets?.map((pet: PetView) => (
              <article className="card" key={pet.id}>
                <div className="flex justify-between">
                  <h3 className="text-xl font-bold">{pet.name}</h3>
                  <form action={removeVetPet}>
                    <input type="hidden" name="id" value={pet.id} />
                    <input type="hidden" name="version" value={pet.version} />
                    <button className="bg-coral">{messages.common.remove}</button>
                  </form>
                </div>
                <p>
                  {messages.vet.petSummary
                    .replace('{species}', messages.pet[pet.species])
                    .replace('{years}', String(pet.notification_expiry_years))}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer font-bold">{messages.vet.editPet}</summary>
                  <VetPetForm messages={messages} ownerId={pet.owner_id} pet={pet} />
                </details>
                <ul className="my-3">
                  {pet.vaccination_entries?.map((vaccination: VaccinationView) => (
                    <li className="border-b py-3" key={vaccination.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong>{vaccination.vaccine_type}</strong> — {vaccination.due_date}{' '}
                          <ReminderStatus
                            labels={reminderStatusLabels(messages)}
                            reminder={vaccination.reminders?.at(-1)}
                          />
                          {vaccination.last_administered_date ? (
                            <p className="text-sm">
                              {messages.vaccine.administered}: {vaccination.last_administered_date}
                            </p>
                          ) : null}
                          {vaccination.notes ? (
                            <p className="whitespace-pre-wrap text-sm">{vaccination.notes}</p>
                          ) : null}
                        </div>
                        <form action={removeVaccine}>
                          <input type="hidden" name="id" value={vaccination.id} />
                          <input type="hidden" name="version" value={vaccination.version} />
                          <button className="bg-coral">{messages.vet.removeVaccine}</button>
                        </form>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-bold">
                          {messages.vet.editVaccine}
                        </summary>
                        <VaccinationForm
                          messages={messages}
                          petId={pet.id}
                          vaccination={vaccination}
                        />
                      </details>
                    </li>
                  ))}
                </ul>
                <VaccinationForm messages={messages} petId={pet.id} />
              </article>
            ))}
          </div>
          <div className="card mt-4">
            <h2 className="font-bold">{messages.vet.runs}</h2>
            <p className="mb-3 text-sm text-slate-600">{messages.vet.runTodayHelp}</p>
            <form action={manualRun}>
              <button>{messages.vet.runToday}</button>
            </form>
            {runs?.map((run) => (
              <p key={run.id}>
                {run.business_date}: {runStatusLabel(messages, run.status as RunStatus)}
              </p>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Feedback({
  error,
  messages,
  status,
}: {
  error?: string;
  messages: Catalog;
  status?: string;
}): React.JSX.Element | null {
  if (!error && !status) {
    return null;
  }

  const message = error
    ? error === 'stale'
      ? messages.validation.stale
      : error === 'duplicate-vaccine'
        ? messages.vet.duplicateVaccine
        : error === 'invalid-vaccine'
          ? messages.vet.invalidVaccine
          : messages.vet.invalid
    : messages.vet.saved;

  return (
    <p className={`mb-5 rounded-lg p-3 ${error ? 'bg-red-100 text-red-900' : 'bg-green-100'}`}>
      {message}
    </p>
  );
}

function VetPetForm({
  messages,
  ownerId,
  pet,
}: {
  messages: Catalog;
  ownerId: string;
  pet?: PetView;
}): React.JSX.Element {
  return (
    <form action={pet ? updateVetPet : createVetPet} className="mt-4">
      <input type="hidden" name="ownerId" value={ownerId} />
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
      <label>
        {messages.pet.expiry}
        <input
          name="expiry"
          type="number"
          min={1}
          max={50}
          defaultValue={pet?.notification_expiry_years}
          placeholder={messages.pet.expiryDefault}
        />
      </label>
      <button>{pet ? messages.client.savePet : messages.vet.addPet}</button>
    </form>
  );
}
type VaccinationView = {
  last_administered_date: string | null;
  notes: string | null;
  id: string;
  vaccine_type: string;
  due_date: string;
  reminders?: ReminderView[];
  version: number;
};

function VaccinationForm({
  messages,
  petId,
  vaccination,
}: {
  messages: Catalog;
  petId: string;
  vaccination?: VaccinationView;
}): React.JSX.Element {
  return (
    <form action={saveVaccine} className="mt-3">
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="id" value={vaccination?.id ?? ''} />
      <input type="hidden" name="version" value={vaccination?.version ?? 0} />
      <label>
        {messages.vaccine.type}
        <input name="type" required maxLength={120} defaultValue={vaccination?.vaccine_type} />
      </label>
      <label>
        {messages.vaccine.due}
        <input name="due" required type="date" defaultValue={vaccination?.due_date} />
      </label>
      <label>
        {messages.vaccine.administered}
        <input name="admin" type="date" defaultValue={vaccination?.last_administered_date ?? ''} />
      </label>
      <label>
        {messages.vaccine.notes}
        <textarea name="notes" maxLength={2000} defaultValue={vaccination?.notes ?? ''} />
      </label>
      <button>{vaccination ? messages.vet.saveVaccine : messages.vet.addVaccine}</button>
    </form>
  );
}

function reminderStatusLabels(messages: Catalog): ReminderStatusLabels {
  return {
    attempts: {
      dry_run: messages.vaccine.dryRun,
      permanent_skip: messages.vaccine.permanentlySkipped,
      submitted: messages.vaccine.submitted,
      transient_failure: messages.vaccine.transientFailure,
    },
    statuses: {
      cancelled: messages.vaccine.cancelled,
      delivered: messages.vaccine.delivered,
      exhausted: messages.vaccine.exhausted,
      pending: messages.vaccine.pending,
      permanently_skipped: messages.vaccine.permanentlySkipped,
      submitted: messages.vaccine.submitted,
    },
  };
}

function runStatusLabel(messages: Catalog, status: RunStatus): string {
  const labels: Record<RunStatus, string> = {
    failed: messages.vet.runFailed,
    running: messages.vet.runRunning,
    succeeded: messages.vet.runSucceeded,
  };

  return labels[status];
}
