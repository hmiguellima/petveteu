import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieWrite = { name: string; value: string; options: CookieOptions };
export function createClient(): ReturnType<typeof createServerClient> {
  const jar = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(items: CookieWrite[]) {
          try {
            items.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
