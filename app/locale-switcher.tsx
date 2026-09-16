'use client';

import { useRouter } from 'next/navigation';
import React, { type ChangeEvent } from 'react';
import type { Locale } from '@/lib/i18n';

type LocaleSwitcherProperties = {
  locale: Locale;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProperties): React.JSX.Element {
  const router = useRouter();

  function changeLocale(event: ChangeEvent<HTMLSelectElement>): void {
    document.cookie = `locale=${event.target.value}; Path=/; SameSite=Lax; Max-Age=31536000`;
    router.refresh();
  }

  return (
    <label className="fixed right-4 top-4 z-10 rounded-lg bg-white px-3 py-2 text-sm shadow">
      <span className="sr-only">Language / Idioma</span>
      <select aria-label="Language / Idioma" value={locale} onChange={changeLocale}>
        <option value="pt-PT">Português</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
