import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Enhanced Prisma Client configuration for connection stability
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],

    // Connection pool and timeout configuration for better stability
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },

    // Enhanced error handling and connection management
    errorFormat: 'pretty',

    // Connection pool configuration (these are passed to the underlying database driver)
    ...(process.env.NODE_ENV === 'production' && {
      // Production-specific optimizations
      log: ['error', 'warn'], // More verbose logging in production for debugging
    }),
  });

// Connection event handlers for monitoring
if (process.env.NODE_ENV === 'development') {
  // Log connection events in development
  prisma.$on('query', e => {
    if (e.duration > 1000) {
      console.warn(
        `Slow query detected (${e.duration}ms):`,
        e.query.substring(0, 100)
      );
    }
  });

  prisma.$on('error', e => {
    console.error('Prisma Client Error:', e);
  });
}

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('Shutting down Prisma Client...');
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
