import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to logout', code: 'LOGOUT_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}