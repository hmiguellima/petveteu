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
export type Decision = {
  kind: 'eligible' | 'skip' | 'exhaust';
  reason?: string;
  recordAttempt?: boolean;
};

export function lisbonDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function wholeYears(birthDate: string, comparisonDate: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
  const [comparisonYear, comparisonMonth, comparisonDay] = comparisonDate.split('-').map(Number);
  const birthdayHasPassed =
    comparisonMonth > birthMonth || (comparisonMonth === birthMonth && comparisonDay >= birthDay);

  return comparisonYear - birthYear - (birthdayHasPassed ? 0 : 1);
}

export function decide(candidate: Candidate, today: string): Decision {
  const millisecondsPerDay = 86_400_000;
  const daysUntilDue =
    (Date.parse(`${candidate.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
    millisecondsPerDay;

  if (daysUntilDue < 0) {
    return { kind: 'exhaust', reason: 'past_due' };
  }
  if (daysUntilDue > 2) {
    return { kind: 'skip', reason: 'outside_window' };
  }
  if (candidate.reminderStatus === 'submitted' || candidate.reminderStatus === 'delivered') {
    return { kind: 'skip', reason: 'already_submitted' };
  }
  if (candidate.reminderStatus === 'permanently_skipped') {
    return {
      kind: 'skip',
      reason: candidate.permanentReason ?? 'permanently_skipped',
      recordAttempt: false,
    };
  }
  if (candidate.deletedAt) {
    return permanentDecision(candidate, 'pet_deleted');
  }
  if (!candidate.clientSms) {
    return permanentDecision(candidate, 'client_opt_out');
  }
  if (!candidate.vetSms) {
    return permanentDecision(candidate, 'vet_opt_out');
  }
  if (!candidate.phone || !/^\+[1-9]\d{7,14}$/.test(candidate.phone)) {
    return permanentDecision(candidate, 'invalid_phone');
  }
  if (wholeYears(candidate.birthDate, today) >= candidate.expiryYears) {
    return permanentDecision(candidate, 'age_expired');
  }

  return { kind: 'eligible' };
}

function permanentDecision(candidate: Candidate, reason: string): Decision {
  return {
    kind: 'skip',
    reason,
    recordAttempt: candidate.permanentReason !== reason,
  };
}
