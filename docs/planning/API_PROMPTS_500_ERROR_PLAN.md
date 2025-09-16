# API Prompts 500 Error - Diagnostic & Solution Plan

## 🔍 PROBLEM STATEMENT

**Issue**: The `/api/prompts` endpoint is returning 500 Internal Server Error in production (Vercel), while authentication is working correctly. Users can log in successfully but cannot access prompts data.

**Current State**:

- Authentication system working (users can log in, session cookies set)
- Dashboard loads successfully with user information
- Frontend correctly handles errors and displays "Failed to fetch prompts" with retry button
- Error occurs specifically on GET `/api/prompts` endpoint
- Terminal shows: `prisma:error Error in PostgreSQL connection: Error { kind: Closed, cause: None }`

## 📋 INVESTIGATION FINDINGS

### 1. API Endpoint Analysis ✅

- **Location**: `/src/app/api/prompts/route.ts:54-96`
- **Flow**: `requireAuth()` → `getUserPrompts(user.id, query)` → `NextResponse.json(result)`
- **Error Handling**: Generic 500 response on line 91-94 catches all non-auth/validation errors
- **Critical Gap**: No specific database error logging or differentiation

### 2. Database Configuration ✅

- **Prisma Client**: Proper singleton pattern in `/src/lib/database/client.ts`
- **Logging**: Development mode enables `['query', 'error', 'warn']` but production only `['error']`
- **Connection**: Uses `DATABASE_URL` environment variable from PostgreSQL
- **Query Execution**: `getUserPrompts()` performs complex query with pagination, filtering, and relations

### 3. Environment Variables ✅

- **Local Environment**: `.env.local` properly configured
- **Production Gap**: Vercel environment variables need verification
- **Database URL**: Pattern suggests PostgreSQL connection string
- **Missing Variables**: Could be production-specific DATABASE_URL issues

### 4. Error Pattern Analysis ✅

- **Local Development**: Shows `prisma:error Error in PostgreSQL connection: Error { kind: Closed, cause: None }`
- **Authentication**: Working correctly (401 responses when not authenticated)
- **Timing**: Database connection closes intermittently during development
- **Production**: 500 errors suggest similar database connectivity issues in production

## 🎯 ROOT CAUSE HYPOTHESIS

**Primary Suspected Cause**: **Database Connection Pool Exhaustion/Timeout**

**Evidence**:

1. `Error { kind: Closed, cause: None }` indicates PostgreSQL connection closure
2. Successful authentication but failing prompts query suggests connection issues during query execution
3. Intermittent nature suggests connection pool or timeout problems
4. Complex `getUserPrompts()` query with multiple joins may exceed connection timeout

**Secondary Causes**:

- Production DATABASE_URL misconfiguration
- Prisma Client initialization issues in serverless environment
- Database connection limits exceeded
- Missing connection pooling configuration

## 📊 BALANCED SOLUTION APPROACH

### Phase 1: Immediate Fixes (Critical) 🚨

#### 1.1 Enhanced Error Logging

**Target**: `/src/app/api/prompts/route.ts`

```typescript
// Replace generic error handling with specific database error detection
catch (error) {
  console.error('API Prompts Error:', {
    error: error.message,
    stack: error.stack,
    userId: user?.id,
    timestamp: new Date().toISOString(),
    type: error.constructor.name
  });

  // Categorize errors
  if (error.code === 'P1001' || error.message.includes('connection')) {
    return NextResponse.json(
      { error: 'Database connection error', code: 'DB_CONNECTION_ERROR' },
      { status: 503 }
    );
  }

  if (error.code?.startsWith('P')) {
    return NextResponse.json(
      { error: 'Database query error', code: 'DB_QUERY_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

#### 1.2 Database Connection Health Check

**Target**: Create `/src/app/api/health/database/route.ts`

```typescript
import { prisma } from '@/lib/database/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

#### 1.3 Production Environment Validation

- Verify Vercel DATABASE_URL configuration
- Check database provider connection limits
- Validate Prisma Client configuration for serverless environment

### Phase 2: Resilience Improvements (Important) ⚡

