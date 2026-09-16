// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaFlow, type MfaMessages } from '@/app/mfa/mfa-flow';

const mocks = vi.hoisted(() => ({
  challenge: vi.fn(),
  enroll: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  unenroll: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({
    unoptimized: _unoptimized,
    ...properties
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    <img {...properties} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      mfa: {
        challenge: mocks.challenge,
        enroll: mocks.enroll,
        getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel,
        listFactors: mocks.listFactors,
        unenroll: mocks.unenroll,
        verify: mocks.verify,
      },
    },
  }),
}));

const messages: MfaMessages = {
  code: 'Six-digit code',
  enroll: 'Scan the QR code.',
  error: 'Verification failed.',
  manualSecret: 'Manual setup key',
  preparing: 'Preparing…',
  scan: 'MFA QR code',
  verify: 'Verify and continue',
};

describe('MFA flow', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1' },
      error: null,
    });
    mocks.unenroll.mockResolvedValue({ error: null });
  });

  it('enrolls a TOTP factor and displays its setup details', async () => {
    mocks.listFactors.mockResolvedValue({ data: { all: [], totp: [] }, error: null });
    mocks.enroll.mockResolvedValue({
      data: {
        id: 'factor-new',
        totp: { qr_code: 'data:image/svg+xml,test', secret: 'SETUP-SECRET' },
      },
      error: null,
    });

    render(<MfaFlow messages={messages} />);

    expect(await screen.findByAltText('MFA QR code')).toBeTruthy();
    expect(screen.getByText(/SETUP-SECRET/)).toBeTruthy();
    expect(mocks.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'PetVet EU',
    });
  });

  it('challenges and verifies an existing factor before entering the vet portal', async () => {
    mocks.listFactors.mockResolvedValue({
      data: {
        all: [{ factor_type: 'totp', id: 'factor-verified', status: 'verified' }],
        totp: [{ id: 'factor-verified', status: 'verified' }],
      },
      error: null,
    });
    mocks.challenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mocks.verify.mockResolvedValue({ data: {}, error: null });

    render(<MfaFlow messages={messages} />);

    const input = await screen.findByLabelText('Six-digit code');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce());
    expect(mocks.challenge).toHaveBeenCalledWith({ factorId: 'factor-verified' });
    expect(mocks.verify).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      code: '123456',
      factorId: 'factor-verified',
    });
    expect(mocks.replace).toHaveBeenCalledWith('/vet');
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
