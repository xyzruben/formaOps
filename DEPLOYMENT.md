# FormaOps Deployment Guide

This guide covers deploying FormaOps to production environments with best practices for security, performance, and reliability.

## 🎯 Deployment Overview

FormaOps supports multiple deployment strategies:

- **Vercel** (Recommended for quick deployment)
- **Netlify** (Alternative serverless option)
- **Docker** (Container deployment for any platform)
- **Self-hosted** (Custom server deployment)

## 🚀 Quick Start Deployment

### Vercel (Recommended)

1. **Connect your repository**
   - Fork the FormaOps repository
   - Connect to Vercel via GitHub integration

2. **Configure environment variables**
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/database
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   CRON_SECRET=your-secure-cron-secret
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Netlify

1. **Build settings**
   ```toml
   [build]
   command = "npm run build"
   publish = ".next"
   
   [build.environment]
   NODE_ENV = "production"
   ```

2. **Deploy**
   ```bash
   netlify deploy --prod --dir=.next
   ```

## 🐳 Docker Deployment

### Production Docker Setup

1. **Build the image**
   ```bash
   docker build -t formaops:latest .
   ```

2. **Run with environment variables**
   ```bash
   docker run -d \
     --name formaops \
     -p 3000:3000 \
     -e DATABASE_URL="postgresql://..." \
     -e OPENAI_API_KEY="sk-..." \
     -e SUPABASE_URL="https://..." \
     -e SUPABASE_ANON_KEY="eyJ..." \
     formaops:latest
   ```

3. **Docker Compose (Recommended)**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://postgres:password@db:5432/formaops
       depends_on:
         - db
       restart: unless-stopped
   
     db:
       image: postgres:15
       environment:
         - POSTGRES_DB=formaops
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=password
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/ssl/certs
       depends_on:
         - app
       restart: unless-stopped
   
   volumes:
     postgres_data:
   ```

## 🔧 Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `CRON_SECRET` | Cron job authentication | `random-string` |
| `ENABLE_REQUEST_LOGGING` | Enable detailed logging | `false` |
| `RETRY_LIMIT` | API retry attempts | `3` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `3600000` |

### Environment Files

Create environment-specific files:

**.env.production**
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod-user:prod-pass@prod-host:5432/formaops
OPENAI_API_KEY=sk-prod-key
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
CRON_SECRET=secure-production-secret
ENABLE_REQUEST_LOGGING=true
```

**.env.staging**
```env
NODE_ENV=production
DATABASE_URL=postgresql://staging-user:staging-pass@staging-host:5432/formaops
OPENAI_API_KEY=sk-staging-key
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=staging-anon-key
CRON_SECRET=staging-secret
```

## 🗄️ Database Setup

### PostgreSQL Configuration

1. **Create database and user**
   ```sql
   CREATE DATABASE formaops;
   CREATE USER formaops_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE formaops TO formaops_user;
   ```

2. **Apply database schema**
   ```bash
   npx prisma db push
   ```

3. **Seed initial data (optional)**
   ```bash
   npx prisma db seed
   ```

### Database Migrations

For production deployments:

```bash
# Generate and apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset --force
```

### Database Performance

**Optimize PostgreSQL for production:**

```sql
-- Connection and memory settings
shared_preload_libraries = 'pg_stat_statements'
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

-- Connection settings
max_connections = 100
idle_in_transaction_session_timeout = 300000

-- Logging
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 1000
```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL certificates**
   ```bash
   # Using Let's Encrypt with Certbot
   certbot certonly --webroot -w /var/www/html -d formaops.com
   ```

2. **Nginx SSL configuration**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name formaops.com;
   
       ssl_certificate /etc/letsencrypt/live/formaops.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/formaops.com/privkey.pem;
   
       # Security headers (handled by Next.js middleware)
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Firewall Configuration

```bash
# UFW firewall rules
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3000/tcp  # Block direct access to Node.js
ufw enable
```

### Security Headers

Headers are configured in `middleware.ts`:

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};
```

## 📊 Monitoring & Logging

### Health Checks

FormaOps includes built-in health check endpoints:

- `/api/health` - Application health status
- `/healthz` - Simple readiness check

Configure your load balancer to use these endpoints:

```yaml
# Kubernetes health check example
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Application Monitoring

