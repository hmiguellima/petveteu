'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { registrationSchema } from '@/lib/validation';
export async function signIn(form: FormData): Promise<void> {
  const s = createClient();
  const { data, error } = await s.auth.signInWithPassword({
    email: String(form.get('email')).trim().toLowerCase(),
    password: String(form.get('password')),
  });
  if (error) redirect('/sign-in?error=credentials');
  const { data: p } = await s.from('profiles').select('role').eq('id', data.user.id).single();
  redirect(p?.role === 'vet' ? '/vet' : '/client');
}
export async function register(form: FormData): Promise<void> {
  const parsed = registrationSchema.safeParse({
    fullName: form.get('fullName'),
    email: form.get('email'),
    phone: form.get('phone'),
    password: form.get('password'),
    locale: form.get('locale') || 'pt-PT',
  });
  if (!parsed.success) redirect('/register?error=invalid');
  const s = createClient();
  const { data, error } = await s.auth.signUp({
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
  if (error) redirect('/register?error=conflict');
  if (data.session) redirect('/client');
  redirect('/sign-in?registered=1');
}
