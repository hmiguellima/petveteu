type ReminderRunResponse = {
  ok?: boolean;
  skipped?: string;
};

export function reminderRunPath(data: unknown, error: unknown): string {
  if (error || !data || typeof data !== 'object') {
    return '/vet?error=reminder-run';
  }

  const response = data as ReminderRunResponse;
  if (response.skipped === 'already_running_or_succeeded') {
    return '/vet?status=reminder-run-skipped';
  }

  return response.ok ? '/vet?status=reminder-run-completed' : '/vet?error=reminder-run';
}
