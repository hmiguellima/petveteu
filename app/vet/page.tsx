import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { manualRun, saveVaccine, updateClient } from './actions';

export default async function Page(): Promise<React.JSX.Element> {
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
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-2xl font-bold">Clientes</h2>
          <div className="space-y-3">
            {clients?.map((client) => (
              <form className="card" action={updateClient} key={client.id}>
                <input type="hidden" name="id" value={client.id} />
                <input type="hidden" name="version" value={client.version} />
                <label>
                  Nome
                  <input name="name" defaultValue={client.full_name} />
                </label>
                <p className="text-sm">{client.email}</p>
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
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-2xl font-bold">Animais e vacinas</h2>
          <div className="space-y-3">
            {pets?.map((pet) => (
              <article className="card" key={pet.id}>
                <h3 className="text-xl font-bold">{pet.name}</h3>
                <p>
                  {pet.species} · expira aos {pet.notification_expiry_years} anos
                </p>
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
