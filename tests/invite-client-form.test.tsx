// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteClientForm } from '@/app/vet/invite-client-form';
import { getCatalog } from '@/lib/i18n';

const mocks = vi.hoisted(() => ({
  inviteClient: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/app/vet/actions', () => ({
  inviteClient: mocks.inviteClient,
}));

const messages = getCatalog('en');

function fillForm(): void {
  fireEvent.change(screen.getByLabelText(messages.auth.name), {
    target: { value: 'Ada Lovelace' },
  });
  fireEvent.change(screen.getByLabelText(messages.auth.email), {
    target: { value: 'ada@example.test' },
  });
  fireEvent.change(screen.getByLabelText(messages.auth.phone), {
    target: { value: '+351912345678' },
  });
  fireEvent.change(screen.getByLabelText(messages.auth.language), {
    target: { value: 'en' },
  });
}

describe('invite client form', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets its fields after a successful invitation', async () => {
    mocks.inviteClient.mockResolvedValue('/vet?status=client-invited');
    render(<InviteClientForm messages={messages} />);
    fillForm();

    fireEvent.submit(screen.getByRole('button').closest('form')!);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
    expect(screen.getByLabelText<HTMLInputElement>(messages.auth.name).value).toBe('');
    expect(screen.getByLabelText<HTMLInputElement>(messages.auth.email).value).toBe('');
    expect(screen.getByLabelText<HTMLInputElement>(messages.auth.phone).value).toBe('');
    expect(screen.getByLabelText<HTMLSelectElement>(messages.auth.language).value).toBe('pt-PT');
  });

  it('retains its fields when the invitation fails', async () => {
    mocks.inviteClient.mockResolvedValue('/vet?error=request');
    render(<InviteClientForm messages={messages} />);
    fillForm();

    fireEvent.submit(screen.getByRole('button').closest('form')!);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
    expect(screen.getByLabelText<HTMLInputElement>(messages.auth.name).value).toBe('Ada Lovelace');
    expect(screen.getByLabelText<HTMLInputElement>(messages.auth.email).value).toBe(
      'ada@example.test',
    );
    expect(screen.getByLabelText<HTMLInputElement>(messages.auth.phone).value).toBe(
      '+351912345678',
    );
    expect(screen.getByLabelText<HTMLSelectElement>(messages.auth.language).value).toBe('en');
  });
});
