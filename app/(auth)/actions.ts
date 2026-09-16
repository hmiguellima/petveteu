'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { portalPathForRole } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/server';
import { registrationSchema } from '@/lib/validation';

export async function signIn(form: FormData): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(form.get('email')).trim().toLowerCase(),
    password: String(form.get('password')),
  });

  if (error) {
    redirect('/sign-in?error=credentials');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, locale')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect('/sign-in?error=profile');
  }

  cookies().set('locale', profile.locale, { sameSite: 'lax', path: '/' });

  redirect(portalPathForRole(profile.role));
}

export async function register(form: FormData): Promise<void> {
  const parsed = registrationSchema.safeParse({
    fullName: form.get('fullName'),
    email: form.get('email'),
    phone: form.get('phone'),
    password: form.get('password'),
    locale: form.get('locale') || 'pt-PT',
  });

  if (!parsed.success) {
    redirect('/register?error=invalid');
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        locale: parsed.data.locale,
      },
    },
  });

  if (error) {
    redirect('/register?error=conflict');
  }
  if (data.session) {
    cookies().set('locale', parsed.data.locale, { sameSite: 'lax', path: '/' });
    redirect('/client');
  }

  redirect('/sign-in?registered=1');
}
