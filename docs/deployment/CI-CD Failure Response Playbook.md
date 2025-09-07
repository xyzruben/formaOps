# CI/CD Failure Response Playbook

## Overview

This playbook provides systematic responses to CI/CD pipeline failures in FormaOps, based on lessons learned from 23 days of deployment failures. It prioritizes getting critical fixes deployed while maintaining code quality and system stability.

**Purpose**: Enable quick, confident decision-making during CI/CD failures with clear escalation paths and emergency procedures.

**Last Updated**: January 2025  
**Maintainer**: Development Team  
**Emergency Contact**: Lead Developer

---

## 1. Failure Classification & Response Matrix

### Immediate Triage Questions

**Priority Assessment**:

1. **Is this blocking a critical bug fix or security patch?** → Emergency Response
2. **Is this blocking regular development workflow?** → Standard Response
3. **Is this a nice-to-have feature or improvement?** → Scheduled Response

### Response Time Targets

| Severity          | Response Time | Resolution Target | Escalation                  |
| ----------------- | ------------- | ----------------- | --------------------------- |
| **P0 - Critical** | 15 minutes    | 2 hours           | Immediate team notification |
| **P1 - High**     | 1 hour        | 4 hours           | Team lead notification      |
| **P2 - Medium**   | 4 hours       | 1 day             | Standard workflow           |
| **P3 - Low**      | 1 day         | 1 week            | Next sprint planning        |

---

## 2. Common Failure Patterns & Responses

### Build Failures

#### TypeScript Compilation Errors

**Symptoms**: `tsc --noEmit` failures, type checking errors
**Common Causes**:

- Strict TypeScript rules in CI vs local development
- Missing type definitions for new dependencies
- API changes in external libraries

**Response Ladder**:

1. **First Try**: Fix the TypeScript errors properly

   ```bash
   npm run type-check
   # Fix reported errors
   ```

2. **If Blocking Critical Fix**: Emergency bypass

   ```javascript
   // next.config.js - TEMPORARY ONLY
   typescript: {
     ignoreBuildErrors: process.env.EMERGENCY_DEPLOY === 'true';
   }
   ```

   - Set `EMERGENCY_DEPLOY=true` in Vercel environment variables
   - **Create immediate issue** to fix underlying problems
   - **Set 48-hour deadline** to remove bypass

#### ESLint Violations

**Symptoms**: Linting failures, code style violations
**Common Causes**:

- Different ESLint rules between local and CI
- New code not following project conventions
- ESLint configuration changes

**Response Ladder**:

1. **First Try**: Fix the ESLint violations

   ```bash
   npm run lint
   # Fix reported issues or use npm run lint --fix
   ```

2. **If Blocking Critical Fix**: Emergency bypass

   ```javascript
   // next.config.js - TEMPORARY ONLY
   eslint: {
     ignoreDuringBuilds: process.env.EMERGENCY_DEPLOY === 'true';
   }
   ```

   - Document violations that are being bypassed
   - **Create immediate issues** for each violation
   - **Set 24-hour deadline** to remove bypass

#### Prettier Formatting Failures

**Symptoms**: Code style issues found, formatting violations
**Immediate Fix**:

```bash
npm run format
git add -A
git commit -m "fix: resolve Prettier formatting violations"
git push
```

**Prevention**: Ensure pre-commit hooks are working locally

#### Dependency Resolution Failures

**Symptoms**: `Cannot find module` errors, package not available
**Diagnostic Steps**:

1. Check dependency classification (see Dependency Classification Guide)
2. Verify package exists in correct section of package.json
3. Test production build locally

**Quick Fix Process**:

```bash
# Test if dependency is misclassified
npm ci --only=production
npm run build

# If build fails, move dependency:
# Move from devDependencies to dependencies in package.json
```

### Test Failures

#### Unit Test Failures

**Immediate Actions**:

1. Check if tests are failing due to legitimate issues
2. Review recent code changes that might affect tests
3. Determine if tests need updates or code needs fixes

**Emergency Response** (if blocking critical deployment):

