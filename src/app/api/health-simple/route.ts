import { NextResponse } from 'next/server';

// Simple health check without database dependency
export async function GET(): Promise<NextResponse> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {
      openai: !!process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      supabase: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
        ? 'configured'
        : 'missing',
    },
  };

  return NextResponse.json(health, { status: 200 });
}