#### 2.1 Connection Pool Optimization

**Target**: `/src/lib/database/client.ts`

```typescript
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add connection pool configuration
    engineType: 'binary',
    // Connection timeout and retry configuration
  });
```

#### 2.2 Query Retry Logic

**Target**: `/src/lib/database/queries.ts`

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 100; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export const getUserPrompts = async (userId: string, options: any) => {
  return withRetry(async () => {
    // Existing getUserPrompts implementation
  });
};
```

#### 2.3 Graceful Error Handling

- Implement specific database error responses
- Add user-friendly error messages with retry suggestions
- Create fallback mechanisms for partial failures

### Phase 3: Long-term Stability (Nice-to-have) 🎯

#### 3.1 Query Optimization

- Review `getUserPrompts()` query performance and indexing
- Implement selective field loading based on requirements
- Add query result caching for frequently accessed data

#### 3.2 Monitoring and Observability

- Add performance metrics for database queries
- Implement comprehensive health check endpoints
- Create error tracking dashboard for production issues

#### 3.3 Architectural Improvements

- Consider database connection middleware pattern
- Implement circuit breaker for database operations
- Add request/response caching layer

## 🚀 IMPLEMENTATION PRIORITY

### Priority 1: Must Fix Now (Days 1-2)

- [ ] Enhanced error logging with specific database error details
- [ ] Production DATABASE_URL verification and testing
- [ ] Basic database health check endpoint
- [ ] Connection retry logic for critical queries

### Priority 2: Fix This Week (Days 3-7)

- [ ] Connection pool configuration optimization
- [ ] Comprehensive error categorization and user-friendly messages
- [ ] Query performance monitoring implementation
- [ ] Automated health check integration

### Priority 3: Monitor & Improve (Weeks 2-4)

- [ ] Advanced performance monitoring dashboard
- [ ] Query optimization based on metrics
- [ ] Circuit breaker pattern implementation
- [ ] Comprehensive testing and load testing

## ✅ SUCCESS CRITERIA

### Immediate Success (Phase 1)

- [ ] Zero 500 errors on `/api/prompts` endpoint in production
- [ ] Clear error categorization in production logs
- [ ] Database connection health visibility
- [ ] Proper error responses with actionable codes

### Short-term Success (Phase 2)

- [ ] Sub-500ms average response times for prompts queries
- [ ] 99.9% uptime for database connectivity
- [ ] User-friendly error messages with retry guidance
- [ ] Automated connection recovery mechanisms

### Long-term Success (Phase 3)

- [ ] Comprehensive monitoring dashboard with alerts
- [ ] Proactive error detection and prevention
- [ ] Optimized database performance benchmarks
- [ ] Zero customer-impacting database issues

## 📊 TESTING STRATEGY

### Phase 1 Testing

1. **Local Testing**: Simulate connection failures and verify error handling
2. **Staging Testing**: Deploy with enhanced logging and test error scenarios
3. **Production Monitoring**: Deploy with careful monitoring and rollback plan

### Phase 2 Testing

1. **Load Testing**: Test connection pool limits and retry mechanisms
2. **Chaos Engineering**: Introduce controlled database failures
3. **Performance Testing**: Measure query optimization improvements

### Phase 3 Testing

1. **Integration Testing**: Comprehensive end-to-end testing
2. **User Acceptance Testing**: Verify error handling from user perspective
3. **Regression Testing**: Ensure all improvements maintain stability

## 🔄 ROLLBACK PLAN

### Immediate Rollback Triggers

- Increased error rates above baseline
- Authentication system failures
- Critical user-facing functionality broken

### Rollback Procedure

1. Revert API endpoint changes to previous stable version
2. Disable new health check endpoints if causing issues
3. Restore original Prisma Client configuration
4. Monitor for stability restoration

### Post-Rollback Actions

1. Analyze failure root cause with enhanced logging
2. Test fixes in isolated staging environment
3. Implement gradual rollout strategy for re-deployment

---

**Document Version**: 1.0
**Last Updated**: 2025-09-16
**Owner**: Development Team
**Next Review**: Post-Phase 1 Implementation
