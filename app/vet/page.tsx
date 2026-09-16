import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import {
  changeClientEmail,
  createVetPet,
  inviteClient,
  manualRun,
  removeVetPet,
  resendClientInvite,
  saveVaccine,
  updateClient,
  updateVetPet,
} from './actions';

type PageProps = { searchParams?: { error?: string; status?: string } };
type ClientView = {
  email: string;
  full_name: string;
  id: string;
  is_incomplete: boolean;
  locale: 'en' | 'pt-PT';
  phone: string | null;
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
          <p className="text-sage">PetVet EU</p>
          <h1 className="text-4xl font-bold">Área veterinária</h1>
          <p>{profile.full_name}</p>
        </div>
        <Link href="/privacy">Privacidade</Link>
      </header>
      <Feedback error={searchParams?.error} status={searchParams?.status} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-2xl font-bold">Clientes</h2>
          <details className="card mb-3">
            <summary className="cursor-pointer font-bold">Adicionar cliente</summary>
            <form action={inviteClient} className="mt-4">
              <label>
                Nome
                <input required name="name" maxLength={120} />
              </label>
              <label>
                Email
                <input required name="email" type="email" />
              </label>
              <label>
                Telefone
                <input required name="phone" type="tel" placeholder="+351912345678" />
              </label>
              <label>
                Idioma
                <select name="locale" defaultValue="pt-PT">
                  <option value="pt-PT">Português</option>
                  <option value="en">English</option>
                </select>
              </label>
              <button>Enviar convite</button>
            </form>
          </details>
          <div className="space-y-3">
            {clients?.map((client: ClientView) => (
              <article className="card" key={client.id}>
                <form action={updateClient}>
                  <input type="hidden" name="id" value={client.id} />
                  <input type="hidden" name="version" value={client.version} />
                  <label>
                    Nome
                    <input name="name" defaultValue={client.full_name} />
                  </label>
                  <p className="text-sm">
                    {client.email}
                    {client.is_incomplete ? ' · contacto incompleto' : ''}
                  </p>
                  <label>
                    Telefone
                    <input name="phone" defaultValue={client.phone ?? ''} />
                  </label>
                  <label>
                    Idioma
                    <select name="locale" defaultValue={client.locale}>
                      <option value="pt-PT">Português</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label className="flex">
                    <input type="checkbox" name="sms" defaultChecked={client.sms_enabled_by_vet} />{' '}
                    SMS autorizado pela clínica
                  </label>
                  <button>Guardar</button>
                </form>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold">Acesso e email</summary>
                  <form action={changeClientEmail} className="mt-3">
                    <input type="hidden" name="id" value={client.id} />
                    <label>
                      Novo email
                      <input required name="email" type="email" defaultValue={client.email} />
                    </label>
                    <button>Alterar email de acesso</button>
                  </form>
                  <form action={resendClientInvite} className="mt-3">
                    <input type="hidden" name="id" value={client.id} />
                    <button>Reenviar convite</button>
                  </form>
                </details>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold">Adicionar animal</summary>
                  <VetPetForm ownerId={client.id} />
                </details>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-2xl font-bold">Animais e vacinas</h2>
          <div className="space-y-3">
            {pets?.map((pet: PetView) => (
              <article className="card" key={pet.id}>
                <div className="flex justify-between">
                  <h3 className="text-xl font-bold">{pet.name}</h3>
                  <form action={removeVetPet}>
                    <input type="hidden" name="id" value={pet.id} />
                    <input type="hidden" name="version" value={pet.version} />
                    <button className="bg-coral">Remover</button>
                  </form>
                </div>
                <p>
                  {pet.species} · expira aos {pet.notification_expiry_years} anos
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer font-bold">Editar animal</summary>
                  <VetPetForm ownerId={pet.owner_id} pet={pet} />
                </details>
                <ul className="my-3">
                  {pet.vaccination_entries?.map((vaccination: VaccinationView) => (
                    <li key={vaccination.id}>
                      {vaccination.vaccine_type} — {vaccination.due_date}{' '}
                      <Status reminder={vaccination.reminders?.at(-1)} />
                    </li>
                  ))}
                </ul>
                <form action={saveVaccine}>
                  <input type="hidden" name="petId" value={pet.id} />
                  <label>
                    Vacina
                    <input name="type" required maxLength={120} />
                  </label>
                  <label>
                    Data prevista
                    <input name="due" required type="date" />
                  </label>
                  <label>
                    Administrada
                    <input name="admin" type="date" />
                  </label>
                  <label>
                    Notas
                    <textarea name="notes" maxLength={2000} />
                  </label>
                  <button>Adicionar vacina</button>
                </form>
              </article>
            ))}
          </div>
          <div className="card mt-4">
            <h2 className="font-bold">Execuções</h2>
            <form action={manualRun}>
              <button>Executar hoje</button>
            </form>
            {runs?.map((run) => (
              <p key={run.id}>
                {run.business_date}: {run.status}
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
  status,
}: {
  error?: string;
  status?: string;
}): React.JSX.Element | null {
  if (!error && !status) {
    return null;
  }

  const message = error
    ? error === 'stale'
      ? 'O registo mudou entretanto. Reveja os dados atuais.'
      : 'Não foi possível concluir. Confirme os dados; o email e o telefone têm de ser únicos.'
    : 'Operação concluída.';

  return (
    <p className={`mb-5 rounded-lg p-3 ${error ? 'bg-red-100 text-red-900' : 'bg-green-100'}`}>
      {message}
    </p>
  );
}

function VetPetForm({ ownerId, pet }: { ownerId: string; pet?: PetView }): React.JSX.Element {
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
        Nome
        <input required name="name" maxLength={100} defaultValue={pet?.name} />
      </label>
      <label>
        Espécie
        <select name="species" defaultValue={pet?.species ?? 'dog'}>
          <option value="dog">Cão</option>
          <option value="cat">Gato</option>
          <option value="other">Outra</option>
        </select>
      </label>
      <label>
        Outra espécie
        <input name="otherSpecies" maxLength={60} defaultValue={pet?.other_species ?? ''} />
      </label>
      <label>
        Nascimento
        <input required type="date" name="birth" defaultValue={pet?.date_of_birth} />
      </label>
      <label className="flex">
        <input type="checkbox" name="estimated" defaultChecked={pet?.birth_date_is_estimated} />{' '}
        Data estimada
      </label>
      <label>
        Raça
        <input name="breed" maxLength={100} defaultValue={pet?.breed ?? ''} />
      </label>
      <label>
        Fim dos lembretes (anos)
        <input
          name="expiry"
          type="number"
          min={1}
          max={50}
          defaultValue={pet?.notification_expiry_years}
          placeholder="Padrão da espécie"
        />
      </label>
      <button>{pet ? 'Guardar animal' : 'Adicionar animal'}</button>
    </form>
  );
}
type ReminderStatus =
  'pending' | 'submitted' | 'delivered' | 'exhausted' | 'cancelled' | 'permanently_skipped';
type ReminderView = {
  status: ReminderStatus;
  reminder_attempts?: Array<{ outcome: string }>;
};
type VaccinationView = {
  id: string;
  vaccine_type: string;
  due_date: string;
  reminders?: ReminderView[];
};

function Status({ reminder }: { reminder?: ReminderView }): React.JSX.Element | null {
  if (!reminder) {
    return null;
  }
  const last = reminder.reminder_attempts?.at(-1);
  const labels: Record<ReminderStatus, string> = {
    pending: 'pendente',
    submitted: 'submetido',
    delivered: 'entregue',
    exhausted: 'esgotado',
    cancelled: 'cancelado',
    permanently_skipped: 'ignorado permanentemente',
  };

  return (
    <small className="ml-2 rounded bg-slate-100 px-2 py-1">
      {last?.outcome === 'dry_run' ? 'simulação (não enviado)' : labels[reminder.status]}
    </small>
  );
}
