export type Candidate = {
  entryId: string;
  dueDate: string;
  petName: string;
  birthDate: string;
  expiryYears: number;
  deletedAt: string | null;
  phone: string | null;
  clientSms: boolean;
  vetSms: boolean;
  locale: 'pt-PT' | 'en';
  vaccineType: string;
  reminderStatus?: string;
  permanentReason?: string | null;
};
export type Decision = { kind: 'eligible' | 'skip' | 'exhaust'; reason?: string };
export function lisbonDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function wholeYears(birth: string, on: string) {
  const b = birth.split('-').map(Number),
    d = on.split('-').map(Number);
  return d[0] - b[0] - (d[1] < b[1] || (d[1] === b[1] && d[2] < b[2]) ? 1 : 0);
}
export function decide(c: Candidate, today: string): Decision {
  const delta =
    (Date.parse(c.dueDate + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000;
  if (delta < 0) return { kind: 'exhaust', reason: 'past_due' };
  if (delta > 2) return { kind: 'skip', reason: 'outside_window' };
  if (c.reminderStatus === 'submitted' || c.reminderStatus === 'delivered')
    return { kind: 'skip', reason: 'already_submitted' };
  if (c.permanentReason) return { kind: 'skip', reason: c.permanentReason };
  if (c.deletedAt) return { kind: 'skip', reason: 'pet_deleted' };
  if (!c.clientSms) return { kind: 'skip', reason: 'client_opt_out' };
  if (!c.vetSms) return { kind: 'skip', reason: 'vet_opt_out' };
  if (!c.phone || !/^\+[1-9]\d{7,14}$/.test(c.phone))
    return { kind: 'skip', reason: 'invalid_phone' };
  if (wholeYears(c.birthDate, today) >= c.expiryYears)
    return { kind: 'skip', reason: 'age_expired' };
  return { kind: 'eligible' };
}