```yaml
# Temporarily skip failing tests in CI
- name: Run unit tests
  run: npm run test -- --testNamePattern="^(?!.*FailingTestName)"
```

- **Document skipped tests** with issue numbers
- **Fix within 24 hours**

#### E2E Test Failures

**Common Causes**:

- Environment configuration issues
- Timing issues in test execution
- External service dependencies

**Response Process**:

1. **Retry the test** (may be flaky)
2. **Check environment variables** in CI
3. **Review external service status**

**Emergency Bypass** (critical deployments only):

```yaml
# Temporarily allow E2E failures
- name: Run E2E tests
  run: npm run test:e2e
  continue-on-error: true
```

#### Integration Test Failures

**Symptoms**: Database connection issues, API integration failures
**Diagnostic Checklist**:

- [ ] Database service running in CI?
- [ ] Environment variables properly configured?
- [ ] External API dependencies available?
- [ ] Test data properly seeded?

### Deployment Failures

#### Vercel Build Failures

**Most Common Issues**:

1. **Dependency misclassification** → See Dependency Classification Guide
2. **Environment variables missing** → Check Vercel dashboard
3. **Build process changes** → Review recent commits

**Diagnostic Process**:

```bash
# Reproduce Vercel environment locally
docker run --rm -v $(pwd):/app -w /app node:20 bash -c "npm ci --only=production && npm run build"
```

**Emergency Response Ladder**:

1. **Fix root cause** (preferred)
2. **Revert problematic commit** (if urgent)
3. **Emergency bypass** (critical fixes only)

#### Vercel Environment Variable Issues

**Symptoms**: Runtime errors, configuration not found
**Quick Resolution**:

1. Check Vercel dashboard environment variables
2. Verify variable names match exactly
3. Ensure variables are set for correct environment (preview vs production)

---

## 3. Emergency Response Procedures

### When to Use Emergency Procedures

**Acceptable scenarios**:

- Security vulnerability needs immediate patching
- Critical production bug affecting users
- Service outage requiring urgent fix

**NOT acceptable for**:

- New features
- Performance improvements
- Code refactoring
- Documentation updates

### Emergency Deployment Checklist

**Pre-Emergency Deployment**:

- [ ] Verify this is truly an emergency (security/critical bug)
- [ ] Document what bypasses will be used
- [ ] Set specific timeline for removing bypasses
- [ ] Notify team of emergency deployment

**Emergency Configuration**:

```bash
# Set in Vercel environment variables
EMERGENCY_DEPLOY=true
```

**Post-Emergency Actions** (within 24-48 hours):

- [ ] Remove emergency bypasses
- [ ] Fix underlying issues properly
- [ ] Update this playbook with lessons learned
- [ ] Review why emergency was necessary

### Rollback Procedures

#### Quick Rollback (Production Issues)

```bash
# Revert to last known good commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <last-good-commit>
git push --force-with-lease origin main
```

#### Vercel Rollback

1. Go to Vercel dashboard
2. Find previous successful deployment
3. Click "Promote to Production"
4. Verify rollback successful

---

## 4. Escalation Procedures

### Internal Escalation Path

**Level 1**: Developer attempting deployment

- Try standard fixes first
- Consult this playbook
- Attempt resolution for up to 1 hour

**Level 2**: Team Lead/Senior Developer

- Review failure with fresh perspective
- Determine if emergency procedures warranted
- Make bypass decisions if needed

**Level 3**: Emergency Response

- Critical production impact
- Security vulnerabilities
- Multiple system failures

### External Escalation

**Vercel Support**: For platform-specific issues
**GitHub Support**: For GitHub Actions platform issues  
**Dependency Maintainers**: For upstream library issues

---

## 5. Monitoring & Alerting

### Key Metrics to Monitor

**Pipeline Health**:

- Build success rate (target: >95%)
- Average build time (target: <10 minutes)
- Test failure rate (target: <5%)
- Deployment frequency (daily for active development)

**Quality Metrics**:

- Emergency bypasses active (target: 0)
- Time to resolution for P1 issues (target: <4 hours)
- Repeat failure rate (target: <10%)

