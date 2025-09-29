# Claude Code Fix Prompt for FormaOps Critical Issues

## Context

You are working on FormaOps, an AI-native developer platform for creating, testing, validating, and executing reusable operational prompts. The application is deployed on Vercel with Supabase as the database backend using Prisma ORM.

## Critical Issues Identified

### 1. **SYNTAX ERRORS** (Blocking - Immediate Fix Required)

The `/src/app/api/preferences/route.ts` file has critical syntax errors preventing API execution:

- **Line 10**: Missing comma after `defaultViewMode` field
- **Line 91**: Missing opening brace `{` after `try` statement in PUT function
- **Line 125**: Missing opening brace `{` after `try` statement in DELETE function

### 2. **PRISMA CLIENT BUNDLING ISSUE** (Critical - Production Breaking)

Error: `"PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in 'unknown')"`

This indicates PrismaClient is incorrectly configured for Vercel's serverless environment.

### 3. **500 INTERNAL SERVER ERRORS** (Cascading Failures)

Multiple API endpoints failing, specifically `/api/preferences`, causing application-wide failures.

## Required Fixes

### Phase 1: Critical Syntax Fixes (IMMEDIATE)

**File: `src/app/api/preferences/route.ts`**

Fix these specific syntax errors:

1. **Line 10**: Add missing comma:

```typescript
// BEFORE (broken):
defaultViewMode: z.enum(['output', 'metrics', 'raw']).optional()
outputFontSize: z.enum(['small', 'medium', 'large', 'custom']).optional(),

// AFTER (fixed):
defaultViewMode: z.enum(['output', 'metrics', 'raw']).optional(),
outputFontSize: z.enum(['small', 'medium', 'large', 'custom']).optional(),
```

2. **Line 91**: Add missing opening brace:

```typescript
// BEFORE (broken):
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try
    const user = await requireAuth();

// AFTER (fixed):
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
```

3. **Line 125**: Add missing opening brace:

```typescript
// BEFORE (broken):
export async function DELETE(): Promise<NextResponse> {
  try
    const user = await requireAuth();

// AFTER (fixed):
export async function DELETE(): Promise<NextResponse> {
  try {
    const user = await requireAuth();
```

### Phase 2: Prisma Client Configuration Fix

**File: `next.config.js`**

Add Prisma-specific configuration to the existing webpack section:

```javascript
webpack: (config, { isServer }) => {
  // Existing code...

  // ADD THIS: Prisma serverless configuration
  if (isServer) {
    config.externals.push('@prisma/client');
  }

  // ADD THIS: Prisma-specific optimizations
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    net: false,
    tls: false,
  };

  return config;
},

// ADD THIS: Experimental configuration for Prisma
experimental: {
  serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  // ... existing experimental config
},
```

**File: `vercel.json`**

Update the build configuration:

```json
{
  "buildCommand": "prisma generate && npm run build",
  "installCommand": "npm ci && prisma generate",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "env": {
    "PRISMA_GENERATE_DATAPROXY": "false"
  }
}
```

**File: `package.json`**

Update build scripts:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "vercel-build": "prisma generate && next build"
  }
}
```

### Phase 3: Database Client Enhancement

**File: `src/lib/database/client.ts`**

Replace the existing `createPrismaClient` function with this enhanced version:

```typescript
const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add connection pooling for serverless
    ...(process.env.NODE_ENV === 'production' && {
      __internal: {
        engine: {
          connectTimeout: 60000,
          queryTimeout: 30000,
        },
      },
    }),
  });
};

// Global instance management for serverless
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
```

### Phase 4: Error Handling Enhancement

**File: `src/lib/utils/error-handler.ts`**

Add Prisma-specific error handling:

```typescript
export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Handle Prisma-specific errors
    if (error.message.includes('PrismaClient')) {
      return {
        statusCode: 500,
        error: 'Database connection error',
        code: 'DATABASE_ERROR',
        message: 'Unable to connect to database. Please try again.',
      };
    }

    // Handle Prisma query errors
    if (
      error.message.includes('prisma') ||
      error.message.includes('database')
    ) {
      return {
        statusCode: 500,
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
        message: 'Database operation failed. Please try again.',
      };
    }
  }

  return {
    statusCode: 500,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  };
}
```

### Phase 5: Health Check Endpoint

**Create: `src/app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/database/client';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      { status: 500 }
    );
  }
}
```

### Phase 6: Enhanced API Logging

**File: `src/app/api/preferences/route.ts`**

Add logging to the GET function (after fixing syntax errors):

```typescript
export async function GET(): Promise<NextResponse> {
  try {
    console.log('Preferences API: Starting request');
    const user = await requireAuth();
    console.log('Preferences API: User authenticated', user.id);

    // Try to get existing preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    console.log(
      'Preferences API: Query successful',
      preferences ? 'found' : 'not found'
    );

    let isDefault = false;

    // If no preferences exist, create defaults
    if (!preferences) {
      console.log('Preferences API: Creating default preferences');
      preferences = await prisma.userPreferences.create({
        data: { userId: user.id },
      });
      isDefault = true;
      console.log('Preferences API: Default preferences created');
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        isDefault,
      },
    });
  } catch (error) {
    console.error('Preferences API Error:', error);
    const apiError = handleApiError(error);
    return NextResponse.json(apiError, { status: apiError.statusCode });
  }
}
```

## Implementation Order

1. **IMMEDIATE**: Fix syntax errors in `src/app/api/preferences/route.ts`
2. **HIGH PRIORITY**: Update Prisma configuration in `next.config.js` and `vercel.json`
3. **MEDIUM PRIORITY**: Enhance database client and error handling
4. **LOW PRIORITY**: Add health check endpoint and enhanced logging

## Verification Steps

After implementing fixes:

1. **Local Testing**: Run `npm run dev` and test `/api/preferences` endpoint
2. **Health Check**: Test `/api/health` endpoint for database connectivity
3. **Build Test**: Run `npm run build` to ensure no build errors
4. **Deployment**: Deploy to Vercel and verify production functionality

## Environment Variables Required

Ensure these are set in Vercel:

- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct database connection (if using connection pooling)
- `PRISMA_GENERATE_DATAPROXY`: Set to "false"
- `NODE_ENV`: Set to "production"

## Expected Outcome

After implementing these fixes:

- ✅ API endpoints will return 200 status instead of 500 errors
- ✅ PrismaClient will work correctly in serverless environment
- ✅ Database operations will be stable and performant
- ✅ Application will load preferences and execute prompts successfully
- ✅ Console errors will be resolved

## Notes

- The syntax errors are **blocking** and must be fixed first
- Prisma configuration changes require a **full redeployment**
- Test each phase individually before proceeding to the next
- Monitor Vercel function logs for any remaining issues

This prompt provides a systematic approach to resolving the critical issues preventing your FormaOps application from functioning properly in production.
