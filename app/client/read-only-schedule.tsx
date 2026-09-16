import React from 'react';

export type ClientVaccinationView = {
  due_date: string;
  id: string;
  vaccine_type: string;
};

type ReadOnlyScheduleProps = {
  vaccinations?: ClientVaccinationView[];
  labels?: {
    empty: string;
    schedule: string;
    vaccines: string;
  };
};

export function ReadOnlySchedule({
  labels = {
    empty: 'Sem vacinas registadas.',
    schedule: 'Calendário de vacinação',
    vaccines: 'Vacinas',
  },
  vaccinations,
}: ReadOnlyScheduleProps): React.JSX.Element {
  return (
    <section aria-label={labels.schedule} className="mt-5">
      <h3 className="font-bold">{labels.vaccines}</h3>
      {vaccinations?.length ? (
        <ul>
          {vaccinations.map((vaccination) => (
            <li className="border-b py-2" key={vaccination.id}>
              <strong>{vaccination.vaccine_type}</strong> — {vaccination.due_date}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">{labels.empty}</p>
      )}
    </section>
  );
}
