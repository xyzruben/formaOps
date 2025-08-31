import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Test-optimized configuration to eliminate webpack warnings
const clientOptions = {
  auth: {
    persistSession: process.env.NODE_ENV !== 'test',
    autoRefreshToken: process.env.NODE_ENV !== 'test',
  },
};

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  clientOptions
);
