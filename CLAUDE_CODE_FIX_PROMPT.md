# Claude Code Prompt: FormaOps Production Error Resolution

## Context

You are an expert software engineer assisting with the FormaOps application, an AI-native developer platform for creating, testing, validating, and executing reusable operational prompts. The application is deployed on Vercel and utilizes Prisma ORM for database interactions, likely with a Supabase backend (common pairing with Prisma on Vercel).

## Problem Description (from Screenshot Analysis)

The FormaOps application is experiencing critical production errors, preventing the "Execution History" page from loading and indicating fundamental issues with database connectivity and API functionality.

### 1. Primary Issue: PrismaClient Environment Mismatch (DATABASE_ERROR)

The main content area of the application displays a prominent error message in red:

```
Error: Failed to fetch executions: PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `unknown`). If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report (DATABASE_ERROR)
```

This error clearly indicates that `PrismaClient` is being initialized or executed in an incorrect environment. Specifically:

- It suggests `PrismaClient` is either running directly in the browser (which it should not, as it's a server-side library) or has been incorrectly bundled for a browser environment.
- Given the Vercel deployment, this often points to issues with how `PrismaClient` is configured for serverless functions, where it needs to be initialized correctly for a Node.js runtime, not a browser.
- The `(DATABASE_ERROR)` tag confirms that the root cause is related to database access.

### 2. Secondary Issue: Cascading API Failures (500 Internal Server Errors)

The browser's developer console (specifically the "Console" tab) shows multiple critical errors, all indicating server-side failures:

- **Multiple "Failed to load resource" errors**:

  ```
  Failed to load resource: api/preferences:1 the server responded with a status of 500 ()
  ```

  These messages appear three times, indicating that the browser attempted to fetch resources from `/api/preferences` but received a `500 Internal Server Error` response.

- **Specific GET request failures**:
  ```
  ► GET layout-f59b758f331901b6.js:1 https://forma-ops.vercel.app/api/preferences 500 (Internal Server Error)
  ```
  These messages appear twice, explicitly showing that `GET` requests to the `https://forma-ops.vercel.app/api/preferences` endpoint are failing with a `500 Internal Server Error`.

These API failures are almost certainly a direct consequence of the primary `PrismaClient` environment mismatch. The `/api/preferences` endpoint likely attempts to use `PrismaClient` to interact with the database, and when `PrismaClient` fails to initialize or run correctly, the API route throws a 500 error.

## Task for Claude Code

As an expert in Vercel deployments, Prisma ORM, and Next.js applications, your task is to:

1.  **Systematically Identify the Root Cause**: Based on the described errors, pinpoint the exact configuration or code issue that is causing `PrismaClient` to fail in the Vercel serverless environment and subsequently lead to the 500 Internal Server Errors on the `/api/preferences` endpoint.

2.  **Propose a Detailed Plan to Solve the Issues**: Provide a step-by-step plan that includes:
    - **Code Modifications**: Specific changes to files (e.g., `next.config.js`, `src/lib/database/client.ts`, API routes, `package.json`, `vercel.json`) to correctly configure and initialize `PrismaClient` for a Vercel serverless environment.
    - **Configuration Adjustments**: Recommendations for Vercel project settings or environment variables if necessary.
    - **Best Practices**: Ensure the proposed solution adheres to best practices for Prisma and Next.js on Vercel, including connection management, bundling, and deployment.
    - **Verification Steps**: Suggest how to verify that the fix has been successfully implemented and the errors are resolved.

The goal is to ensure `PrismaClient` runs correctly on the server-side, enabling the `/api/preferences` endpoint to function, and ultimately allowing the "Execution History" page to load data without errors.

## Current Codebase Context

Based on the project structure, you should focus on these key files:

### Core Configuration Files

- `next.config.js` - Next.js configuration and webpack settings
- `vercel.json` - Vercel deployment configuration
- `package.json` - Dependencies and build scripts
- `prisma/schema.prisma` - Database schema and Prisma configuration

### Database and API Files

- `src/lib/database/client.ts` - Prisma client initialization
- `src/app/api/preferences/route.ts` - Failing API endpoint
- `src/lib/utils/error-handler.ts` - Error handling utilities

### Environment Considerations

- The application is deployed on Vercel (serverless environment)
- Uses Prisma ORM for database operations
- Likely uses Supabase as the database backend
- Next.js 15 with App Router architecture

## Expected Analysis Areas

When investigating the root cause, consider these common issues:

### 1. Prisma Client Bundling Issues

- Incorrect webpack configuration for serverless environments
- Missing `serverExternalPackages` in Next.js config
- Prisma client being bundled for browser instead of server

### 2. Serverless Environment Configuration

- Missing or incorrect environment variables
- Prisma client not properly initialized for serverless functions
- Connection pooling issues in serverless context

### 3. API Route Configuration

- Missing `export const dynamic = 'force-dynamic'` in API routes
- Improper error handling in API endpoints
- Authentication or middleware issues

### 4. Deployment Configuration

- Incorrect build commands in Vercel
- Missing Prisma generation in build process
- Environment variable configuration issues

## Success Criteria

After implementing the proposed solution, the application should:

1. ✅ **PrismaClient Initialization**: Successfully initialize in serverless environment
2. ✅ **API Endpoint Functionality**: `/api/preferences` returns 200 status instead of 500
3. ✅ **Database Connectivity**: Successful database operations in production
4. ✅ **Frontend Data Loading**: Execution History page loads data without errors
5. ✅ **Error Resolution**: No more "PrismaClient is unable to run in this browser environment" errors
6. ✅ **Console Clean**: No 500 Internal Server Errors in browser console

## Investigation Priority

1. **Immediate**: Check current Prisma client configuration and initialization
2. **High Priority**: Verify Next.js and Vercel configuration for serverless deployment
3. **Medium Priority**: Review API route implementation and error handling
4. **Low Priority**: Optimize performance and add monitoring

## Deliverables Expected

1. **Root Cause Analysis**: Clear explanation of why the errors are occurring
2. **Step-by-Step Fix Plan**: Detailed implementation guide with specific code changes
3. **File Modifications**: Exact changes needed for each file
4. **Verification Steps**: How to test and confirm the fixes work
5. **Prevention Measures**: Recommendations to avoid similar issues in the future

This prompt provides Claude Code with all the necessary context to systematically diagnose and resolve the critical production issues preventing the FormaOps application from functioning properly.
