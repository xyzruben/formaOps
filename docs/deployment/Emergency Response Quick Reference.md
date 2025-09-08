# Emergency Response Quick Reference

## 🚨 Build Failure Response

### Immediate Actions (< 5 minutes)

#### 1. Check CI/CD Failure Response Playbook

- Reference: [CI/CD Failure Response Playbook](./CI-CD%20Failure%20Response%20Playbook.md)
- Use decision matrix for immediate action priority
- Emergency bypass ONLY for P0 security/critical bugs

#### 2. Common 5-Minute Fixes

**Formatting Issues:**

```bash
npm run emergency-format
# Or manually:
npm run format && git add -A && git commit -m "fix: formatting" && git push
```

**Dependency Classification Issues:**

```bash
npm run validate-production
# If fails, check Dependency Classification Guide
# Move dependencies between dependencies/devDependencies as needed
```

**TypeScript Errors:**

```bash
npm run type-check
# Fix errors individually - DO NOT bypass with ignoreBuildErrors
# If overwhelming, create hotfix branch and fix systematically
```

**Quick Health Check:**

```bash
npm run quick-health-check
# Runs: type-check + lint:check + format:check + test
```

### ⚡ Emergency Commands

| Command                       | Purpose                        | When to Use                      |
| ----------------------------- | ------------------------------ | -------------------------------- |
| `npm run emergency-format`    | Auto-fix and commit formatting | Prettier violations blocking CI  |
| `npm run validate-production` | Test production build          | Dependency classification issues |
| `npm run quick-health-check`  | Full validation suite          | Pre-commit verification          |
| `npm run pre-merge`           | Complete pre-merge validation  | Before opening PR                |

## 🔄 Decision Matrix

### Severity Levels

**P0 - Critical (Security/Data Loss)**

- ✅ Emergency bypass allowed temporarily
- ⏱️ Max bypass duration: 24 hours
- 📋 Required: Immediate incident report

**P1 - High (User-facing functionality broken)**

- ⚠️ Emergency bypass discouraged
- 🔧 Prefer rapid fix over bypass
- ⏱️ Target resolution: < 4 hours

**P2 - Medium (Non-critical features affected)**

- ❌ No emergency bypasses
- 🛠️ Standard fix process
- ⏱️ Target resolution: < 2 days

**P3 - Low (Cosmetic/performance)**

- ❌ No emergency bypasses
- 📅 Standard backlog process
- ⏱️ Target resolution: Next sprint

## 🛠️ Standard Workflows

### Build Failure Investigation

1. **Check Error Type**
   - TypeScript: `npm run type-check`
   - ESLint: `npm run lint:check`
   - Tests: `npm test`
   - Dependencies: `npm run validate-production`

2. **Apply Systematic Fix**
   - Fix root cause, don't bypass
   - Test fix locally with `npm run pre-merge`
   - Create focused commit with clear message

3. **Validate Resolution**
   - Run full validation suite
   - Test production build
   - Monitor deployment success

### Dependency Issues

1. **Classification Problem**
   - Reference [Dependency Classification Guide](./Dependency%20Classification%20Guide.md)
   - Test with: `npm run validate-production`
   - Document rationale for unusual classifications

2. **Production Build Failure**
   ```bash
   # Debug production dependencies
   npm run validate-production-local
   # This will show which dependencies are missing
   ```

## 📞 Escalation

### When to Escalate

- P0 issues requiring emergency bypass
- Repeated failures from same root cause
- Infrastructure/external service issues
- Unknown/complex failures requiring investigation

### Emergency Contact

- **Lead Developer**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **On-Call**: [Rotation Schedule]

### Escalation Template

```
URGENT: Deployment Failure - [Brief Description]

Severity: P0/P1/P2/P3
Impact: [User impact description]
Duration: [How long failing]
Attempted Fixes: [What was tried]
Current Status: [Building/Broken/Investigating]

Error Details:
[Paste relevant error messages]
```

## 📋 Prevention

### Daily Practices

- Use `npm run pre-merge` before creating PRs
- Test production build for dependency changes
- Monitor build status dashboard
- Keep dependencies up to date

### Weekly Reviews

- Review failed build metrics
- Update emergency procedures if needed
- Team retrospective on deployment issues
- Documentation updates

## 🚫 What NOT to Do

**Never:**

- Add emergency bypasses for non-P0 issues
- Commit without testing locally first
- Ignore TypeScript errors "temporarily"
- Skip the pre-merge validation script
- Bypass security/formatting checks
- Push directly to main without review

**Remember:**

- Emergency bypasses are technical debt
- Quick fixes often create bigger problems
- 5 minutes of validation saves hours of debugging
- When in doubt, ask for help rather than bypass
