import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export const createServerSupabaseClient = async (): Promise<
  ReturnType<typeof createServerClient<Database>>
> => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string): string | undefined => {
          try {
            return cookieStore.get(name)?.value;
          } catch (error) {
            console.error(`Failed to get cookie ${name}:`, error);
            return undefined;
          }
        },
        set: (
          name: string,
          value: string,
          options: Record<string, unknown>
        ) => {
          try {
            cookieStore.set({
              name,
              value,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              ...options,
            });
          } catch (error) {
            console.error(`Failed to set cookie ${name}:`, error);
          }
        },
        remove: (name: string, options: Record<string, unknown>) => {
          try {
            cookieStore.set({
              name,
              value: '',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 0,
              ...options,
            });
          } catch (error) {
            console.error(`Failed to remove cookie ${name}:`, error);
          }
        },
      },
    }
  );
};

export const getUser = async (): Promise<
  import('@supabase/supabase-js').User | null
> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
};

export const requireAuth = async (): Promise<
  import('@supabase/supabase-js').User
> => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Auth error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }

    if (!user) {
      console.warn('No user found in session cookies');
      throw new Error('Authentication required');
    }

    return user;
  } catch (error) {
    console.error('requireAuth failed:', error);
    throw new Error('Authentication required');
  }
};
