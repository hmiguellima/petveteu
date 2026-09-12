import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createPet, removePet, updateProfile } from './actions';

export default async function Page(): Promise<React.JSX.Element> {
  const { supabase, profile } = await requireRole('client');
  const { data: pets } = await supabase
    .from('pets')
    .select('*,vaccination_entries(*,reminders(*,reminder_attempts(*)))')
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
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="card">
          <h2 className="mb-4 text-xl font-bold">O meu perfil</h2>
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
          {pets?.map((pet) => (
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
              <h3 className="mt-5 font-bold">Vacinas</h3>
              {pet.vaccination_entries?.length ? (
                <ul>
                  {pet.vaccination_entries.map(
                    (vaccination: { id: string; vaccine_type: string; due_date: string }) => (
                      <li className="border-b py-2" key={vaccination.id}>
                        <strong>{vaccination.vaccine_type}</strong> — {vaccination.due_date}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-slate-500">Sem vacinas registadas.</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function PetForm(): React.JSX.Element {
  return (
    <form action={createPet}>
      <label>
        Nome
        <input required name="name" maxLength={100} />
      </label>
      <label>
        Espécie
        <select name="species">
          <option value="dog">Cão</option>
          <option value="cat">Gato</option>
          <option value="other">Outra</option>
        </select>
      </label>
      <label>
        Outra espécie
        <input name="otherSpecies" maxLength={60} />
      </label>
      <label>
        Nascimento
        <input required type="date" name="birth" />
      </label>
      <label className="flex">
        <input type="checkbox" name="estimated" /> Data estimada
      </label>
      <label>
        Raça
        <input name="breed" maxLength={100} />
      </label>
      <button>Adicionar</button>
    </form>
  );
}
