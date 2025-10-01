# IMMEDIATE ACTION REQUIRED: Production Error Still Occurring

## Current Situation

**CRITICAL**: The production application at `forma-ops.vercel.app/executions` is **CURRENTLY FAILING** with the error page "Something went wrong" and Error ID: `error_1759294880652_a3fz4qj`.

**Your previous fixes (commits bbf1200 and 51264b9) did NOT resolve the production issue.**

## Production Error Right Now (Not Historical)

```
Uncaught (in promise) TypeError: i.PrismaClient is not a constructor
  at lib-5d59f0756df974f8.js:1:279
  at lib-5d59f0756df974f8.js:1:362
  at webpack-04108287d54d1444.js:1:128
  at page-13a7b537e63f4cb0.js:1:2362
  at vendors-cf8c929700e5c7b5.js:25:130777
```

```
GET https://forma-ops.vercel.app/api/preferences 500 (Internal Server Error)
  (3 occurrences)
```

## What You Need to Understand

1. **E2E tests passing ≠ Production working** - Tests may use mocks or different code paths
2. **Local development working ≠ Production working** - Different webpack bundles
3. **TypeScript passing ≠ Runtime working** - Type errors are compile-time, this is runtime

## Your Task

**Stop making assumptions. Start investigating.**

### STEP 1: Find What's Actually Importing PrismaClient on the Client Side

Run these commands RIGHT NOW:

```bash
# Find all files importing PrismaClient or @prisma/client
grep -r "PrismaClient" src/ --include="*.ts" --include="*.tsx" -n

# Find all files importing database client
grep -r "from '@/lib/database/client'" src/ --include="*.ts" --include="*.tsx" -n
grep -r 'from "../database/client"' src/ --include="*.ts" --include="*.tsx" -n
grep -r 'require.*database/client' src/ --include="*.ts" --include="*.tsx" -n

# Find all client components that might import the logger
grep -r "'use client'" src/ --include="*.tsx" -A 20 | grep -E "(logger|database|prisma)" -B 5
```

### STEP 2: Read These Specific Files (DO THIS, DON'T ASSUME)

Read the **ACTUAL CURRENT CODE** in these files:

1. `src/lib/monitoring/logger.ts` - Read the ENTIRE file
2. `src/components/error-boundary.tsx` - Check if it's a client component and what it imports
3. `src/lib/database/client.ts` - Check if it has 'server-only' import
4. `src/app/layout.tsx` - Check what it imports
5. `src/contexts/PreferencesContext.tsx` - Check if it imports anything database-related
6. `src/contexts/AuthContext.tsx` - Check if it imports anything database-related

### STEP 3: Understand Why Your Previous Fix Failed

Your previous fix in `logger.ts` was:

```typescript
const getPrisma = () => {
  if (typeof window === 'undefined') {
    const { prisma } = require('../database/client');
    return prisma;
  }
  return null;
};
```

**This DOES NOT prevent bundling.** Webpack sees the `require()` statement and bundles `@prisma/client` anyway, even though it's behind a runtime check.

Your webpack config was:

```javascript
config.resolve.alias = {
  ...config.resolve.alias,
  '@prisma/client': false,
  '@/lib/database/client': false,
};
```

**This might be TOO aggressive** - it breaks the server-side code too, or it's not being applied correctly.

### STEP 4: Find the ACTUAL Import Chain

Build a graph like this by reading actual imports:

```
Where does the error originate?
-> webpack bundle: lib-5d59f0756df974f8.js
-> This is likely: src/lib/monitoring/logger.ts (based on name pattern)
-> What imports logger.ts?
-> -> Check: error-boundary.tsx
-> -> Check: layout.tsx
-> -> Check: any other client components

Example chain to discover:
@prisma/client
  ↓
src/lib/database/client.ts
  ↓
src/lib/monitoring/logger.ts (requires it conditionally - BUT STILL BUNDLED)
  ↓
src/components/error-boundary.tsx ('use client' - PULLS INTO CLIENT BUNDLE!)
  ↓
src/app/layout.tsx (uses error boundary)
```

### STEP 5: Implement the CORRECT Fix (Based on Evidence)

**Only after you've done Steps 1-4**, implement the appropriate solution:

#### Option A: Separate Client and Server Loggers (RECOMMENDED)

If client components are importing the logger:

1. **Create client-safe logger:**

