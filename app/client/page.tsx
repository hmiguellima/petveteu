import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createPet, removePet, updatePet, updateProfile } from './actions';
import { ReadOnlySchedule, type ClientVaccinationView } from './read-only-schedule';

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
  const { supabase, profile } = await requireRole('client');
  const { data: pets } = await supabase
    .from('pets')
    .select('*,vaccination_entries(id,vaccine_type,due_date)')
    .eq('owner_id', profile.id)
    .order('name');

  return (
    <>
      <header className="mb-8 flex justify-between">
        <div>
          <p className="text-sage">PetVet EU</p>
          <h1 className="text-4xl font-bold">Olá, {profile.full_name}</h1>
        </div>
        <Link href="/privacy">Privacidade</Link>
      </header>
      <Feedback error={searchParams?.error} status={searchParams?.status} />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="card">
          <h2 className="mb-4 text-xl font-bold">O meu perfil</h2>
          <p className="mb-4 text-sm">
            Email de acesso: {profile.email}
            {profile.is_incomplete ? ' · complete o contacto para ativar os lembretes' : ''}
          </p>
          <form action={updateProfile}>
            <input type="hidden" name="version" value={profile.version} />
            <label>
              Nome
              <input name="name" defaultValue={profile.full_name} />
            </label>
            <label>
              Telemóvel
              <input name="phone" defaultValue={profile.phone ?? ''} />
            </label>
            <label>
              Idioma
              <select name="locale" defaultValue={profile.locale}>
                <option value="pt-PT">Português</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="flex">
              <input type="checkbox" name="sms" defaultChecked={profile.sms_enabled_by_client} />{' '}
              Receber lembretes SMS
            </label>
            <button>Guardar</button>
          </form>
          <hr className="my-6" />
          <h2 className="mb-4 text-xl font-bold">Adicionar animal</h2>
          <PetForm />
        </aside>
        <section className="space-y-4">
          {pets?.map((pet: PetView) => (
            <article className="card" key={pet.id}>
              <div className="flex justify-between">
                <h2 className="text-2xl font-bold">{pet.name}</h2>
                <form action={removePet}>
                  <input type="hidden" name="id" value={pet.id} />
                  <input type="hidden" name="version" value={pet.version} />
                  <button className="bg-coral">Remover</button>
                </form>
              </div>
              <p>
                {pet.species} · {pet.date_of_birth}
                {pet.birth_date_is_estimated ? ' (estimada)' : ''} · lembretes até{' '}
                {pet.notification_expiry_years} anos
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer font-bold">Editar dados</summary>
                <PetForm pet={pet} />
              </details>
              <ReadOnlySchedule vaccinations={pet.vaccination_entries} />
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
}: {
  error?: string;
  status?: string;
}): React.JSX.Element | null {
  if (!error && !status) {
    return null;
  }

  const message = error
    ? error === 'stale'
      ? 'O registo foi alterado entretanto. Reveja os dados atuais e tente novamente.'
      : 'Não foi possível guardar. Confirme todos os campos e tente novamente.'
    : 'Alterações guardadas.';

  return (
    <p className={`mb-5 rounded-lg p-3 ${error ? 'bg-red-100 text-red-900' : 'bg-green-100'}`}>
      {message}
    </p>
  );
}

function PetForm({ pet }: { pet?: PetView }): React.JSX.Element {
  return (
    <form action={pet ? updatePet : createPet} className={pet ? 'mt-4' : undefined}>
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
      {pet ? (
        <p className="text-sm text-slate-600">
          A clínica definiu o fim dos lembretes aos {pet.notification_expiry_years} anos.
        </p>
      ) : null}
      <button>{pet ? 'Guardar animal' : 'Adicionar'}</button>
    </form>
  );
}
