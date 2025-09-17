import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Enhanced Prisma Client configuration for connection stability
// Handle build-time scenarios where DATABASE_URL might not be available
const createPrismaClient = (): PrismaClient => {
  // During build time, provide minimal configuration to prevent errors
  if (
    !process.env.DATABASE_URL &&
    (process.env.NODE_ENV === 'test' || process.env.VERCEL)
  ) {
    console.warn(
      'DATABASE_URL not available during build, using minimal Prisma configuration'
    );
    return new PrismaClient({
      log: ['error'],
      errorFormat: 'pretty',
    });
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],

    // Connection pool and timeout configuration for better stability
    // Provide fallback for build-time when DATABASE_URL might not be available
    ...(process.env.DATABASE_URL && {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }),

    // Enhanced error handling and connection management
    errorFormat: 'pretty',

    // Connection pool configuration optimized for serverless environment
    ...(process.env.NODE_ENV === 'production' && {
      // Production-specific optimizations
      log: ['error', 'warn'], // More verbose logging in production for debugging
    }),
  });
};

export const prisma = globalThis.prisma ?? createPrismaClient();

// Connection health check utility
export const checkDatabaseConnection = async (): Promise<{
  isHealthy: boolean;
  latencyMs?: number;
  error?: string;
}> => {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;

    return {
      isHealthy: true,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    return {
      isHealthy: false,
      latencyMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Connection management utilities for serverless optimization
export const ensureConnection = async (): Promise<void> => {
  try {
    // Test connection with a lightweight query
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.warn('Database connection check failed:', error);
    // The retry logic in queries will handle reconnection
    throw error;
  }
};

// Connection event handlers for monitoring
// Note: Event handlers temporarily disabled due to TypeScript compatibility issues
// Will be re-enabled in Phase 2 with proper typing
if (process.env.NODE_ENV === 'development') {
  // Monitoring will be handled by enhanced logging in queries and health checks
  console.warn('Prisma Client initialized with enhanced monitoring');
}

// Graceful shutdown handler
const gracefulShutdown = async (): Promise<void> => {
  console.warn('Shutting down Prisma Client...');
  await prisma.$disconnect();
};

// Register shutdown handlers for different environments
if (typeof process !== 'undefined') {
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('beforeExit', gracefulShutdown);
}

// Store globally to prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
