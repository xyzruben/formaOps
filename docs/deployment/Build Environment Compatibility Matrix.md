# Build Environment Compatibility Matrix

## Overview

This document systematically identifies and documents environmental differences between development, CI/CD, and production environments that can cause deployment failures for FormaOps.

**Purpose**: Prevent "works locally but fails in production" scenarios by maintaining awareness of environment-specific behaviors and requirements.

**Last Updated**: January 2025  
**Maintainer**: Development Team  
**Review Frequency**: Monthly and after major dependency changes

---

## 1. Environment Specifications Matrix

| Component                 | Local Development              | GitHub Actions CI         | Vercel Production                         | Compatibility Notes                   |
| ------------------------- | ------------------------------ | ------------------------- | ----------------------------------------- | ------------------------------------- |
| **Node.js Version**       | >=20.0.0 (varies by developer) | 20.x (fixed in workflow)  | 20.x (Vercel default)                     | ✅ Aligned via package.json engines   |
| **npm Version**           | >=9.0.0 (varies by developer)  | Latest available          | Latest available                          | ⚠️ Potential behavior differences     |
| **Installation Command**  | `npm install` or `npm ci`      | `npm ci` (enforced)       | `npm ci` (Vercel default)                 | ⚠️ Local devs may use `npm install`   |
| **TypeScript Mode**       | Incremental, IDE assistance    | Full compilation          | Build-time compilation                    | 🔴 Strict mode differences            |
| **ESLint Enforcement**    | IDE warnings, pre-commit       | Full project scan, errors | **BYPASSED** (`ignoreDuringBuilds: true`) | 🔴 Production bypasses linting        |
| **Prettier Formatting**   | IDE formatting, pre-commit     | CI validation required    | Not enforced                              | ⚠️ CI blocks on formatting violations |
| **Build Command**         | `next dev` (development)       | `npm run build`           | `npm run build`                           | ✅ Production builds consistent       |
| **Environment Variables** | `.env.local` file              | GitHub Secrets            | Vercel Environment Variables              | ⚠️ Different loading mechanisms       |

---

## 2. Dependency Resolution Analysis

### Critical Build Dependencies

| Dependency       | Classification    | Required In          | Failure Symptoms                    | Resolution                          |
| ---------------- | ----------------- | -------------------- | ----------------------------------- | ----------------------------------- |
| **autoprefixer** | `dependencies` ✅ | Vercel build process | `Cannot find module 'autoprefixer'` | ✅ **FIXED**: Moved to dependencies |
| **postcss**      | `devDependencies` | Build toolchain      | PostCSS processing failures         | ⚠️ Monitor for build failures       |
| **tailwindcss**  | `devDependencies` | CSS compilation      | Missing styles in production        | ⚠️ Monitor for styling issues       |
| **typescript**   | `devDependencies` | Type checking        | Compilation errors                  | ✅ Proper classification            |
| **eslint**       | `devDependencies` | Code quality         | Linting failures                    | ✅ Proper classification            |
| **prettier**     | `devDependencies` | Code formatting      | CI formatting failures              | ✅ Proper classification            |
| **prisma**       | `devDependencies` | Database schema      | Schema generation failures          | ✅ Prisma client in dependencies    |

### Runtime Dependencies

| Dependency                | Classification | Critical For      | Notes                   |
| ------------------------- | -------------- | ----------------- | ----------------------- |
| **next**                  | `dependencies` | Framework core    | ✅ Correctly classified |
| **react/react-dom**       | `dependencies` | UI rendering      | ✅ Correctly classified |
| **@prisma/client**        | `dependencies` | Database access   | ✅ Correctly classified |
| **@supabase/supabase-js** | `dependencies` | Authentication/DB | ✅ Correctly classified |
| **openai**                | `dependencies` | AI functionality  | ✅ Correctly classified |

---

## 3. Tool Behavior Differences

### TypeScript Compilation

| Environment   | Behavior                    | Configuration                 | Error Handling                            |
| ------------- | --------------------------- | ----------------------------- | ----------------------------------------- |
| **Local Dev** | Incremental, IDE assistance | `tsconfig.json` strict mode   | Warnings displayed, compilation continues |
| **GitHub CI** | Full project compilation    | `tsconfig.json` strict mode   | Errors block pipeline                     |
| **Vercel**    | Build-time compilation      | **`ignoreBuildErrors: true`** | 🔴 **BYPASSED** - Errors ignored          |

**Risk**: Production deploys with TypeScript errors that would fail in CI.

### ESLint Enforcement

| Environment   | Behavior                       | Rule Enforcement                | Failure Impact              |
| ------------- | ------------------------------ | ------------------------------- | --------------------------- |
| **Local Dev** | IDE warnings, pre-commit hooks | Configurable, warnings          | Developer experience impact |
| **GitHub CI** | Full project scan              | **DISABLED** for Dependabot PRs | Conditional enforcement     |
| **Vercel**    | **`ignoreDuringBuilds: true`** | 🔴 **COMPLETELY BYPASSED**      | No code quality enforcement |

**Risk**: Poor code quality can reach production without ESLint validation.

### Build Process Variations

| Environment   | Command         | Caching             | Optimization Level        |
| ------------- | --------------- | ------------------- | ------------------------- |
| **Local Dev** | `next dev`      | Hot reload cache    | Development optimizations |
| **GitHub CI** | `npm run build` | Node modules cached | Production optimizations  |
| **Vercel**    | `npm run build` | Build cache + CDN   | Maximum optimizations     |

