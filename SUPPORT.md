# FormaOps Support Playbook

> **Purpose**: Technical support documentation for diagnosing, troubleshooting, and resolving issues in the FormaOps AI prompt management platform.

---

## Table of Contents

1. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
2. [Quick Diagnosis Decision Trees](#quick-diagnosis-decision-trees)
3. [System Components Reference](#system-components-reference)
4. [Debugging Commands & Queries](#debugging-commands--queries)
5. [How to Reproduce Bugs](#how-to-reproduce-bugs)
6. [Incident Response Checklist](#incident-response-checklist)
7. [User Self-Service Guide](#user-self-service-guide)
8. [Environment Variables Checklist](#environment-variables-checklist)
9. [Known Limitations & Workarounds](#known-limitations--workarounds)
10. [Monitoring & Health Checks](#monitoring--health-checks)
11. [Escalation Policy](#escalation-policy)
12. [Support Runbooks](#support-runbooks)

---

## Common Issues & Troubleshooting

### Issue: Prompt Execution Failures

**Symptoms**: User reports execution stuck in `PENDING` or `FAILED` state, error messages in UI

**Check**:

1. **OpenAI API Status**
   - Visit: https://status.openai.com
   - Check API key validity: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
   - Review error in `src/lib/openai/client.ts:47-89` (error classification logic)

2. **Execution Logs**

   ```sql
   SELECT * FROM "ExecutionLog"
   WHERE "executionId" = 'xxx'
   ORDER BY timestamp DESC;
   ```

3. **Error Type Classification** (`src/lib/execution/error-handler.ts:15-45`)
   - `RATE_LIMIT`: OpenAI rate limit hit → Check retry-after header
   - `API_ERROR`: OpenAI service issue → Check status.openai.com
   - `TIMEOUT`: Request exceeded timeout → Check circuit breaker state
   - `VALIDATION_ERROR`: Input validation failed → Review validation config

4. **Retry Logic Status** (`src/lib/execution/retry-logic.ts:10-50`)
   - Max attempts: 3 (configurable)
   - Current retry count in `Execution.retryCount`
   - Exponential backoff: 1s, 2s, 4s (with 10% jitter)

5. **Budget Enforcement** (`src/lib/cost/budget-manager.ts:20-80`)
   - Check user's monthly spending vs plan limit
   - Query: `SELECT plan FROM "User" WHERE id = 'xxx'`
   - FREE: $10/month, PRO: $100/month, ENTERPRISE: $1000/month

**Resolution Paths**:

- Rate limit → Wait for cooldown or upgrade plan
- API error → Check OpenAI status, verify API key
- Timeout → Investigate circuit breaker, database performance
- Budget exceeded → Inform user, offer plan upgrade
- Validation error → Review prompt template and variable definitions

---

### Issue: Authentication Failures

**Symptoms**: "Unauthorized" errors, redirect to login, session expires unexpectedly

**Check**:

1. **Supabase Auth Status**
   - Visit: https://status.supabase.com
   - Check project status in Supabase dashboard
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **JWT Token Validity** (`src/lib/auth/server.ts:15-45`)

   ```bash
   # Decode JWT token from cookie (use jwt.io or jwt-cli)
   echo $JWT_TOKEN | jwt decode -
   ```

   - Check `exp` (expiration) timestamp
   - Verify `sub` (user ID) exists in database

3. **Session Cookie**
   - Check browser DevTools → Application → Cookies
   - Look for `sb-access-token` and `sb-refresh-token`
   - Verify `httpOnly`, `secure`, `sameSite=strict` flags

4. **User Record Sync** (`src/lib/auth/server.ts:60-120`)

   ```sql
   SELECT id, email, "createdAt" FROM "User" WHERE id = 'xxx';
   ```

   - Verify user exists in both Supabase `auth.users` and application `User` table

5. **Middleware Authentication** (`src/middleware.ts:80-120`)
   - Check if route is protected (under `/(dashboard)` group)
   - Review middleware logs for auth failures
   - Verify `requireAuth()` middleware is applied

**Resolution Paths**:

- Token expired → User needs to log in again (normal behavior)
- Cookie missing → Check browser cookie settings, ad blockers
- User sync issue → Run user sync script or manual INSERT
- Supabase outage → Check status page, notify users
- CORS issue → Verify `NEXT_PUBLIC_SUPABASE_URL` matches origin

---

### Issue: Rate Limiting (429 Errors)

**Symptoms**: User sees "Too many requests" error, HTTP 429 responses

**Check**:

1. **Rate Limit Configuration** (`src/lib/security/rate-limit.ts:15-60`)
   - `/api/auth/login`: 50 requests per 15 minutes
   - `/api/auth/register`: 20 requests per 15 minutes
   - `/api/prompts/[id]/execute`: 50 requests per hour
   - Default: 500 requests per hour

2. **Upstash Redis Status**
   - Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Test connectivity:
     ```bash
     curl -X GET "$UPSTASH_REDIS_REST_URL/get/test" \
       -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
     ```

3. **Rate Limit Headers** (returned in API response)
   - `X-RateLimit-Limit`: Total allowed requests
   - `X-RateLimit-Remaining`: Requests remaining in window
   - `X-RateLimit-Reset`: Timestamp when limit resets

4. **User Agent Blocking** (`src/lib/security/rate-limit.ts:150-180`)
   - Check if user agent is in suspicious list (bots, crawlers)
   - Review request headers for automation tools

5. **Fallback Behavior** (`src/lib/security/rate-limit.ts:100-130`)
   - In development or if Redis unavailable, uses in-memory limiter
   - Check `NODE_ENV` and Redis connection status

**Resolution Paths**:

- Legitimate user hit limit → Inform of cooldown period, show reset time
- Bot/automation → User needs to reduce request frequency
- Redis outage → System falls back to in-memory (per-instance limits)
- False positive → Manually clear Redis key or adjust limits
- Suspicious activity → Investigate for abuse, consider blocking

---

### Issue: Database Connection Problems

**Symptoms**: "Cannot connect to database" errors, slow queries, circuit breaker OPEN

**Check**:

1. **Database Health Endpoint**

   ```bash
   curl http://localhost:3000/api/health/database
   ```

   - Returns: `{ healthy: true/false, latency: number, circuitBreaker: "CLOSED/OPEN/HALF_OPEN" }`

2. **Circuit Breaker State** (`src/lib/resilience/circuit-breaker.ts:30-150`)
   - **CLOSED**: Normal operation
   - **OPEN**: Too many failures, failing fast (60s timeout)
   - **HALF_OPEN**: Testing recovery with limited requests
   - Check metrics: `failureCount`, `successCount`, `consecutiveFailures`

3. **Prisma Connection**

   ```bash
   # Test database connectivity
   npx prisma db pull

   # Check connection pool
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

4. **Database URL** (`.env`)
   - Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db?schema=public`
   - Check Supabase project status and connection pooler
   - Test direct connection: `psql $DATABASE_URL`

5. **Query Performance** (`src/lib/database/queries.ts`)
   - Enable Prisma query logging: Set `log: ["query", "error", "warn"]` in `src/lib/database/client.ts`
   - Check slow query log in PostgreSQL
   - Review indexes on frequently queried columns

**Resolution Paths**:

- Circuit breaker OPEN → Wait 60s for automatic recovery or restart service
- Connection pool exhausted → Increase pool size or investigate connection leaks
- Slow queries → Analyze EXPLAIN plans, add indexes, optimize queries
- Database outage → Check Supabase status, escalate to infrastructure
- SSL certificate issue → Verify `?sslmode=require` in DATABASE_URL

---

### Issue: CSRF Token Validation Failures

**Symptoms**: "Invalid CSRF token" error on POST/PUT/DELETE requests, 403 responses

**Check**:

1. **CSRF Middleware** (`src/middleware.ts:40-80`)
   - Validates on: POST, PUT, DELETE, PATCH methods
   - Exempt routes: `/api/health*`, `/api/cron/*`
   - Token extracted from: `X-CSRF-Token` header or `_csrf` body field

2. **Token Generation** (`src/lib/security/csrf.ts:15-40`)
   - 32-byte random token generated per-request
   - Stored in httpOnly cookie: `csrf-token`
   - Must be included in request header

3. **Cookie Configuration**
   - Check browser DevTools → Application → Cookies
   - Look for `csrf-token` cookie
   - Verify flags: `httpOnly=true`, `sameSite=strict`, `secure=true` (production)

4. **Timing-Safe Comparison** (`src/lib/security/csrf.ts:50-70`)
   - Uses `crypto.timingSafeEqual()` to prevent timing attacks
   - Tokens must match exactly (byte-for-byte)

5. **Client-Side Implementation** (`src/lib/utils/csrf-client.ts`)
   - Check if frontend includes `X-CSRF-Token` header
   - Review form submissions and API calls

**Resolution Paths**:

- Missing token → Ensure frontend includes CSRF token in requests
- Cookie blocked → Check browser settings, third-party cookie blockers
- Token mismatch → Clear cookies, refresh page to get new token
- SameSite issue → Verify domain matches, check proxy/CDN configuration
- Development mode → Verify localhost configuration

---

### Issue: Cost Budget Exceeded

**Symptoms**: User sees "Budget exceeded" error (HTTP 402), cannot execute prompts

**Check**:

1. **User Plan & Budget** (`src/lib/cost/budget-manager.ts:25-50`)

   ```sql
   SELECT id, email, plan FROM "User" WHERE id = 'xxx';
   ```

   - FREE: $10/month
   - PRO: $100/month
   - ENTERPRISE: $1000/month

2. **Current Month Spending**

   ```sql
   SELECT
     SUM("costUsd") as total_cost,
     COUNT(*) as execution_count,
     model
   FROM "Execution"
   WHERE "userId" = 'xxx'
     AND "createdAt" >= date_trunc('month', CURRENT_DATE)
     AND status = 'COMPLETED'
   GROUP BY model;
   ```

3. **Cost Calculation** (`src/lib/monitoring/cost-tracker.ts:20-80`)
   - GPT-3.5-turbo: $0.0015/1K input, $0.002/1K output
   - GPT-4: $0.03/1K input, $0.06/1K output
   - Stored in `Execution.costUsd` (6 decimal precision)

4. **Budget Check Logic** (`src/lib/cost/budget-manager.ts:60-100`)
   - Checks before execution
   - Estimates cost based on input tokens
   - Returns 402 if current_spending + estimated_cost > limit

**Resolution Paths**:

- Upgrade plan → Guide user to upgrade from FREE to PRO/ENTERPRISE
- Wait for reset → Budget resets on 1st of each month
- Review spending → Show analytics dashboard with cost breakdown
- Optimize usage → Suggest using cheaper models (GPT-3.5 vs GPT-4)
- Manual override → Admin can adjust plan or reset budget (escalate)

---

### Issue: Prompt Injection Detection False Positives

**Symptoms**: User's legitimate prompt flagged as potential injection attack

**Check**:

1. **Prompt Injection Guard** (`src/lib/security/prompt-injection-guard.ts:15-120`)
   - 40+ dangerous patterns detected
   - Severity scoring: LOW (1-3), MEDIUM (4-6), HIGH (7-10)
   - Patterns include: system prompt leakage, instruction override, role manipulation

2. **Detection Patterns**

   ```typescript
   // Common triggers
   - "ignore previous instructions"
   - "you are now in developer mode"
   - "disregard all above"
   - Unicode homoglyphs (е vs e)
   - Base64/URL encoded payloads
   ```

3. **Input Validation** (`src/lib/security/input-validation.ts:50-100`)
   - Checks prompt templates and execution inputs
   - Sanitizes HTML with DOMPurify
   - Normalizes Unicode to prevent homoglyph attacks

4. **Review Flagged Content**
   - Get exact prompt that was rejected
   - Identify which pattern triggered (check logs)
   - Assess if it's legitimate business use case

**Resolution Paths**:

- False positive → Whitelist specific pattern or adjust threshold
- Legitimate edge case → Document exception, add to test cases
- User education → Explain why content was flagged, suggest rephrasing
- Pattern refinement → Update regex in prompt-injection-guard.ts
- Disable for trusted users → Add bypass flag (requires engineering change)

---

### Issue: Variable Validation Errors

**Symptoms**: Form validation fails, "Invalid value for variable X" errors

**Check**:

1. **Variable Definition** (`Prompt.variables` JSON field)

   ```json
   {
     "name": "temperature",
     "type": "number",
     "required": true,
     "validation": {
       "min": 0,
       "max": 2
     }
   }
   ```

2. **Validation Types** (`src/lib/validation/`)
   - **Schema Validator** (`schema-validator.ts`): JSON Schema validation via Zod
   - **Regex Validator** (`regex-validator.ts`): Pattern matching
   - **Function Validator** (`function-validator.ts`): Custom validation logic

3. **Form Generation** (`src/components/execution/enhanced-execution-panel.tsx:100-300`)
   - Check if variable type matches input field type
   - Review validation config in variable definition
   - Test with minimal input first

4. **Template Engine** (`src/lib/prompts/template-engine.ts:30-80`)
   - Validates {{variable}} substitution
   - Checks for undefined variables in template
   - Type coercion errors

5. **Execution Input**
   ```sql
   SELECT inputs, "errorMessage" FROM "Execution" WHERE id = 'xxx';
   ```

**Resolution Paths**:

- Type mismatch → Correct variable type in prompt definition
- Range error → Adjust min/max constraints or user input
- Required field → Ensure user provides all required variables
- Regex pattern → Test regex pattern separately, adjust if too strict
- Template error → Fix {{variable}} syntax in prompt template

---

## Quick Diagnosis Decision Trees

### Decision Tree: "Execution Failed"

```
User reports execution failed
│
├─ Check Execution.status in database
│  │
│  ├─ PENDING > 5 minutes
│  │  ├─ Check OpenAI API status → Down? → External outage
│  │  ├─ Check circuit breaker → OPEN? → Database issue
│  │  └─ Check execution queue → Stuck? → Restart worker
│  │
│  ├─ FAILED with errorType
│  │  ├─ RATE_LIMIT
│  │  │  ├─ Check Execution.retryCount → <3? → Will auto-retry
│  │  │  └─ Check retry-after header → Inform user of wait time
│  │  │
│  │  ├─ API_ERROR
│  │  │  ├─ Check status.openai.com → Down? → External outage
│  │  │  ├─ Check OPENAI_API_KEY → Invalid? → Fix env var
│  │  │  └─ Check errorMessage → Parse OpenAI error details
│  │  │
│  │  ├─ TIMEOUT
│  │  │  ├─ Check circuit breaker state → OPEN? → Database issue
│  │  │  ├─ Check model → GPT-4? → May need more time
│  │  │  └─ Check input size → Large? → Reduce or increase timeout
│  │  │
│  │  ├─ VALIDATION_ERROR
│  │  │  ├─ Review Execution.inputs → Check variable values
│  │  │  ├─ Review Prompt.variables → Check validation config
│  │  │  └─ Check validationErrors JSON → See specific failures
│  │  │
│  │  └─ OTHER
│  │     ├─ Check ExecutionLog table → Review detailed logs
│  │     └─ Check errorMessage → Parse error details
│  │
│  └─ CANCELLED
│     └─ User cancelled or system terminated → Check user action
│
└─ If not in database → Check if request reached backend
   ├─ Check network tab → 4xx/5xx? → API error
   ├─ Check rate limiting → 429? → Too many requests
   └─ Check auth → 401? → Authentication issue
```

### Decision Tree: "Cannot Log In"

```
User cannot log in
│
├─ Check Supabase status → status.supabase.com
│  └─ Down? → External outage, notify users
│
├─ Check error message
│  │
│  ├─ "Invalid credentials"
│  │  ├─ Verify email exists in database
│  │  │  └─ Not found? → User needs to register first
│  │  ├─ Check password → Minimum 12 characters?
│  │  └─ Check auth.users table in Supabase dashboard
│  │
│  ├─ "Too many requests" (429)
│  │  ├─ Check rate limit: 50 attempts per 15 minutes
│  │  ├─ Check X-RateLimit-Reset header → When does it reset?
│  │  └─ Suspicious activity? → Investigate potential abuse
│  │
│  ├─ "Invalid CSRF token" (403)
│  │  ├─ Check csrf-token cookie in browser
│  │  ├─ Check X-CSRF-Token header in request
│  │  └─ Clear cookies, refresh page, try again
│  │
│  └─ Network error
│     ├─ Check NEXT_PUBLIC_SUPABASE_URL → Correct?
│     ├─ Check CORS → Browser blocking?
│     └─ Check Supabase project → Active subscription?
│
└─ Login succeeds but immediately logged out
   ├─ Check JWT token expiration → exp timestamp
   ├─ Check cookie persistence → Browser settings
   └─ Check User table sync → Record exists?
```

### Decision Tree: "System is Slow"

```
User reports slow performance
│
├─ Check /api/health/system endpoint
│  │
│  ├─ circuitBreaker: "OPEN"
│  │  ├─ Database issues → Check database health
│  │  ├─ Too many failures → Review error logs
│  │  └─ Wait 60s for recovery → Monitor HALF_OPEN state
│  │
│  ├─ cacheHitRate < 40%
│  │  ├─ Cache not warming up → May be cold start
│  │  ├─ TTL too short → Review cache config (5min default)
│  │  └─ Queries not cacheable → Review query patterns
│  │
│  └─ All healthy → Investigate specific slow operation
│
├─ Check database performance
│  ├─ Run: SELECT * FROM pg_stat_activity;
│  ├─ Long-running queries? → Identify and optimize
│  ├─ Connection pool full? → Check active connections
│  └─ Missing indexes? → Review EXPLAIN plans
│
├─ Check OpenAI API latency
│  ├─ Review Execution.latencyMs for recent executions
│  ├─ Average > 10s? → Normal for GPT-4, may be OpenAI load
│  └─ Timeouts? → OpenAI may be experiencing high load
│
├─ Check Upstash Redis latency
│  ├─ Rate limit checks slow? → Check Redis status
│  └─ Fallback to in-memory? → Check connection logs
│
└─ Check application server
   ├─ Vercel metrics → Check response times, cold starts
   ├─ Memory usage → Check for leaks
   └─ Build errors → Check deployment logs
```

---

## System Components Reference

### Key Files for Troubleshooting

| Component                  | File Path                                    | Purpose                                             |
| -------------------------- | -------------------------------------------- | --------------------------------------------------- |
| **Middleware**             | `src/middleware.ts`                          | CSRF, rate limiting, security headers, auth routing |
| **OpenAI Client**          | `src/lib/openai/client.ts`                   | OpenAI API integration, error handling              |
| **Error Handler**          | `src/lib/execution/error-handler.ts`         | Error classification, retry determination           |
| **Retry Logic**            | `src/lib/execution/retry-logic.ts`           | Exponential backoff, retry attempts                 |
| **Rate Limiter**           | `src/lib/security/rate-limit.ts`             | Distributed rate limiting via Upstash               |
| **CSRF Protection**        | `src/lib/security/csrf.ts`                   | Token generation and validation                     |
| **Budget Manager**         | `src/lib/cost/budget-manager.ts`             | User budget enforcement                             |
| **Circuit Breaker**        | `src/lib/resilience/circuit-breaker.ts`      | Failure detection and recovery                      |
| **Query Cache**            | `src/lib/cache/query-cache.ts`               | In-memory caching with TTL                          |
| **Database Queries**       | `src/lib/database/queries.ts`                | All Prisma query operations (808 lines)             |
| **Auth Server**            | `src/lib/auth/server.ts`                     | Server-side authentication                          |
| **Logger**                 | `src/lib/monitoring/logger.ts`               | Structured logging                                  |
| **Cost Tracker**           | `src/lib/monitoring/cost-tracker.ts`         | Cost calculation and tracking                       |
| **Prompt Injection Guard** | `src/lib/security/prompt-injection-guard.ts` | Injection detection (40+ patterns)                  |
| **Template Engine**        | `src/lib/prompts/template-engine.ts`         | Variable substitution                               |
| **Input Validation**       | `src/lib/security/input-validation.ts`       | Input sanitization and validation                   |

### Database Tables

| Table             | Purpose            | Key Fields                                                                   |
| ----------------- | ------------------ | ---------------------------------------------------------------------------- |
| `User`            | User accounts      | id, email, plan, createdAt                                                   |
| `Prompt`          | Prompt definitions | id, template, variables (JSON), status, version                              |
| `PromptVersion`   | Version history    | id, version, promptId, changeLog                                             |
| `Execution`       | Prompt executions  | id, status, inputs (JSON), output, errorType, costUsd, tokenUsage, latencyMs |
| `ExecutionLog`    | Execution logs     | id, executionId, level, message, metadata (JSON), timestamp                  |
| `ExecutionResult` | Execution results  | id, executionId, rawOutput, tokenUsage, costUsd                              |
| `Validation`      | Validation rules   | id, promptId, type, config (JSON), isActive                                  |
| `ApiKey`          | API keys           | id, userId, keyHash, lastUsed, isActive                                      |
| `UserPreferences` | User settings      | id, userId, 30+ preference fields                                            |

### Health Endpoints

| Endpoint               | Purpose               | Response                                    |
| ---------------------- | --------------------- | ------------------------------------------- |
| `/api/health`          | Basic health check    | `{ status: "healthy" }`                     |
| `/api/health/system`   | Full system health    | Circuit breaker state, cache stats, uptime  |
| `/api/health/database` | Database connectivity | Connection status, latency, circuit breaker |

### API Routes

| Route                        | Method | Purpose            | Rate Limit |
| ---------------------------- | ------ | ------------------ | ---------- |
| `/api/auth/register`         | POST   | User registration  | 20/15min   |
| `/api/auth/login`            | POST   | User login         | 50/15min   |
| `/api/auth/logout`           | POST   | User logout        | -          |
| `/api/auth/me`               | GET    | Get current user   | -          |
| `/api/prompts`               | GET    | List prompts       | 500/hour   |
| `/api/prompts`               | POST   | Create prompt      | 500/hour   |
| `/api/prompts/[id]`          | GET    | Get prompt         | 500/hour   |
| `/api/prompts/[id]`          | PUT    | Update prompt      | 500/hour   |
| `/api/prompts/[id]`          | DELETE | Delete prompt      | 500/hour   |
| `/api/prompts/[id]/execute`  | POST   | Execute prompt     | 50/hour    |
| `/api/executions`            | GET    | List executions    | 500/hour   |
| `/api/executions/[id]`       | GET    | Get execution      | 500/hour   |
| `/api/executions/[id]/retry` | POST   | Retry execution    | 50/hour    |
| `/api/preferences`           | GET    | Get preferences    | 500/hour   |
| `/api/preferences`           | PUT    | Update preferences | 500/hour   |

---

## Debugging Commands & Queries

### Database Queries

```sql
-- Get user details and plan
SELECT id, email, plan, "createdAt"
FROM "User"
WHERE email = 'user@example.com';

-- Get recent failed executions for user
SELECT id, status, "errorType", "errorMessage", "createdAt"
FROM "Execution"
WHERE "userId" = 'xxx'
  AND status = 'FAILED'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Get execution logs for specific execution
SELECT level, message, metadata, timestamp
FROM "ExecutionLog"
WHERE "executionId" = 'xxx'
ORDER BY timestamp ASC;

-- Calculate user's current month spending
SELECT
  SUM("costUsd") as total_cost,
  COUNT(*) as execution_count,
  AVG("latencyMs") as avg_latency_ms
FROM "Execution"
WHERE "userId" = 'xxx'
  AND "createdAt" >= date_trunc('month', CURRENT_DATE)
  AND status = 'COMPLETED';

-- Get most expensive executions
SELECT id, model, "costUsd", "totalTokens", "createdAt"
FROM "Execution"
WHERE "userId" = 'xxx'
ORDER BY "costUsd" DESC
LIMIT 10;

-- Check prompt variables configuration
SELECT id, name, template, variables
FROM "Prompt"
WHERE id = 'xxx';

-- Get active validations for prompt
SELECT id, name, type, config, "isActive"
FROM "Validation"
WHERE "promptId" = 'xxx'
  AND "isActive" = true;

-- Check user preferences
SELECT * FROM "UserPreferences"
WHERE "userId" = 'xxx';

-- Count executions by status
SELECT status, COUNT(*) as count
FROM "Execution"
WHERE "userId" = 'xxx'
  AND "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status;

-- Identify slow queries (requires pg_stat_statements extension)
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check active database connections
SELECT
  datname,
  usename,
  application_name,
  state,
  query
FROM pg_stat_activity
WHERE datname = 'your_database';
```

### API Testing Commands

```bash
# Health checks
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/system
curl http://localhost:3000/api/health/database

# Test OpenAI connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Upstash Redis connectivity
curl -X GET "$UPSTASH_REDIS_REST_URL/get/test" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Test Supabase connectivity
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Get user info (requires auth token)
curl http://localhost:3000/api/auth/me \
  -H "Cookie: sb-access-token=$JWT_TOKEN"

# List user's prompts
curl "http://localhost:3000/api/prompts?page=1&limit=10" \
  -H "Cookie: sb-access-token=$JWT_TOKEN"

# Get execution details
curl http://localhost:3000/api/executions/$EXECUTION_ID \
  -H "Cookie: sb-access-token=$JWT_TOKEN"

# Check rate limit headers
curl -I http://localhost:3000/api/prompts \
  -H "Cookie: sb-access-token=$JWT_TOKEN"
# Look for: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### Prisma Commands

```bash
# Test database connectivity
npx prisma db pull

# Generate Prisma client
npx prisma generate

# View database schema
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Run migrations
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# Seed database
npx prisma db seed
```

### Application Commands

```bash
# Start development server
npm run dev

# Build production
npm run build

# Run tests
npm test
npm run test:watch

# Run E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint code
npm run lint

# View bundle size
npm run analyze
```

### Logs & Monitoring

```bash
# View Vercel deployment logs
vercel logs --follow

# View Docker container logs
docker-compose logs -f app

# Search logs for specific error
grep -r "RATE_LIMIT" .next/server/

# Monitor real-time logs (if logging to file)
tail -f logs/application.log

# Filter by log level
grep "ERROR" logs/application.log | tail -20
```

---

## How to Reproduce Bugs

### Bug Report Template

When a user reports an issue, gather the following information:

1. **User Context**
   - User ID or email
   - Account plan (FREE/PRO/ENTERPRISE)
   - Browser and version
   - Device and OS
   - Timezone

2. **Expected Behavior**
   - What should happen?
   - What feature were they using?
   - What was their goal?

3. **Actual Behavior**
   - What happened instead?
   - Error message (exact text)
   - Screenshot or screen recording
   - Network tab (for API errors)

4. **Reproduction Steps**

   ```
   1. Navigate to [page]
   2. Click [button]
   3. Enter [data]
   4. Observe [error]
   ```

5. **Environment Context**
   - Execution ID (if applicable)
   - Prompt ID (if applicable)
   - Timestamp of issue
   - Request ID (from response headers)

6. **Impact Assessment**
   - How many users affected?
   - Frequency of occurrence
   - Workaround available?
   - Business impact

### Local Reproduction Steps

1. **Set up local environment**

   ```bash
   git clone <repo>
   cp .env.example .env
   # Fill in environment variables
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

2. **Replicate user data**

   ```sql
   -- Copy user record
   INSERT INTO "User" (id, email, plan) VALUES ('test-user-id', 'test@example.com', 'FREE');

   -- Copy prompt (if issue is prompt-specific)
   INSERT INTO "Prompt" (...) SELECT ... FROM "Prompt" WHERE id = 'xxx';
   ```

3. **Follow exact reproduction steps**
   - Use same browser/device if possible
   - Use same input data
   - Check for timing issues (race conditions)

4. **Capture debug information**
   - Enable verbose logging
   - Use browser DevTools (Network, Console)
   - Check database state before/after
   - Review Prisma query logs

5. **Isolate the failure component**
   - API route? Test with curl
   - Database query? Test in Prisma Studio
   - OpenAI API? Test with direct curl
   - Frontend validation? Disable and retry
   - Security middleware? Check exemptions

6. **Document findings**
   - Root cause identified?
   - Affected code paths
   - Suggested fix
   - Regression risk
   - Test cases to prevent recurrence

---

## Incident Response Checklist

### Severity Levels

- **P0 (Critical)**: Complete service outage, data loss, security breach
- **P1 (High)**: Major feature broken, significant user impact
- **P2 (Medium)**: Minor feature broken, limited user impact
- **P3 (Low)**: Cosmetic issue, workaround available

### Incident Response Steps

#### Phase 1: Detect & Alert (0-5 minutes)

- [ ] **Receive alert** (monitoring system, user report, health check failure)
- [ ] **Verify issue** is real (not false alarm)
- [ ] **Assess severity** (P0/P1/P2/P3)
- [ ] **Notify stakeholders** (team lead, on-call engineer)
- [ ] **Create incident ticket** with all known details

#### Phase 2: Triage & Contain (5-15 minutes)

- [ ] **Identify failure source**
  - [ ] Check `/api/health/system` for circuit breaker status
  - [ ] Check Vercel deployment status
  - [ ] Check external service status (OpenAI, Supabase, Upstash)
  - [ ] Check recent deployments/changes
  - [ ] Review error logs (ExecutionLog table, Vercel logs)

- [ ] **Contain impact**
  - [ ] If database issue → Circuit breaker should auto-protect
  - [ ] If OpenAI issue → Queue requests or show maintenance message
  - [ ] If security issue → Block affected endpoints, rotate credentials
  - [ ] If rate limit abuse → Block suspicious IPs/users
  - [ ] If bad deployment → Rollback to previous version

- [ ] **Communicate status**
  - [ ] Update status page (if available)
  - [ ] Notify affected users via email/banner
  - [ ] Provide ETA for resolution (if known)

#### Phase 3: Investigate & Fix (15-60 minutes)

- [ ] **Diagnose root cause**
  - [ ] Use decision trees above
  - [ ] Check relevant logs and metrics
  - [ ] Reproduce locally if possible
  - [ ] Identify exact failure point

- [ ] **Implement fix**
  - [ ] If config issue → Update environment variables
  - [ ] If code bug → Deploy hotfix
  - [ ] If external service → Wait for recovery or implement workaround
  - [ ] If database → Run migration or manual SQL
  - [ ] If rate limit → Clear Redis keys or adjust limits

- [ ] **Test fix**
  - [ ] Verify in staging environment (if available)
  - [ ] Test affected user flows
  - [ ] Monitor error rates post-deployment

#### Phase 4: Verify Recovery (60-90 minutes)

- [ ] **Confirm resolution**
  - [ ] Check health endpoints (all green)
  - [ ] Test affected features end-to-end
  - [ ] Verify circuit breaker returned to CLOSED
  - [ ] Monitor error logs (no new errors)
  - [ ] Confirm with initial reporter (if user report)

- [ ] **Restore normal operations**
  - [ ] Remove maintenance messages
  - [ ] Re-enable any disabled features
  - [ ] Resume normal monitoring

#### Phase 5: Post-Incident Review (24-48 hours)

- [ ] **Document root cause**
  - [ ] What happened?
  - [ ] Why did it happen?
  - [ ] What was the impact? (users affected, duration, cost)

- [ ] **Identify prevention measures**
  - [ ] Add monitoring/alerting to detect earlier
  - [ ] Add validation to prevent recurrence
  - [ ] Update runbooks with learnings
  - [ ] Add test cases for regression prevention

- [ ] **Action items**
  - [ ] Assign owners for each action item
  - [ ] Set deadlines
  - [ ] Track in project management system

- [ ] **Update documentation**
  - [ ] Add issue to "Known Issues" if recurring
  - [ ] Update troubleshooting guide
  - [ ] Update support playbook (this document)

---

## User Self-Service Guide

Help users troubleshoot common issues themselves:

### "My execution failed"

**User Self-Service Steps:**

1. Go to **Executions** page → Find the failed execution
2. Click on execution to view details
3. Check the **Error** tab for error message
4. Common errors:
   - **"Rate limit exceeded"** → Wait 15-60 minutes, try again
   - **"Budget exceeded"** → Upgrade plan or wait until next month
   - **"Validation error"** → Check your input values match requirements
   - **"API timeout"** → Try again, may be temporary OpenAI issue
5. Try the **Retry** button (if available)
6. If still failing, contact support with execution ID

### "I can't log in"

**User Self-Service Steps:**

1. Check email and password (password must be 12+ characters)
2. Try **Forgot Password** flow
3. Clear browser cookies and cache
4. Try in incognito/private mode
5. Check browser console for errors (F12)
6. Verify email address is correct
7. If new user, try **Register** instead
8. Contact support if still blocked

### "My results look wrong"

**User Self-Service Steps:**

1. Go to execution details page
2. Check the **Inputs** tab → Verify your input values
3. Check the **Raw Data** tab → See full OpenAI response
4. Check the **Metrics** tab → Verify model used (GPT-3.5 vs GPT-4)
5. Review your prompt template for clarity
6. Try adjusting temperature (lower = more deterministic)
7. Try different models for comparison
8. Contact support with execution ID if unexpected

### "I'm being rate limited"

**User Self-Service Steps:**

1. Check error message for reset time
2. Wait for rate limit window to reset
3. Rate limits:
   - Login: 50 attempts per 15 minutes
   - Execution: 50 per hour
4. If legitimate usage, consider:
   - Spreading requests over time
   - Upgrading plan for higher limits
5. Contact support if you believe it's an error

### "My budget is exceeded"

**User Self-Service Steps:**

1. Go to **Analytics** page → View spending breakdown
2. Check current month's cost by model
3. Budget limits:
   - FREE: $10/month
   - PRO: $100/month
   - ENTERPRISE: $1000/month
4. Options:
   - Wait until next month (resets on 1st)
   - Upgrade to higher plan
   - Use cheaper models (GPT-3.5 instead of GPT-4)
5. Contact sales for enterprise pricing

### "Page is loading slowly"

**User Self-Service Steps:**

1. Check your internet connection
2. Try refreshing the page (Cmd/Ctrl + R)
3. Clear browser cache
4. Check browser extensions (disable ad blockers)
5. Try different browser
6. Check https://status.vercel.com for outages
7. Contact support if consistently slow

---

## Environment Variables Checklist

Critical environment variables that cause issues when misconfigured:

| Variable                        | Required       | Common Issues                                          | How to Fix                                                          |
| ------------------------------- | -------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `DATABASE_URL`                  | ✅ Yes         | Invalid format, wrong credentials, network unreachable | Verify PostgreSQL connection string, test with `psql $DATABASE_URL` |
| `OPENAI_API_KEY`                | ✅ Yes         | Invalid key, expired key, insufficient quota           | Verify at https://platform.openai.com/api-keys, check billing       |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ Yes         | Wrong project URL, typo                                | Copy from Supabase project settings → API                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes         | Wrong key, expired                                     | Copy from Supabase project settings → API                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅ Yes         | Wrong key, used anon key instead                       | Copy "service_role" key (not anon key) from Supabase                |
| `UPSTASH_REDIS_REST_URL`        | ⚠️ Recommended | Missing → rate limit falls back to in-memory           | Create Upstash Redis database, copy REST URL                        |
| `UPSTASH_REDIS_REST_TOKEN`      | ⚠️ Recommended | Invalid token                                          | Copy from Upstash console                                           |
| `ENCRYPTION_KEY`                | ⚠️ Recommended | Wrong key → decryption fails                           | Generate: `openssl rand -hex 32`, keep consistent                   |
| `NEXTAUTH_SECRET`               | ✅ Yes         | Missing or weak                                        | Generate: `openssl rand -base64 32`                                 |
| `NEXTAUTH_URL`                  | ✅ Yes         | Wrong domain                                           | Set to app URL (e.g., https://forma-ops.vercel.app)                 |
| `CRON_SECRET`                   | ⚠️ Recommended | Missing → cron endpoints exposed                       | Generate random string, use in cron requests                        |
| `NODE_ENV`                      | ✅ Yes         | Wrong value                                            | Set to "development" locally, "production" on Vercel                |
| `OPENAI_DEFAULT_MODEL`          | ❌ No          | Missing → uses hardcoded default                       | Set to "gpt-3.5-turbo" or "gpt-4"                                   |
| `OPENAI_MAX_TOKENS`             | ❌ No          | Too low → truncated responses                          | Increase to 2000-4000 based on needs                                |
| `OPENAI_TEMPERATURE`            | ❌ No          | Too high/low → unexpected results                      | Set between 0.0 (deterministic) and 2.0 (creative)                  |

### Validation Script

```bash
#!/bin/bash
# Check environment variables

echo "Checking environment variables..."

# Required variables
required_vars=("DATABASE_URL" "OPENAI_API_KEY" "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "NEXTAUTH_SECRET" "NEXTAUTH_URL")

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ $var is not set"
  else
    echo "✅ $var is set"
  fi
done

# Optional but recommended
optional_vars=("UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN" "ENCRYPTION_KEY" "CRON_SECRET")

for var in "${optional_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "⚠️  $var is not set (optional)"
  else
    echo "✅ $var is set"
  fi
done

# Test connectivity
echo -e "\nTesting connectivity..."

# Test database
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
fi

# Test OpenAI API
if curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | grep -q "gpt"; then
  echo "✅ OpenAI API connection successful"
else
  echo "❌ OpenAI API connection failed"
fi

# Test Supabase
if curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" > /dev/null 2>&1; then
  echo "✅ Supabase connection successful"
else
  echo "❌ Supabase connection failed"
fi

echo -e "\nValidation complete!"
```

---

## Known Limitations & Workarounds

### Limitation 1: Monthly Budget Resets

**Issue**: Budget resets on 1st of month at UTC midnight, not user's timezone

**Impact**: Users may hit limit on last day of month even if they have budget left in their timezone

**Workaround**:

- Explain UTC reset to users
- Suggest planning usage to avoid end-of-month crunch
- For critical users, manually adjust plan or reset budget (escalate to admin)

**Future Fix**: Add timezone-aware budget resets

---

### Limitation 2: Rate Limit Windows

**Issue**: Rate limit windows are fixed (15 min, 1 hour), not sliding per-user

**Impact**: User who hits limit must wait for full window to reset

**Workaround**:

- Show reset time in error message
- Suggest spacing out requests
- For legitimate spikes, temporarily clear Redis key (admin action)

**Future Fix**: Implement token bucket algorithm for smoother rate limiting

---

### Limitation 3: Execution Retry Limit

**Issue**: Max 3 automatic retries with exponential backoff (1s, 2s, 4s)

**Impact**: If OpenAI is down >7s, execution fails permanently

**Workaround**:

- User can manually retry from UI (uses separate retry endpoint)
- Increase retry attempts in config for critical prompts (code change)
- Implement queue system for retry later (future enhancement)

**Future Fix**: Add configurable retry strategy per prompt

---

### Limitation 4: Circuit Breaker Recovery Time

**Issue**: Circuit breaker stays OPEN for 60s before testing recovery (HALF_OPEN)

**Impact**: During database outage, system won't attempt connection for full 60s

**Workaround**:

- Manually restart service to reset circuit breaker
- Reduce timeout in config if 60s too long (src/lib/resilience/circuit-breaker.ts)

**Future Fix**: Add manual circuit breaker reset endpoint for admins

---

### Limitation 5: Cache TTL

**Issue**: Query cache TTL is 5 minutes, not configurable per-query

**Impact**: Rapidly changing data may show stale results for up to 5 minutes

**Workaround**:

- Manually invalidate cache on mutations (already implemented for most)
- Reduce TTL globally (affects all queries)
- Disable cache for specific queries (code change)

**Future Fix**: Add per-query TTL configuration

---

### Limitation 6: Token Limit

**Issue**: Default max tokens is 2000, may truncate long responses

**Impact**: Users get incomplete AI responses

**Workaround**:

- Increase `OPENAI_MAX_TOKENS` env var (up to 4096 for GPT-3.5, 8192 for GPT-4)
- Use max_tokens parameter in execution form
- Split prompts into smaller chunks

**Future Fix**: Auto-detect when response truncated, suggest increasing limit

---

### Limitation 7: Prompt Injection False Positives

**Issue**: 40+ detection patterns may flag legitimate prompts

**Impact**: Users blocked from using certain phrases in prompts

**Workaround**:

- Review flagged prompt, determine if false positive
- Whitelist specific pattern for user (code change required)
- Adjust severity threshold (currently HIGH only)
- User can rephrase to avoid trigger

**Future Fix**: ML-based detection with lower false positive rate

---

### Limitation 8: Single Region Deployment

**Issue**: Deployed only on Vercel (US region likely)

**Impact**: Higher latency for users in Asia/Europe

**Workaround**:

- Use Vercel Edge Functions for lower latency (requires refactoring)
- Deploy additional regions on Vercel Pro plan
- Use CDN for static assets (already configured)

**Future Fix**: Multi-region deployment with geo-routing

---

### Limitation 9: No Real-Time Execution Status

**Issue**: Client must poll for execution status updates

**Impact**: Slight delay in showing completion, extra server load

**Workaround**:

- Auto-refresh executions list every 5s (configurable in preferences)
- Use WebSocket for real-time updates (future enhancement)

**Future Fix**: Implement WebSocket-based real-time status (src/lib/services/execution-websocket.ts exists but not integrated)

---

### Limitation 10: Fixed Plan Limits

**Issue**: Budget limits are hardcoded (FREE: $10, PRO: $100, ENTERPRISE: $1000)

**Impact**: Users cannot customize budget within plan

**Workaround**:

- Manually adjust user's plan in database (admin action)
- Create custom plan for high-volume users
- Enterprise users can request custom limits

**Future Fix**: Add custom budget limits per user, not just per plan

---

## Monitoring & Health Checks

### Health Check Endpoints

#### `/api/health` - Basic Health Check

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Use Case**: Quick uptime check, load balancer health probe

---

#### `/api/health/system` - Full System Health

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "latency": 15
    },
    "circuitBreaker": {
      "state": "CLOSED",
      "failureCount": 2,
      "successCount": 150,
      "lastFailureTime": null
    },
    "cache": {
      "status": "healthy",
      "size": 45,
      "hitRate": 0.72
    }
  }
}
```

**Use Case**: Detailed system diagnostics, monitoring dashboard

**Alert Triggers**:

- `circuitBreaker.state === "OPEN"` → Database issues
- `services.cache.hitRate < 0.4` → Cache not effective
- `services.database.latency > 100` → Database slow

---

#### `/api/health/database` - Database Health

```json
{
  "healthy": true,
  "latency": 12,
  "circuitBreaker": "CLOSED",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Use Case**: Isolate database connectivity issues

---

### Logging

**Log Levels** (`src/lib/monitoring/logger.ts`):

- **DEBUG**: Verbose debugging information (disabled in production)
- **INFO**: General informational messages (startup, config)
- **WARN**: Warning messages (non-critical issues, fallbacks)
- **ERROR**: Error messages (failures, exceptions)

**Log Storage**:

- Application logs: Vercel logs (90 day retention)
- Execution logs: `ExecutionLog` table (permanent, unless retention policy)
- Request logs: Middleware logs (optional, performance impact)

**Key Log Events**:

```typescript
// Execution started
logger.info('Execution started', { executionId, promptId, userId });

// Execution retry
logger.warn('Retrying execution', { executionId, retryCount, errorType });

// Execution completed
logger.info('Execution completed', { executionId, latencyMs, costUsd, tokens });

// Rate limit hit
logger.warn('Rate limit exceeded', { userId, endpoint, limit });

// Circuit breaker opened
logger.error('Circuit breaker opened', { failureCount, consecutiveFailures });

// Authentication failure
logger.warn('Authentication failed', { email, reason });
```

---

### Metrics & Analytics

**Cost Metrics** (`src/lib/monitoring/cost-tracker.ts`):

- Total cost per user
- Cost per model (GPT-3.5 vs GPT-4)
- Daily/monthly cost trends
- Budget utilization percentage

**Performance Metrics**:

- Execution latency (avg, p50, p95, p99)
- API response times
- Database query times
- Cache hit rate

**Usage Metrics**:

- Executions per user
- Executions per prompt
- Active users (daily/monthly)
- Model distribution

**Error Metrics**:

- Error rate by type (RATE_LIMIT, API_ERROR, TIMEOUT, etc.)
- Failed execution percentage
- Retry success rate
- Circuit breaker state changes

---

### Monitoring Best Practices

1. **Set Up Alerts**
   - Circuit breaker OPEN → Page on-call engineer
   - Error rate > 5% → Alert engineering team
   - Budget exceeded → Notify user + support
   - Database latency > 100ms → Investigate performance

2. **Regular Health Checks**
   - Every 1 minute: Hit `/api/health` (uptime)
   - Every 5 minutes: Hit `/api/health/system` (detailed)
   - Every hour: Query database metrics, cache stats

3. **Log Monitoring**
   - Set up log aggregation (Datadog, LogRocket, etc.)
   - Create dashboards for key metrics
   - Alert on ERROR level logs
   - Track rate limit violations

4. **Cost Monitoring**
   - Daily budget utilization reports
   - Alert when user approaches limit (80%, 90%, 100%)
   - Track cost per user, identify high-cost users
   - Monitor OpenAI spending separately

5. **Performance Monitoring**
   - Track p95/p99 latency for critical endpoints
   - Monitor cache hit rate (target >60%)
   - Alert on slow database queries (>500ms)
   - Track Vercel cold start frequency

---

## Escalation Policy

### When to Escalate

| Issue Type                  | Escalate To                   | When                                                       | Priority |
| --------------------------- | ----------------------------- | ---------------------------------------------------------- | -------- |
| **Infrastructure Outage**   | DevOps / Platform Team        | Vercel down, Supabase down, Upstash down                   | P0       |
| **Database Performance**    | Database Admin / Backend Team | Slow queries, connection issues, circuit breaker OPEN      | P1       |
| **OpenAI API Issues**       | External Vendor Team          | OpenAI rate limits, API errors, quota exceeded             | P1-P2    |
| **Logic Defect / Bug**      | Engineering Team              | Incorrect calculations, validation errors, data corruption | P1-P2    |
| **Security Incident**       | Security Team + Management    | Suspected breach, injection successful, credentials leaked | P0       |
| **Rate Limit Abuse**        | Security Team                 | Suspicious traffic patterns, potential DDoS                | P1       |
| **Budget Override Request** | Product / Finance Team        | User requests custom limits, needs higher quota            | P3       |
| **User How-To Question**    | Support Documentation         | User asking "how do I...", feature explanation             | P3       |
| **Feature Request**         | Product Team                  | User wants new functionality                               | P3       |
| **UI/UX Issue**             | Frontend Team                 | Display bugs, layout issues, accessibility problems        | P2-P3    |

---

### Escalation Contacts

| Team                     | Scope                                  | Contact Method                   |
| ------------------------ | -------------------------------------- | -------------------------------- |
| **On-Call Engineer**     | All P0/P1 incidents                    | PagerDuty, Phone                 |
| **Backend Engineering**  | API routes, services, database queries | Slack #backend-support           |
| **Frontend Engineering** | React components, forms, UI bugs       | Slack #frontend-support          |
| **DevOps / Platform**    | Infrastructure, deployments, scaling   | Slack #devops-oncall             |
| **Security Team**        | Security incidents, vulnerabilities    | security@company.com (encrypted) |
| **Product Team**         | Feature requests, roadmap questions    | Slack #product-feedback          |
| **Database Admin**       | Database performance, migrations       | Slack #database-support          |

---

### Escalation Process

1. **Gather Information**
   - Collect all diagnostic data (logs, user ID, execution ID, error messages)
   - Document what you've tried so far
   - Assess impact (how many users, business impact)

2. **Create Ticket**
   - Use issue tracking system (Jira, Linear, GitHub Issues)
   - Include: title, description, severity, affected users, reproduction steps
   - Attach: logs, screenshots, database queries, API responses

3. **Notify Team**
   - Ping appropriate Slack channel
   - For P0/P1: Page on-call engineer immediately
   - For P2/P3: Create ticket, post in Slack during business hours

4. **Provide Context**
   - What is the user trying to do?
   - What have you tried?
   - What is the suspected root cause?
   - What is the workaround (if any)?

5. **Follow Up**
   - Stay engaged until resolved
   - Update user with progress
   - Document resolution in ticket
   - Update support playbook if new issue

---

## Support Runbooks

### Runbook 1: Reset User Monthly Budget

**When to Use**: User requests budget reset, or admin wants to give additional quota

**Steps**:

1. Verify user identity and plan

   ```sql
   SELECT id, email, plan FROM "User" WHERE email = 'user@example.com';
   ```

2. Check current month spending

   ```sql
   SELECT SUM("costUsd") as total_cost
   FROM "Execution"
   WHERE "userId" = 'xxx'
     AND "createdAt" >= date_trunc('month', CURRENT_DATE)
     AND status = 'COMPLETED';
   ```

3. **Option A**: Wait for automatic reset (1st of next month)

4. **Option B**: Manually adjust executions (NOT RECOMMENDED - affects analytics)

   ```sql
   -- Mark as cost-free (admin override)
   UPDATE "Execution"
   SET "costUsd" = 0
   WHERE "userId" = 'xxx'
     AND id IN ('exec-id-1', 'exec-id-2');
   ```

5. **Option C**: Upgrade user's plan temporarily

   ```sql
   UPDATE "User"
   SET plan = 'PRO'
   WHERE id = 'xxx';
   ```

6. Notify user of change and document in support ticket

---

### Runbook 2: Investigate Slow Database Queries

**When to Use**: Users report slow page loads, circuit breaker opening, high latency

**Steps**:

1. Check circuit breaker state

   ```bash
   curl http://localhost:3000/api/health/system | jq '.services.circuitBreaker'
   ```

2. Check database health

   ```bash
   curl http://localhost:3000/api/health/database
   ```

3. Enable Prisma query logging (temporarily)

   ```typescript
   // src/lib/database/client.ts
   const prisma = new PrismaClient({
     log: ['query', 'error', 'warn'],
   });
   ```

4. Identify slow queries in PostgreSQL

   ```sql
   -- Enable pg_stat_statements extension (if not already)
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

   -- Find slow queries
   SELECT
     query,
     mean_exec_time,
     calls,
     total_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 100  -- > 100ms
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

5. Analyze query execution plan

   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM "Execution" WHERE "userId" = 'xxx' ORDER BY "createdAt" DESC LIMIT 20;
   ```

6. Check for missing indexes

   ```sql
   -- Look for seq scans (should be index scans)
   -- In EXPLAIN output, look for "Seq Scan" vs "Index Scan"
   ```

7. Add index if needed

   ```sql
   CREATE INDEX CONCURRENTLY idx_execution_userid_createdat
   ON "Execution" ("userId", "createdAt" DESC);
   ```

8. Verify improvement
   - Re-run EXPLAIN ANALYZE
   - Check /api/health/database latency
   - Monitor circuit breaker state

---

### Runbook 3: Clear Rate Limit for User

**When to Use**: Legitimate user hit rate limit, needs immediate access

**Steps**:

1. Verify user and reason

   ```sql
   SELECT id, email, plan, "createdAt" FROM "User" WHERE email = 'user@example.com';
   ```

2. Identify rate limit key in Redis

   ```typescript
   // Rate limit keys format:
   // ratelimit:<identifier>:<endpoint>
   // e.g., ratelimit:user-123:/api/prompts/execute
   ```

3. Clear rate limit in Upstash Redis

   ```bash
   # Via Upstash REST API
   curl -X POST "$UPSTASH_REDIS_REST_URL/del/ratelimit:$USER_ID:$ENDPOINT" \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
   ```

4. Verify rate limit cleared

   ```bash
   curl -I http://localhost:3000/api/prompts \
     -H "Cookie: sb-access-token=$JWT_TOKEN"
   # Check X-RateLimit-Remaining (should be full)
   ```

5. Inform user they can retry immediately

6. Document in support ticket:
   - Why rate limit was cleared
   - User's use case
   - Whether to adjust limits permanently

---

### Runbook 4: Manually Retry Failed Execution

**When to Use**: Execution failed due to transient error, user wants to retry

**Steps**:

1. Get execution details

   ```sql
   SELECT id, status, "errorType", "errorMessage", "retryCount", "promptId", inputs
   FROM "Execution"
   WHERE id = 'xxx';
   ```

2. Verify error is retryable
   - RATE_LIMIT → Yes (after cooldown)
   - API_ERROR → Yes (if OpenAI recovered)
   - TIMEOUT → Yes
   - VALIDATION_ERROR → No (fix input first)

3. **Option A**: User self-service retry (preferred)
   - User clicks "Retry" button in UI
   - Calls `/api/executions/{id}/retry` endpoint

4. **Option B**: Admin manual retry via API

   ```bash
   curl -X POST "http://localhost:3000/api/executions/$EXECUTION_ID/retry" \
     -H "Cookie: sb-access-token=$JWT_TOKEN" \
     -H "X-CSRF-Token: $CSRF_TOKEN"
   ```

5. **Option C**: Create new execution with same inputs

   ```bash
   curl -X POST "http://localhost:3000/api/prompts/$PROMPT_ID/execute" \
     -H "Cookie: sb-access-token=$JWT_TOKEN" \
     -H "X-CSRF-Token: $CSRF_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "inputs": { /* same as failed execution */ },
       "model": "gpt-3.5-turbo"
     }'
   ```

6. Monitor new execution status

   ```sql
   SELECT id, status, "createdAt", "completedAt"
   FROM "Execution"
   WHERE id = 'new-exec-id';
   ```

7. Notify user of result

---

### Runbook 5: Investigate "Authentication Failed" Issue

**When to Use**: User cannot log in, getting 401 errors

**Steps**:

1. Check Supabase status
   - Visit: https://status.supabase.com
   - Check project status in Supabase dashboard

2. Verify user exists

   ```sql
   -- In application database
   SELECT id, email, "createdAt" FROM "User" WHERE email = 'user@example.com';

   -- In Supabase dashboard → Authentication → Users
   -- Look for email address
   ```

3. Test user credentials

   ```bash
   curl -X POST "http://localhost:3000/api/auth/login" \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: $CSRF_TOKEN" \
     -d '{
       "email": "user@example.com",
       "password": "user-provided-password"
     }'
   ```

4. Check error response
   - **"Invalid credentials"** → Wrong email/password
   - **"Too many requests"** → Rate limited (50 attempts/15min)
   - **"Invalid CSRF token"** → CSRF issue
   - **Network error** → Supabase connectivity

5. If user exists but can't log in:
   - Check if account is disabled in Supabase
   - Check if email is confirmed
   - Try password reset flow

6. If user doesn't exist:
   - User needs to register first
   - Or registration failed (check for partial records)

7. If CSRF issue:
   - Clear browser cookies
   - Refresh page to get new CSRF token
   - Try in incognito mode

8. If still failing:
   - Check Supabase project settings
   - Verify environment variables (NEXT_PUBLIC_SUPABASE_URL, keys)
   - Check CORS configuration

---

### Runbook 6: Handle Budget Exceeded Request

**When to Use**: User hit monthly budget limit, requests additional quota

**Steps**:

1. Verify user and current spending

   ```sql
   SELECT
     u.id,
     u.email,
     u.plan,
     SUM(e."costUsd") as current_month_cost,
     COUNT(e.id) as execution_count
   FROM "User" u
   LEFT JOIN "Execution" e ON u.id = e."userId"
   WHERE u.email = 'user@example.com'
     AND e."createdAt" >= date_trunc('month', CURRENT_DATE)
     AND e.status = 'COMPLETED'
   GROUP BY u.id;
   ```

2. Show user their current usage
   - Total cost this month
   - Executions by model
   - Average cost per execution

3. Present options:
   - **Wait for reset**: Budget resets on 1st of next month
   - **Upgrade plan**:
     - FREE → PRO: $10/mo → $100/mo
     - PRO → ENTERPRISE: $100/mo → $1000/mo
   - **Optimize usage**: Use GPT-3.5 instead of GPT-4 (10-15x cheaper)

4. If user wants to upgrade:
   - Guide through upgrade flow (if self-service available)
   - Or manually update plan:
     ```sql
     UPDATE "User"
     SET plan = 'PRO'
     WHERE id = 'xxx';
     ```

5. If enterprise customer needs custom limit:
   - Escalate to Product/Finance team
   - May require code change to support custom budgets

6. Document decision in support ticket

---

## Conclusion

This support playbook provides comprehensive troubleshooting guidance for the FormaOps platform. It is a living document that should be updated as new issues are discovered and resolved.

**Key Principles**:

- ✅ **Diagnose before fixing**: Understand root cause before taking action
- ✅ **Document everything**: Update this playbook with new learnings
- ✅ **User empathy**: Communicate clearly, provide ETAs, offer workarounds
- ✅ **Escalate when needed**: Don't hesitate to involve engineering for complex issues
- ✅ **Learn and improve**: Every incident is an opportunity to strengthen the system

**Support Contact**:

- Email: support@forma-ops.com (if applicable)
- Slack: #support-team
- On-call: PagerDuty

**Related Documentation**:

- [README.md](./README.md) - Project overview
- [SECURITY_IMPLEMENTATION_COMPLETE.md](./SECURITY_IMPLEMENTATION_COMPLETE.md) - Security audit
- [docs/planning/](./docs/planning/) - Planning documents

---

_Last Updated: 2025-01-15_
_Version: 1.0_
_Maintainer: Technical Support Team_
