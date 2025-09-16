import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { Database } from '@/types/supabase';
import { createUser, findUserByEmail } from '@/lib/database/queries';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    let pendingCookies: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }> = [];

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Capture cookies to be set instead of setting immediately
            pendingCookies = [...cookiesToSet];
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    const body = await request.json();

    const { email, password } = LoginSchema.parse(body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    try {
      // Ensure user exists in application database
      // This handles cases where users confirmed their email but weren't synced during registration
      const existingUser = await findUserByEmail(data.user.email!);

      if (!existingUser) {
        // Create user in application database to sync with Supabase Auth
        await createUser({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || null,
        });
      }
    } catch (dbError) {
      console.error(
        'Failed to ensure user exists in application database:',
        dbError
      );
      // Don't fail the login if database sync fails
      // Log the error and continue with the login
    }

    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || null,
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    // Set cookies in response headers - CRITICAL FIX for session persistence
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: options.maxAge || 60 * 60 * 24 * 30, // 30 days default
        path: '/',
        ...options,
      });
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
