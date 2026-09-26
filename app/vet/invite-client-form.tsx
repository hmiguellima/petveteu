'use client';

import { useRouter } from 'next/navigation';
import React, { useRef } from 'react';
import type { Catalog } from '@/lib/i18n';
import { inviteClient } from './actions';

type InviteClientFormProperties = {
  messages: Catalog;
};

export function InviteClientForm({ messages }: InviteClientFormProperties): React.JSX.Element {
  const formReference = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget;
    const destination = await inviteClient(new FormData(form));

    if (destination === '/vet?status=client-invited') {
      formReference.current?.reset();
    }

    router.replace(destination);
  }

  return (
    <form className="mt-4" onSubmit={submit} ref={formReference}>
      <label>
        {messages.auth.name}
        <input required name="name" maxLength={120} />
      </label>
      <label>
        {messages.auth.email}
        <input required name="email" type="email" />
      </label>
      <label>
        {messages.auth.phone}
        <input required name="phone" type="tel" placeholder="+351912345678" />
      </label>
      <label>
        {messages.auth.language}
        <select name="locale" defaultValue="pt-PT">
          <option value="pt-PT">Português</option>
          <option value="en">English</option>
        </select>
      </label>
      <button>{messages.vet.sendInvite}</button>
    </form>
  );
}
