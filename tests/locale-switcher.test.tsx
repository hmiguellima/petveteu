// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleSwitcher } from '@/app/locale-switcher';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('locale switcher', () => {
  beforeEach(() => {
    refresh.mockClear();
    document.cookie = 'locale=; Max-Age=0; Path=/';
  });

  it('persists English and refreshes the current page', () => {
    render(<LocaleSwitcher locale="pt-PT" />);

    fireEvent.change(screen.getByLabelText('Language / Idioma'), {
      target: { value: 'en' },
    });

    expect(document.cookie).toContain('locale=en');
    expect(refresh).toHaveBeenCalledOnce();
  });
});
