import { PrismaClient } from '@prisma/client';

// Global instance management for serverless
declare global {
  var __prisma: PrismaClient | undefined;
}

// Enhanced Prisma Client configuration for connection stability
const createPrismaClient = (): PrismaClient => {
  // During build time in CI/CD, DATABASE_URL might not be available
  // Use a fallback URL to prevent build failures
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://fallback:fallback@localhost:5432/fallback';

  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Enhanced error handling for production
    errorFormat: 'pretty',
  });
};

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

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

// Prisma instance is already stored globally via __prisma
