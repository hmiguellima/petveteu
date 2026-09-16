import React from 'react';

export type ClientVaccinationView = {
  due_date: string;
  id: string;
  vaccine_type: string;
};

type ReadOnlyScheduleProps = {
  vaccinations?: ClientVaccinationView[];
};

export function ReadOnlySchedule({ vaccinations }: ReadOnlyScheduleProps): React.JSX.Element {
  return (
    <section aria-label="Calendário de vacinação" className="mt-5">
      <h3 className="font-bold">Vacinas</h3>
      {vaccinations?.length ? (
        <ul>
          {vaccinations.map((vaccination) => (
            <li className="border-b py-2" key={vaccination.id}>
              <strong>{vaccination.vaccine_type}</strong> — {vaccination.due_date}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">Sem vacinas registadas.</p>
      )}
    </section>
  );
}
