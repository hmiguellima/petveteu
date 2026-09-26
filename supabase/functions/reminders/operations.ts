export type RunStatus = 'running' | 'succeeded' | 'failed';

export type RunSummary = {
  status: RunStatus;
};

export type RunHealth = 'healthy' | 'failed' | 'missing';

export function runHealth(runs: RunSummary[]): RunHealth {
  if (runs.some((run) => run.status === 'succeeded')) {
    return 'healthy';
  }

  return runs.some((run) => run.status === 'failed') ? 'failed' : 'missing';
}

export function hasValidCronCredential(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret) {
    return false;
  }

  return authorizationHeader === `Bearer ${expectedSecret}`;
}