1. **Performance monitoring**
   ```bash
   # Built-in performance monitoring
   curl https://your-app.com/api/health
   ```

2. **Error tracking**
   - Configure error boundaries
   - Set up error reporting (Sentry, etc.)
   - Monitor application logs

3. **Uptime monitoring**
   - Configure external monitoring (Pingdom, etc.)
   - Set up alerting for downtime

### Log Management

Configure structured logging:

```javascript
// Log configuration
const logConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: 'json',
  timestamp: true,
  requestId: true,
};
```

## 🚀 CI/CD Pipeline

### GitHub Actions Deployment

The repository includes comprehensive CI/CD workflows:

1. **Automated testing** on pull requests
2. **Security scanning** with CodeQL
3. **Deployment** to staging/production
4. **Performance monitoring** post-deployment

### Manual Deployment Script

Use the included deployment script:

```bash
# Deploy to production
ENVIRONMENT=production ./scripts/deploy.sh

# Deploy to staging
ENVIRONMENT=staging ./scripts/deploy.sh
```

## ⚡ Performance Optimization

### Build Optimization

1. **Bundle analysis**
   ```bash
   npm run analyze
   ```

2. **Next.js optimizations** (configured in `next.config.js`):
   - Image optimization
   - Bundle splitting
   - Static generation
   - Caching headers

### Database Optimization

1. **Connection pooling**
   ```typescript
   // Prisma connection pooling
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20',
       },
     },
   });
   ```

2. **Query optimization**
   - Use database indexes
   - Implement query caching
   - Monitor slow queries

### CDN Configuration

Configure CDN for static assets:

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || '',
  images: {
    domains: ['your-cdn.com'],
  },
};
```

## 🔄 Backup & Recovery

### Database Backups

1. **Automated backups**
   ```bash
   # Daily backup script
   #!/bin/bash
   pg_dump $DATABASE_URL | gzip > backup-$(date +%Y-%m-%d).sql.gz
   ```

2. **Point-in-time recovery**
   ```bash
   # Restore from backup
   gunzip -c backup-2024-01-01.sql.gz | psql $DATABASE_URL
   ```

### Application Backups

1. **Environment configuration backup**
2. **Static assets backup**
3. **Application code versioning**

## 🏗️ Scaling Considerations

### Horizontal Scaling

1. **Load balancer configuration**
   ```nginx
   upstream formaops {
       server app1:3000;
       server app2:3000;
       server app3:3000;
   }
   
   server {
       location / {
           proxy_pass http://formaops;
       }
   }
   ```

2. **Session management**
   - Use stateless authentication (JWT)
   - Configure session store if needed

### Database Scaling

1. **Read replicas**
   ```typescript
   const readOnlyPrisma = new PrismaClient({
     datasources: {
       db: { url: process.env.DATABASE_READ_URL },
     },
   });
   ```

2. **Connection pooling**
   ```typescript
   // PgBouncer configuration
   const connectionString = `${DATABASE_URL}?pgbouncer=true&connection_limit=10`;
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection issues**
   ```bash
   # Test database connection
   npx prisma db push --preview-feature
   ```

2. **Build failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

3. **Memory issues**
   ```bash
   # Monitor memory usage
   docker stats formaops
   ```

### Debug Mode

Enable debug logging:

```env
DEBUG=true
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=debug
```

## 📋 Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Security scan completed
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates valid
- [ ] Monitoring configured

### Deployment

- [ ] Deploy to staging first
- [ ] Verify staging deployment
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify production deployment
- [ ] Monitor for issues

### Post-deployment

- [ ] Health checks passing
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] User acceptance testing
- [ ] Documentation updated

## 📞 Support

For deployment issues:

- **Documentation**: [docs.formaops.com](https://docs.formaops.com)
- **Issues**: [GitHub Issues](https://github.com/username/formaops/issues)
- **Emergency**: support@formaops.com

---

This deployment guide covers the essential aspects of deploying FormaOps to production. For specific deployment scenarios or custom requirements, please refer to the platform-specific documentation or contact our support team.