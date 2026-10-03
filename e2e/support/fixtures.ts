import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { totp } from './totp';

export type Account = { id: string; email: string; password: string; phone: string; name: string };

export async function submitAction(page: Page, button: Locator): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().startsWith('http://127.0.0.1:3100/'),
    ),
    button.click(),
  ]);
  expect(response.status()).toBeLessThan(400);
}
type FixtureRow = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  sms_enabled_by_client: boolean;
  deleted_at: string | null;
  breed: string | null;
};

export class ClinicFixtures {
  readonly admin: SupabaseClient;
  readonly prefix: string = `e2e-${randomUUID()}`;
  private readonly users: string[] = [];
  private readonly emails: string[] = [];
  private readonly runs: string[] = [];

  constructor() {
    const url = process.env.E2E_SUPABASE_URL!;
    if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
      throw new Error('Use pnpm test:e2e with local Supabase');
    }
    this.admin = createClient(url, process.env.E2E_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }

  email(label: string = 'client'): string {
    const email = `${this.prefix}-${label}-${this.emails.length}@example.test`;
    this.emails.push(email);
    return email;
  }

  async account(role: 'client' | 'vet' = 'client'): Promise<Account> {
    const email = this.email(role);
    const phone = `+3519${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    const name = `${role} ${this.prefix}`;
    const password = 'Local-Browser-Test-123!';
    const { data, error } = await this.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone, locale: 'en', initial_role: role },
    });
    if (error || !data.user) {
      throw error ?? new Error('Fixture user missing');
    }
    this.users.push(data.user.id);
    return { id: data.user.id, email, password, phone, name };
  }

  async profile(email: string): Promise<FixtureRow> {
    const { data, error } = await this.admin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    if (error) {
      throw error;
    }
    if (!this.users.includes(data.id)) {
      this.users.push(data.id);
    }

    return data;
  }

  async row(table: string, key: string, value: string): Promise<FixtureRow> {
    const { data, error } = await this.admin.from(table).select('*').eq(key, value).single();
    if (error) {
      throw error;
    }

    return data;
  }

  async permitNextBatch(): Promise<void> {
    const { data, error } = await this.admin.from('reminder_job_runs').select('id');
    if (error) {
      throw error;
    }
    for (const run of data) {
      if (!this.runs.includes(run.id)) {
        this.runs.push(run.id);
      }
    }
    if (data.length) {
      const result = await this.admin
        .from('reminder_job_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_code: 'e2e_next_batch',
        })
        .in(
          'id',
          data.map((run) => run.id),
        );
      if (result.error) {
        throw result.error;
      }
    }
  }

  async cleanup(): Promise<void> {
    for (const email of this.emails) {
      const { data } = await this.admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (data && !this.users.includes(data.id)) {
        this.users.push(data.id);
      }
    }
    if (!this.users.length) {
      return;
    }
    const { data: pets } = await this.admin.from('pets').select('id').in('owner_id', this.users);
    const petIds = pets?.map((pet) => pet.id) ?? [];
    if (petIds.length) {
      const { data: vaccines } = await this.admin
        .from('vaccination_entries')
        .select('id')
        .in('pet_id', petIds);
      const vaccineIds = vaccines?.map((vaccine) => vaccine.id) ?? [];
      if (vaccineIds.length) {
        const { data: reminders } = await this.admin
          .from('reminders')
          .select('id')
          .in('vaccination_entry_id', vaccineIds);
        const reminderIds = reminders?.map((reminder) => reminder.id) ?? [];
        if (reminderIds.length) {
          await this.admin.from('reminder_attempts').delete().in('reminder_id', reminderIds);
          await this.admin.from('reminders').delete().in('id', reminderIds);
        }
        await this.admin.from('vaccination_entries').delete().in('id', vaccineIds);
      }
      await this.admin.from('pets').delete().in('id', petIds);
    }
    await this.permitNextBatch();
    if (this.runs.length) {
      await this.admin.from('reminder_job_runs').delete().in('id', this.runs);
    }
    await this.admin.from('in_app_notifications').delete().in('recipient_id', this.users);
    await this.admin.from('in_app_notifications').delete().in('subject_id', this.users);
    await this.admin.from('vet_invitations').delete().in('profile_id', this.users);
    await this.admin.from('vet_invitations').delete().in('invited_by', this.users);
    await this.admin.from('admin_audit_events').delete().in('actor_id', this.users);
    await this.admin.from('admin_audit_events').delete().in('target_id', this.users);
    for (const id of [...this.users].reverse()) {
      const { error } = await this.admin.auth.admin.deleteUser(id);
      if (error) {
        throw error;
      }
    }
  }
}

export const test = base.extend<{ clinic: ClinicFixtures }>({
  clinic: async ({}, use) => {
    const clinic = new ClinicFixtures();
    try {
      await use(clinic);
    } finally {
      await clinic.cleanup();
    }
  },
});
export { expect };

export async function english(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Language / Idioma' }).selectOption('en');
  await expect(
    page.getByRole('heading', { name: 'Veterinary care without missed dates' }),
  ).toBeVisible();
}

export async function login(page: Page, account: Account): Promise<void> {
  await english(page);
  await page.goto('/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(client|mfa|vet)(\?|$)/);
}

export async function enrollVet(page: Page, account: Account): Promise<string> {
  await login(page, account);
  await expect(page).toHaveURL(/\/mfa/);
  const secret = (await page.locator('code').innerText()).trim();
  await page.getByLabel('Six-digit code').fill(totp(secret));
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(/\/vet/);
  await expect(page.getByRole('heading', { name: 'Veterinary portal', exact: true })).toBeVisible();
  return secret;
}

export function card(page: Page, name: string): Locator {
  return page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
}

export function dateIn(days: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function addPet(
  page: Page,
  name: string = 'Lua',
  species: string = 'cat',
): Promise<void> {
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add pet', exact: true }) });
  await form.getByLabel('Name', { exact: true }).fill(name);
  await form.getByRole('combobox', { name: 'Species', exact: true }).selectOption(species);
  if (species === 'other') {
    await form.getByLabel('Other species').fill('Rabbit');
  }
  await form.getByLabel('Date of birth').fill('2022-01-10');
  await form.getByRole('button', { name: 'Add pet', exact: true }).click();
  await expect(card(page, name)).toBeVisible();
}

export async function addVaccine(
  page: Page,
  pet: string = 'Lua',
  type: string = 'Rabies',
  days: number = 2,
): Promise<void> {
  const form = card(page, pet)
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add vaccine', exact: true }) });
  await form.getByLabel('Vaccine', { exact: true }).fill(type);
  await form.getByLabel('Due date').fill(dateIn(days));
  await form.getByRole('button', { name: 'Add vaccine', exact: true }).click();
  await expect(card(page, pet).getByText(type, { exact: true }).first()).toBeVisible();
}
