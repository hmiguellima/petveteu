'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type MfaMessages = {
  code: string;
  enroll: string;
  error: string;
  manualSecret: string;
  preparing: string;
  scan: string;
  verify: string;
};

type MfaFlowProperties = {
  messages: MfaMessages;
};

type Setup = {
  factorId: string;
  qrCode?: string;
  secret?: string;
};

export function MfaFlow({ messages }: MfaFlowProperties): React.JSX.Element {
  const router = useRouter();
  const started = useRef(false);
  const [setup, setSetup] = useState<Setup>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void prepareMfa().catch(() => setError(messages.error));

    async function prepareMfa(): Promise<void> {
      const supabase = createClient();
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (assurance.error) {
        throw assurance.error;
      }
      if (assurance.data.currentLevel === 'aal2') {
        router.replace('/vet');
        router.refresh();
        return;
      }

      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) {
        throw factors.error;
      }

      const verifiedFactor = factors.data.totp.find((factor) => factor.status === 'verified');
      if (verifiedFactor) {
        setSetup({ factorId: verifiedFactor.id });
        return;
      }

      for (const factor of factors.data.all.filter(
        (item) => item.factor_type === 'totp' && item.status === 'unverified',
      )) {
        const removal = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removal.error) {
          throw removal.error;
        }
      }

      const enrollment = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'PetVet EU',
      });
      if (enrollment.error) {
        throw enrollment.error;
      }

      setSetup({
        factorId: enrollment.data.id,
        qrCode: enrollment.data.totp.qr_code,
        secret: enrollment.data.totp.secret,
      });
    }
  }, [messages.error, router]);

  async function verify(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!setup || !/^\d{6}$/.test(code)) {
      setError(messages.error);
      return;
    }

    setSubmitting(true);
    setError(undefined);
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: setup.factorId });

    if (challenge.error) {
      setError(messages.error);
      setSubmitting(false);
      return;
    }

    const verification = await supabase.auth.mfa.verify({
      factorId: setup.factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (verification.error) {
      setError(messages.error);
      setSubmitting(false);
      return;
    }

    router.replace('/vet');
    router.refresh();
  }

  if (!setup) {
    return <p role="status">{error ?? messages.preparing}</p>;
  }

  return (
    <div className="mt-5 space-y-4">
      {setup.qrCode ? (
        <div>
          <p>{messages.enroll}</p>
          <Image
            alt={messages.scan}
            className="mx-auto my-4"
            height={220}
            src={setup.qrCode}
            unoptimized
            width={220}
          />
          {setup.secret ? (
            <p className="break-all text-sm">
              {messages.manualSecret}: <code>{setup.secret}</code>
            </p>
          ) : null}
        </div>
      ) : null}
      <form onSubmit={verify}>
        <label>
          {messages.code}
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            pattern="[0-9]{6}"
            required
            value={code}
          />
        </label>
        {error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : null}
        <button disabled={submitting}>{messages.verify}</button>
      </form>
    </div>
  );
}
