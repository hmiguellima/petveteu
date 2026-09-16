import React from 'react';

export type AttemptView = {
  created_at: string;
  outcome: 'dry_run' | 'permanent_skip' | 'submitted' | 'transient_failure';
  reason_code: string | null;
};

export type ReminderView = {
  reminder_attempts?: AttemptView[];
  status: 'cancelled' | 'delivered' | 'exhausted' | 'pending' | 'permanently_skipped' | 'submitted';
};

const statusLabels: Record<ReminderView['status'], string> = {
  pending: 'pendente',
  submitted: 'submetido ao operador',
  delivered: 'entregue',
  exhausted: 'tentativas esgotadas',
  cancelled: 'cancelado',
  permanently_skipped: 'ignorado permanentemente',
};

const attemptLabels: Record<AttemptView['outcome'], string> = {
  dry_run: 'simulação (não enviado)',
  submitted: 'submetido ao operador',
  transient_failure: 'falha temporária — nova tentativa pendente',
  permanent_skip: 'ignorado permanentemente',
};

export function latestAttempt(attempts: AttemptView[] = []): AttemptView | undefined {
  return [...attempts].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
}

export function ReminderStatus({
  reminder,
}: {
  reminder?: ReminderView;
}): React.JSX.Element | null {
  if (!reminder) {
    return null;
  }

  const attempt = latestAttempt(reminder.reminder_attempts);
  const label = attempt ? attemptLabels[attempt.outcome] : statusLabels[reminder.status];

  return (
    <small className="ml-2 rounded bg-slate-100 px-2 py-1">
      {label}
      {attempt?.reason_code ? ` (${attempt.reason_code})` : ''}
    </small>
  );
}