```typescript
// src/lib/monitoring/logger.client.ts
'use client';

export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service (Sentry, LogRocket, etc.)
      console.error('[CLIENT ERROR]', message, meta);
    } else {
      console.error(message, meta);
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(message, meta);
  },
};
```

2. **Create server-only logger:**

```typescript
// src/lib/monitoring/logger.server.ts
import 'server-only';
import { prisma } from '@/lib/database/client';

export const logger = {
  error: async (message: string, meta?: Record<string, unknown>) => {
    console.error(message, meta);
    try {
      await prisma.executionLog.create({
        data: {
          level: 'ERROR',
          message,
          metadata: meta as any,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log to database:', error);
    }
  },
  info: async (message: string, meta?: Record<string, unknown>) => {
    console.log(message, meta);
    // Optionally log to database
  },
  warn: async (message: string, meta?: Record<string, unknown>) => {
    console.warn(message, meta);
    // Optionally log to database
  },
};
```

3. **Replace the current logger.ts with a barrel export:**

```typescript
// src/lib/monitoring/logger.ts
// This file should determine which logger to export based on context

// For TypeScript, we need a common interface
export type Logger = {
  error: (
    message: string,
    meta?: Record<string, unknown>
  ) => void | Promise<void>;
  info: (
    message: string,
    meta?: Record<string, unknown>
  ) => void | Promise<void>;
  warn: (
    message: string,
    meta?: Record<string, unknown>
  ) => void | Promise<void>;
};

// Re-export based on environment
// Note: This is just for type compatibility
// Actual imports should be explicit (.client or .server)
export * from './logger.client';
```

4. **Update all imports:**

- In **client components** (has `'use client'`):

  ```typescript
  import { logger } from '@/lib/monitoring/logger.client';
  ```

- In **server components** and **API routes**:
  ```typescript
  import { logger } from '@/lib/monitoring/logger.server';
  ```

5. **Mark database client as server-only:**

```typescript
// src/lib/database/client.ts
import 'server-only';
import { PrismaClient } from '@prisma/client';

// Rest of your code...
```

#### Option B: Remove Logger from Client Components Entirely

If error-boundary.tsx or other client components use the logger:

1. **Remove logger import from client components:**

```typescript
// src/components/error-boundary.tsx
'use client';

// REMOVE: import { logger } from '@/lib/monitoring/logger';

export class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Instead of logger.error(), just use console.error
    console.error('Error boundary caught:', error, errorInfo);

    // Optionally, send to client-side error tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
      });
    }
  }
}
```

#### Option C: Fix Webpack Configuration (If needed)

Update `next.config.js`:

```javascript
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // On client side, replace server-only modules with empty objects
      config.resolve.alias = {
        ...config.resolve.alias,
        '@prisma/client': false,
        '@/lib/database/client': false,
        '@/lib/monitoring/logger.server': false,
      };

      // Add fallback for modules that shouldn't be in client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### STEP 6: Verify the Fix

1. **Clean build:**

```bash
rm -rf .next
npm run build
```

2. **Check build output for warnings about Prisma**

3. **Start production build locally:**

```bash
npm run start
```

4. **Test the /executions page locally**

5. **Deploy to Vercel:**

```bash
git add .
git commit -m "Fix: Separate client and server loggers to prevent Prisma bundling"
git push origin main
```

6. **Verify in production at forma-ops.vercel.app/executions**

## What You Must Do RIGHT NOW

1. ✅ Run the grep commands from STEP 1
2. ✅ Read all files from STEP 2
3. ✅ Document the ACTUAL import chain you discover
4. ✅ Show me the evidence of what's importing what
5. ✅ Implement the fix based on evidence
6. ✅ Verify locally before pushing

## Stop If You Find Yourself Saying:

❌ "The fixes we already made should work"
❌ "E2E tests are passing so it's fine"
❌ "I think the issue is..."
❌ "It might be..."

## Start Saying:

✅ "I found these files importing PrismaClient: [list]"
✅ "Here's the actual import chain: [chain]"
✅ "I read error-boundary.tsx and it imports: [actual imports]"
✅ "The evidence shows that [specific finding]"

## Remember

**The production site is broken RIGHT NOW. Your previous fixes did not work. Start investigating with actual code, not assumptions.**

Begin by running the grep commands and reading the files. Show me what you find.
