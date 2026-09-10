import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { manualRun, saveVaccine, updateClient } from './actions';
export default async function Page() {
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
            {clients?.map((c) => (
              <form className="card" action={updateClient} key={c.id}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="version" value={c.version} />
                <label>
                  Nome
                  <input name="name" defaultValue={c.full_name} />
                </label>
                <p className="text-sm">{c.email}</p>
                <label>
                  Telefone
                  <input name="phone" defaultValue={c.phone ?? ''} />
                </label>
                <label>
                  Idioma
                  <select name="locale" defaultValue={c.locale}>
                    <option value="pt-PT">Português</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="flex">
                  <input type="checkbox" name="sms" defaultChecked={c.sms_enabled_by_vet} /> SMS
                  autorizado pela clínica
                </label>
                <button>Guardar</button>
              </form>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-2xl font-bold">Animais e vacinas</h2>
          <div className="space-y-3">
            {pets?.map((p) => (
              <article className="card" key={p.id}>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p>
                  {p.species} · expira aos {p.notification_expiry_years} anos
                </p>
                <ul className="my-3">
                  {p.vaccination_entries?.map((v: VaccinationView) => (
                    <li key={v.id}>
                      {v.vaccine_type} — {v.due_date} <Status reminder={v.reminders?.at(-1)} />
                    </li>
                  ))}
                </ul>
                <form action={saveVaccine}>
                  <input type="hidden" name="petId" value={p.id} />
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
            {runs?.map((r) => (
              <p key={r.id}>
                {r.business_date}: {r.status}
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

function Status({ reminder }: { reminder?: ReminderView }) {
  if (!reminder) return null;
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
