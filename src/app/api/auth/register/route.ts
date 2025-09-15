import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { Database } from '@/types/supabase';
import { createUser, findUserByEmail } from '@/lib/database/queries';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const body = await request.json();
    const { email, password } = RegisterSchema.parse(body);

    // Create new user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Supabase registration error:', error);

      // Handle specific Supabase registration errors
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email already registered', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }

      if (error.message.includes('Invalid email')) {
        return NextResponse.json(
          { error: 'Invalid email address', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }

      if (error.message.includes('Password')) {
        return NextResponse.json(
          { error: 'Password requirements not met', code: 'INVALID_PASSWORD' },
          { status: 400 }
        );
      }

      // Generic error for other cases
      return NextResponse.json(
        { error: 'Registration failed', code: 'REGISTRATION_FAILED' },
        { status: 400 }
      );
    }

    // Check if user was created successfully
    if (!data.user) {
      return NextResponse.json(
        { error: 'Registration failed', code: 'REGISTRATION_FAILED' },
        { status: 400 }
      );
    }

    try {
      // Check if user already exists in application database
      const existingUser = await findUserByEmail(email);

      if (!existingUser) {
        // Create user in application database to sync with Supabase Auth
        await createUser({
          id: data.user.id, // Use the same ID as Supabase Auth
          email: data.user.email!,
          name: data.user.user_metadata?.name || null,
        });
      }
    } catch (dbError) {
      console.error('Failed to create user in application database:', dbError);
      // Don't fail the registration if database sync fails
      // The user exists in Supabase Auth, so they can still log in
      // We'll need to handle this case gracefully in the login flow
    }

    // Return user data and session if available
    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || null,
      },
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
      // Indicate if email confirmation is required
      needsEmailConfirmation: !data.session,
    });
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

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
