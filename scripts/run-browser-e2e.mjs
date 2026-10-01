/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/typedef */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { openSync, closeSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:net';

await mkdir('.e2e', { recursive: true });
const lockPath = '.e2e/run.lock';
let lock;
try {
  lock = openSync(lockPath, 'wx', 0o600);
} catch {
  throw new Error(
    'Another E2E run owns .e2e/run.lock. If it crashed, verify no runner is active before removing that lock.',
  );
}
writeFileSync(lock, String(process.pid));
closeSync(lock);
process.on('exit', () => {
  try {
    unlinkSync(lockPath);
  } catch {
    // A failed startup or external cleanup may already have removed the lock.
  }
});

for (const port of [3100, 3101]) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () =>
      reject(
        new Error(`E2E port ${port} is already in use; refusing to run against another service.`),
      ),
    );
    probe.listen(port, '0.0.0.0', () => probe.close(resolve));
  });
}

await mkdir('.e2e/stack/supabase', { recursive: true });
await writeFile(
  '.e2e/stack/supabase/config.toml',
  `project_id = "petveteu-e2e"
[api]
port = 55321
[db]
port = 55322
shadow_port = 55320
major_version = 17
[studio]
port = 55323
[analytics]
port = 55327
[db.pooler]
port = 55329
[inbucket]
port = 55324
smtp_port = 55325
pop3_port = 55326
[auth]
site_url = "http://127.0.0.1:3100"
additional_redirect_urls = ["http://127.0.0.1:3100"]
[auth.email]
enable_confirmations = false
max_frequency = "1s"
[auth.rate_limit]
email_sent = 1000
sign_in_sign_ups = 1000
token_verifications = 1000
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
[auth.email.template.invite]
subject = "PetVet invitation"
content_path = "./supabase/templates/invite.html"
[auth.email.template.magic_link]
subject = "PetVet sign in"
content_path = "./supabase/templates/magic-link.html"
[functions.reminders]
verify_jwt = false
[functions.admin-clients]
verify_jwt = false
[functions.admin-vets]
verify_jwt = false
`,
);
for (const directory of ['migrations', 'functions', 'templates']) {
  try {
    await symlink(path.resolve('supabase', directory), `.e2e/stack/supabase/${directory}`, 'dir');
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}
execFileSync('pnpm', ['exec', 'supabase', 'start', '--workdir', '.e2e/stack'], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '--workdir', '.e2e/stack', '-o', 'json'], {
    encoding: 'utf8',
  }),
);
execFileSync(
  'pnpm',
  ['exec', 'supabase', 'migration', 'up', '--local', '--workdir', '.e2e/stack'],
  { stdio: 'inherit' },
);
if (!['127.0.0.1', 'localhost'].includes(new URL(status.API_URL).hostname)) {
  throw new Error('Browser E2E requires local Supabase');
}
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY);
const { count: unrelatedProfiles, error: profileError } = await admin
  .from('profiles')
  .select('*', { head: true, count: 'exact' })
  .not('email', 'like', 'e2e-%@example.test');
if (profileError || unrelatedProfiles) {
  throw (
    profileError ??
    new Error('Reserved E2E stack contains unrelated identities; refusing to reset it.')
  );
}
if (status.API_URL !== 'http://127.0.0.1:55321') {
  throw new Error('Unexpected E2E endpoint; refusing to reset it.');
}
// This reserved project contains synthetic test data only. A reset gives each
// invocation a clean baseline even if a previous browser/process was killed.
execFileSync(
  'pnpm',
  ['exec', 'supabase', 'db', 'reset', '--local', '--workdir', '.e2e/stack', '--no-seed'],
  { stdio: 'inherit' },
);
for (const table of ['vaccination_entries', 'reminder_job_runs']) {
  const { count, error } = await admin.from(table).select('*', { head: true, count: 'exact' });
  if (error) {
    throw error;
  }
  if (count) {
    throw new Error(
      `E2E requires no existing ${table}; use a disposable local stack. No data was changed.`,
    );
  }
}

const children = [];
const environment = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  E2E_SUPABASE_URL: status.API_URL,
  E2E_ANON_KEY: status.ANON_KEY,
  E2E_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  E2E_MAIL_URL: status.INBUCKET_URL,
  PRIVACY_NOTICE_VERSION: 'e2e-v1',
  E2E_TEST_MODE: 'true',
  E2E_SMS_DRY_RUN: process.argv.includes('--dry-run') ? 'true' : 'false',
};

function start(command, args, env = environment) {
  const child = spawn(command, args, { env, stdio: 'inherit', detached: true });
  children.push(child);
  return child;
}

async function ready(url) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
    } catch {
      // The managed service may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Test service did not become ready: ${url}`);
}

async function stop() {
  for (const child of children.reverse()) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // A process may already have exited.
    }
  }
  await rm('.e2e/functions.env', { force: true });
}

process.on('SIGINT', () => {
  void stop().then(() => process.exit(130));
});
process.on('SIGTERM', () => {
  void stop().then(() => process.exit(143));
});

try {
  await mkdir('.e2e', { recursive: true });
  await writeFile(
    '.e2e/functions.env',
    [
      `SMS_DRY_RUN=${environment.E2E_SMS_DRY_RUN}`,
      'TWILIO_ACCOUNT_SID=ACe2e',
      'TWILIO_AUTH_TOKEN=e2e-token',
      'TWILIO_FROM_NUMBER=+15005550006',
      'TWILIO_API_BASE_URL=http://host.docker.internal:3101',
      'REMINDER_CRON_SECRET=e2e-cron-secret',
    ].join('\n'),
    { mode: 0o600 },
  );
  start('node', ['scripts/twilio-mock.mjs']);
  await ready('http://127.0.0.1:3101/health');
  start('pnpm', [
    'exec',
    'supabase',
    'functions',
    'serve',
    '--workdir',
    '.e2e/stack',
    '--env-file',
    path.resolve('.e2e/functions.env'),
    '--no-verify-jwt',
  ]);
  await ready(`${status.API_URL}/functions/v1/reminders`);
  start('pnpm', ['exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', '3100']);
  await ready('http://127.0.0.1:3100/sign-in');
  const testRun = start('pnpm', [
    'exec',
    'playwright',
    'test',
    ...process.argv.slice(2).filter((argument) => argument !== '--dry-run'),
  ]);
  const code = await new Promise((resolve) =>
    testRun.on('exit', (exitCode) => resolve(exitCode ?? 1)),
  );
  process.exitCode = code;
} finally {
  await stop();
}
