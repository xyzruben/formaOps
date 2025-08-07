# Infrastructure & Deployment Plan

## Environment Strategy

### Environment Hierarchy
```
Development → Staging → Production
    ↓           ↓           ↓
  Local     Preview     Live Demo
```

### Environment Configuration
```bash
# .env.local (Development)
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/formaops_dev"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
OPENAI_API_KEY="sk-test-..."

# .env.staging (Preview Deployments)  
NODE_ENV=staging
DATABASE_URL="postgresql://staging.supabase.co/..."
NEXT_PUBLIC_SUPABASE_URL="https://staging.supabase.co"
OPENAI_API_KEY="sk-staging-..."

# .env.production (Live Demo)
NODE_ENV=production
DATABASE_URL="postgresql://prod.supabase.co/..."
NEXT_PUBLIC_SUPABASE_URL="https://prod.supabase.co"
OPENAI_API_KEY="sk-prod-..."
```

## CI/CD Pipeline (GitHub Actions)

### Workflow Overview
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Unit tests
        run: npm run test
      
      - name: Build
        run: npm run build

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Quality Gates
```yaml
# Additional quality checks
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Audit dependencies
        run: npm audit --audit-level moderate
```

## Deployment Configuration

### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
}
```

### Database Migrations Strategy
```bash
# Migration workflow
npm run db:deploy    # Apply pending migrations
npm run db:seed      # Seed with demo data
npm run db:backup    # Create backup point
```

### Supabase Edge Functions Deployment
```bash
# Deploy edge functions
supabase functions deploy agent-executor
supabase functions deploy prompt-runner
supabase functions deploy validation-engine

# Set environment variables
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set DATABASE_URL=postgresql://...
```

## Monitoring & Error Tracking

### Sentry Configuration
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out non-critical errors in production
    if (event.level === 'warning') return null;
    return event;
  },
});
```

### Performance Monitoring
```typescript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react';

// Track key user actions
export const trackEvent = (name: string, properties?: object) => {
  if (process.env.NODE_ENV === 'production') {
    analytics.track(name, properties);
  }
};

// Performance metrics
export const trackPerformance = (metric: string, value: number) => {
  if (typeof window !== 'undefined') {
    window.gtag?.('event', 'timing_complete', {
      name: metric,
      value: Math.round(value)
    });
  }
};
```

### Health Check Implementation
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    // Database connectivity
    prisma.prompt.count(),
    
    // Supabase status
    fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/health'),
    
    // OpenAI API availability
    openai.models.list()
  ]);

  const isHealthy = checks.every(check => check.status === 'fulfilled');
  
  return Response.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status === 'fulfilled',
      supabase: checks[1].status === 'fulfilled',
      openai: checks[2].status === 'fulfilled'
    }
  }, { 
    status: isHealthy ? 200 : 503 
  });
}
```

## Security Configuration

### Environment Variable Security
```bash
# Vercel Environment Variables
OPENAI_API_KEY=sk-...           # Encrypted, server-only
DATABASE_URL=postgresql://...   # Encrypted, server-only
SENTRY_DSN=https://...          # Public, client-safe

# Supabase Secrets (Edge Functions)
supabase secrets set --env-file .env.production
```

### Content Security Policy
```typescript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

## Backup & Recovery

### Automated Backups
```sql
-- Supabase automatic daily backups (built-in)
-- Manual backup for critical deployments
SELECT pg_dump('postgresql://...') > backup_$(date +%Y%m%d).sql
```

### Disaster Recovery Plan
1. **Database Recovery**: Restore from latest Supabase backup (< 4 hours)
2. **Application Recovery**: Redeploy from Git main branch (< 10 minutes)
3. **Edge Function Recovery**: Redeploy functions with stored config (< 15 minutes)

### Rollback Procedures
```bash
# Quick rollback to previous deployment
vercel --prod --yes rollback

# Database rollback (if needed)
npx prisma migrate reset --force
npx prisma db push --schema previous_schema.prisma
```

## Performance Optimization

### Build Optimization
```javascript
// next.config.js
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@supabase/supabase-js', 'openai']
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200]
  }
};
```

### CDN & Caching Strategy
- Static assets: 1 year cache via Vercel Edge Network
- API responses: No cache (real-time data)
- Database queries: 5-minute Redis cache for read-heavy operations

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Performance budget
echo "Performance budget: < 300KB initial bundle"
```

This infrastructure plan ensures reliable, scalable deployment while maintaining simplicity appropriate for a portfolio project.