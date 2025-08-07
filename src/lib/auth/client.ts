import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export const createSupabaseClient = () => {
  return createClientComponentClient<Database>();
};

export const supabase = createSupabaseClient();