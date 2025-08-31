import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export const createSupabaseClient = (): ReturnType<
  typeof createBrowserClient<Database>
> => {
  // Use fallback values during build to prevent build failures
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  // Test-optimized configuration
  const options = {
    auth: {
      persistSession: process.env.NODE_ENV !== 'test',
      autoRefreshToken: process.env.NODE_ENV !== 'test',
    },
  };

  return createBrowserClient<Database>(url, key, options);
};

export const supabase = createSupabaseClient();