### Alert Triggers

**Immediate Alerts**:

- Production deployment failure
- Security scan failures
- Multiple consecutive build failures

**Daily Summary**:

- Build success rates
- Test failure patterns
- Performance metrics

---

## 6. Common FormaOps-Specific Issues

### Environment-Specific Failures

#### Missing OpenAI API Key

**Symptoms**: Runtime errors in AI functionality
**Fix**: Verify `OPENAI_API_KEY` in Vercel environment variables

#### Supabase Configuration Issues

**Symptoms**: Authentication failures, database connection errors
**Fix**: Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Database Connection Failures

**Symptoms**: Prisma client errors, database queries failing
**Fix**: Verify `DATABASE_URL` configuration and database accessibility

### Framework-Specific Issues

#### Next.js Build Optimization Failures

**Symptoms**: Bundle size issues, optimization errors
**Current Config**:

- `output: 'standalone'` for Vercel deployment
- Bundle splitting configured for optimal loading

#### React Strict Mode Issues

**Symptoms**: Development vs production behavior differences
**Current Setting**: `reactStrictMode: true` - Do not disable

---

## 7. Post-Incident Process

### Immediate Actions (within 1 hour)

- [ ] Verify fix is working in production
- [ ] Remove any emergency bypasses used
- [ ] Document timeline of events
- [ ] Notify stakeholders of resolution

### Short-term Follow-up (within 24 hours)

- [ ] Analyze root cause of failure
- [ ] Update relevant documentation
- [ ] Create issues for any technical debt introduced
- [ ] Review if emergency procedures were appropriate

### Long-term Improvements (within 1 week)

- [ ] Update CI/CD pipeline to prevent recurrence
- [ ] Add monitoring/alerting for similar issues
- [ ] Update this playbook with lessons learned
- [ ] Conduct team retrospective if major incident

---

## 8. Quick Reference Commands

### Diagnostic Commands

```bash
# Test production build locally
npm ci --only=production && npm run build

# Check all quality gates
npm run type-check && npm run lint:check && npm run format:check && npm test

# Verify environment variables
node -e "console.log(process.env)" | grep -E "(DATABASE_URL|OPENAI_API_KEY|SUPABASE)"
```

### Emergency Commands

```bash
# Quick formatting fix
npm run format && git add -A && git commit -m "fix: formatting" && git push

# Dependency classification test
rm -rf node_modules package-lock.json && npm ci --only=production && npm run build

# Force push rollback (use carefully)
git reset --hard <good-commit> && git push --force-with-lease origin main
```

### Vercel Commands

```bash
# Deploy preview for testing
npx vercel --prod=false

# Check deployment status
npx vercel ls

# View deployment logs
npx vercel logs <deployment-url>
```

---

## 9. Prevention Strategies

### Pre-Commit Validation

- Ensure pre-commit hooks are working
- Run full test suite before pushing critical changes
- Test dependency changes with production build

### CI/CD Pipeline Improvements

- Fail fast on quality issues
- Parallel execution where possible
- Clear error messages and debugging info

### Regular Maintenance

- Monthly review of emergency bypasses
- Quarterly pipeline performance review
- Annual security and dependency audit

---

## Quick Decision Matrix

| Scenario            | Immediate Action | Emergency Bypass?  | Timeline      |
| ------------------- | ---------------- | ------------------ | ------------- |
| Formatting failure  | `npm run format` | No                 | 5 minutes     |
| TypeScript errors   | Fix errors       | Only if critical   | 30-60 minutes |
| ESLint violations   | `npm run lint`   | Only if critical   | 15-30 minutes |
| Test failures       | Fix tests        | Only if critical   | 1-2 hours     |
| Dependency issues   | Reclassify deps  | No                 | 15-30 minutes |
| Build failures      | Debug & fix      | Only if critical   | 1-2 hours     |
| Deployment failures | Check env vars   | Revert if critical | 30-60 minutes |

---

_This playbook is living documentation. Update immediately after any CI/CD incident to capture lessons learned and improve future response times._
