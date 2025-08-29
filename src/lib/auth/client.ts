import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export const createSupabaseClient = () => {
  // Use fallback values during build to prevent build failures
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient<Database>(url, key);
};

export const supabase = createSupabaseClient();