---

## 4. Configuration Drift Detection

### Current Emergency Bypasses

🚨 **Critical**: The following bypasses are currently active in production:

```javascript
// next.config.js - Emergency bypasses
typescript: {
  ignoreBuildErrors: true,  // 🔴 BYPASSES TypeScript errors
},
eslint: {
  ignoreDuringBuilds: true, // 🔴 BYPASSES ESLint validation
}
```

**These bypasses were added to resolve deployment failures but reduce code quality assurance.**

### Validation Checkpoints

- [ ] **Monthly Review**: Assess if emergency bypasses can be removed
- [ ] **Pre-Major Release**: Full environment parity validation
- [ ] **New Team Member**: Verify local environment matches CI/production
- [ ] **Dependency Updates**: Re-validate build process after major updates

### Warning Signs of Drift

1. **"Works on my machine"** - Code fails in CI but works locally
2. **Silent Production Issues** - TypeScript/ESLint errors reaching production
3. **Inconsistent Formatting** - CI failures on Prettier checks
4. **Performance Differences** - Local vs production performance gaps

---

## 5. Environment-Specific Workarounds

### Emergency Deployment Procedures

**Scenario**: Critical bug fix needed despite build quality issues

**Step 1**: Assess bypass necessity

```bash
# Check if issues are blocking
npm run type-check  # TypeScript errors
npm run lint:check  # ESLint violations
npm run format:check # Prettier issues
```

**Step 2**: Implement temporary bypasses (if absolutely necessary)

```javascript
// next.config.js - Use sparingly
typescript: {
  ignoreBuildErrors: process.env.EMERGENCY_DEPLOY === 'true';
}
eslint: {
  ignoreDuringBuilds: process.env.EMERGENCY_DEPLOY === 'true';
}
```

**Step 3**: Plan immediate remediation

- Create issues for bypassed problems
- Set deadline for removing bypasses
- Document technical debt

### Rollback Procedures

**Trigger**: Production deployment causes critical failures

1. **Immediate**: Revert to last known good commit
2. **Short-term**: Fix issues in development environment
3. **Long-term**: Improve environment parity to prevent recurrence

---

## 6. Troubleshooting Decision Tree

```
Build/Deploy Failure
│
├── Fails Locally?
│   ├── YES → Fix code issue, standard debugging
│   └── NO → Continue to environment check
│
├── Works Locally, Fails in CI?
│   ├── Check Node/npm version differences
│   ├── Verify dependency classifications
│   ├── Check environment variable availability
│   └── Review tool configuration differences
│
├── Works in CI, Fails in Vercel?
│   ├── Check Vercel-specific configurations
│   ├── Verify environment variables in Vercel dashboard
│   ├── Check serverless function constraints
│   └── Review Vercel build logs for specific errors
│
└── Works Everywhere Except One Environment?
    ├── Check environment-specific bypasses
    ├── Verify secret/environment variable configuration
    └── Check for platform-specific optimizations
```

### Common Failure Patterns

#### 1. Module Resolution Issues

**Symptoms**: `Cannot find module` errors in production
**Common Causes**:

- Dependency in wrong classification (devDependencies vs dependencies)
- Path resolution differences
- Case sensitivity issues (local macOS vs Linux production)

#### 2. Environment Variable Issues

**Symptoms**: Runtime errors, missing configuration
**Common Causes**:

- Environment variables not set in Vercel dashboard
- Different variable names between environments
- Missing required variables for build process

#### 3. Build Tool Failures

**Symptoms**: CSS not generated, TypeScript compilation errors
**Common Causes**:

- PostCSS/Tailwind dependencies not available in production
- TypeScript strict mode differences
- Build optimization conflicts

---

## 7. Maintenance & Updates

### Document Update Triggers

- ✅ **After deployment failures**: Document root cause and resolution
- ✅ **Major dependency updates**: Re-validate all environment behaviors
- ✅ **New team members**: Gather feedback on environment setup issues
- ✅ **Monthly reviews**: Assess bypass removability and environment drift

### Success Metrics

- **Deployment Success Rate**: Target >95% first-time deployment success
- **Environment Parity Issues**: <2 per month "works locally, fails in CI/production"
- **Emergency Bypasses**: Target 0 active bypasses in production
- **New Developer Onboarding**: <4 hours to functional development environment

### Ownership & Responsibilities

- **Primary Maintainer**: Lead Developer
- **Review Process**: Peer review for all updates
- **Integration**: Update this document as part of deployment failure post-mortems
- **Training**: Include in new developer onboarding process

---

## 8. Action Items & Remediation Plan

### High Priority (Immediate)

- [ ] **Remove Emergency Bypasses**: Plan removal of `ignoreBuildErrors` and `ignoreDuringBuilds`
- [ ] **Environment Parity**: Standardize Node.js/npm versions across all environments
- [ ] **Monitoring**: Add alerts for environment drift detection

### Medium Priority (Next Sprint)

- [ ] **Documentation**: Create developer environment setup guide referencing this matrix
- [ ] **Automation**: Create scripts to validate environment parity
- [ ] **CI Enhancement**: Add environment compatibility checks to CI pipeline

### Low Priority (Next Quarter)

- [ ] **Tooling**: Investigate tools for automated environment parity validation
- [ ] **Training**: Create training materials on deployment engineering best practices
- [ ] **Metrics**: Implement tracking for deployment success rates and environment issues

---

_This document is living documentation that should evolve with the FormaOps project. Regular updates ensure continued deployment reliability and team productivity._
