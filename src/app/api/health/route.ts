import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

// Health check endpoint for monitoring and load balancers
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check OpenAI API key presence (don't validate to avoid rate limits)
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    // Check Supabase configuration
    const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    
    const responseTime = Date.now() - start;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: 'connected',
        openai: hasOpenAI ? 'configured' : 'missing',
        supabase: hasSupabase ? 'configured' : 'missing',
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        },
      },
    };
    
    // Determine overall health status
    if (!hasOpenAI || !hasSupabase) {
      health.status = 'degraded';
    }
    
    return NextResponse.json(health, { 
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    const responseTime = Date.now() - start;
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: 'disconnected',
        openai: 'unknown',
        supabase: 'unknown',
      },
    };
    
    return NextResponse.json(health, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}

// Simple readiness check
export async function HEAD(_request: NextRequest): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}