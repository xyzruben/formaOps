# Dependency Classification Guide

## Overview

This guide provides a clear decision-making framework for classifying npm dependencies in FormaOps to prevent Vercel build failures like the 23-day deployment issue caused by the `autoprefixer` misclassification.

**Purpose**: Ensure all dependencies are correctly classified to prevent "works locally, fails in production" scenarios in serverless environments.

**Last Updated**: January 2025  
**Maintainer**: Development Team

---

## 1. Quick Decision Framework

### Simple Decision Tree

```
Does this package need to be available when the app RUNS in production?
├── YES → dependencies
└── NO → Does it generate code/assets that end up in the production bundle?
    ├── YES → dependencies (serverless build requirement)
    └── NO → devDependencies
```

### Core Rule

**When in doubt**: Test with `npm ci --only=production && npm run build`

If the build fails, the package belongs in `dependencies`.

### Serverless Environment Reality

- **Vercel installs only `dependencies` by default**
- Build-time tools that create runtime assets must be available during production builds
- CSS processors, asset optimizers, and code generators often need to be in `dependencies`

---

## 2. FormaOps Classification by Category

### Production Runtime → `dependencies` ✅

**Framework Core**

```json
"next": "^15.0.0",           // Next.js framework
"react": "18.3.1",           // React library
"react-dom": "18.3.1"        // React DOM renderer
```

**Database & Authentication**

```json
"@prisma/client": "^5.7.0",          // Database client (runtime)
"@supabase/ssr": "^0.6.1",           // Supabase SSR
"@supabase/supabase-js": "^2.54.0"   // Supabase client
```

**AI & Core Business Logic**

```json
"openai": "^4.24.0",         // OpenAI API client
"zod": "^3.22.0"             // Runtime validation
```

**UI Libraries**

```json
"@radix-ui/react-dialog": "^1.0.5",     // UI components
"@radix-ui/react-dropdown-menu": "^2.0.6",
"@radix-ui/react-select": "^2.2.6",
"@radix-ui/react-slot": "^1.0.2",
"@radix-ui/react-toast": "^1.1.5",
"lucide-react": "^0.294.0"              // Icons
```

**Runtime Utilities**

```json
"class-variance-authority": "^0.7.0",   // CSS-in-JS utility
"clsx": "^2.0.0",                       // Conditional classes
"tailwind-merge": "^2.2.0",             // Tailwind class merging
"tailwindcss-animate": "^1.0.7",        // Animation utilities
"date-fns": "^3.0.0",                   // Date manipulation
"react-hook-form": "^7.48.2",           // Form handling
"@hookform/resolvers": "^3.3.2"         // Form validation
```

### Build-Time Asset Generation → `dependencies` ⚠️

**CSS Processing** (Critical for FormaOps)

```json
"autoprefixer": "^10.4.16"   // ✅ FIXED: Was causing build failures in devDependencies
```

**Why autoprefixer belongs in dependencies**:

- PostCSS processes CSS during production builds
- Vercel needs autoprefixer available during build process
- Generates vendor prefixes that are part of the final CSS bundle

### Development Tools Only → `devDependencies` ✅

**Testing Framework**

```json
"jest": "^29.7.0",                      // Test runner
"jest-environment-jsdom": "^29.7.0",    // DOM testing environment
"@testing-library/jest-dom": "^6.7.0",  // DOM testing utilities
"@testing-library/react": "14.3.1",     // React testing utilities
"@playwright/test": "^1.40.0"           // E2E testing
```

**Code Quality & Formatting**

```json
"eslint": "^9.33.0",                     // Linting
"@eslint/js": "^9.33.0",                 // ESLint JavaScript rules
"eslint-config-next": "^15.0.0",         // Next.js ESLint config
"eslint-config-prettier": "^9.1.0",      // ESLint-Prettier integration
"eslint-plugin-react": "^7.37.5",        // React ESLint rules
"eslint-plugin-react-hooks": "^5.2.0",   // React Hooks ESLint rules
"prettier": "^3.1.1"                     // Code formatting
```

**TypeScript & Type Definitions**

```json
"typescript": "^5.3.0",          // TypeScript compiler
"@types/jest": "^30.0.0",        // Jest type definitions
"@types/node": "^20.10.0",       // Node.js type definitions
"@types/react": "18.3.12",       // React type definitions
"@types/react-dom": "18.3.2"     // React DOM type definitions
```

**Development Tools**

```json
"husky": "^9.1.7",               // Git hooks
"lint-staged": "^16.1.5",        // Staged file linting
"prisma": "^5.7.0"               // Database schema management (CLI)
```

**Build Tools** (Safe in devDependencies)

```json
"postcss": "^8.4.32",            // CSS processor (base)
"tailwindcss": "^3.4.0",         // CSS framework
"webpack-bundle-analyzer": "^4.9.1"  // Bundle analysis
```

---

## 3. Common Mistakes & Critical Lessons

### The `autoprefixer` Case Study

**Issue**: `autoprefixer` was initially in `devDependencies`
**Result**: 23 days of failed Vercel deployments
**Error**: `Cannot find module 'autoprefixer'`
**Root Cause**: Vercel build process requires PostCSS plugins to be available as `dependencies`

**Lesson**: CSS processing tools that run during production builds belong in `dependencies`

### Red Flags to Watch For

1. **CSS/Asset Processing Tools**
   - Any package that processes CSS, images, or assets
   - PostCSS plugins and Tailwind CSS extensions
   - Asset optimization libraries

2. **Code Generation Tools**
   - Packages that generate files used at runtime
   - Build-time code transformations
   - Runtime polyfill generators

3. **Framework Build Dependencies**
   - Tools required by Next.js build process
   - Babel plugins used in production builds
   - Webpack plugins for asset processing

### Edge Cases Requiring Careful Analysis

**`isomorphic-dompurify`** - Currently in `devDependencies`

- Used for sanitizing HTML in both client and server contexts
- ⚠️ **Risk**: May need to move to `dependencies` if used at runtime
- **Test**: Verify production build works without it

**`postcss`** - Currently in `devDependencies`

- Base PostCSS processor
- ✅ **Safe**: Next.js bundles its own PostCSS, but monitor for issues

**`tailwindcss`** - Currently in `devDependencies`

- CSS framework with build-time compilation
- ✅ **Safe**: Generates CSS at build time, but monitor for Vercel issues

---

## 4. Validation Process

### Before Adding New Dependencies

1. **Classify using the decision tree**
2. **Test the classification**:

   ```bash
   # Add the package
   npm install package-name --save  # or --save-dev

   # Test production build
   npm ci --only=production
   npm run build

   # If build fails, move to dependencies
   ```

3. **Document unusual classifications** in this guide

### Quick Validation Commands

**Test current classification**:

```bash
# Clean install production dependencies only
rm -rf node_modules package-lock.json
npm ci --only=production

# Test if build works
npm run build
```

**Full validation**:

```bash
# Test in Docker environment similar to Vercel
docker run --rm -v $(pwd):/app -w /app node:20 bash -c "npm ci --only=production && npm run build"
```

### Code Review Checklist

When reviewing dependency changes:

- [ ] Is the classification justified using our decision tree?
- [ ] Has the developer tested `npm ci --only=production && npm run build`?
- [ ] Are there any CSS/asset processing tools that might need special handling?
- [ ] Is this a tool that generates runtime code or assets?

---

## 5. Current FormaOps Package Analysis

### Correctly Classified Dependencies ✅

| Package          | Classification | Rationale                                                |
| ---------------- | -------------- | -------------------------------------------------------- |
| `next`           | dependencies   | Framework core, required at runtime                      |
| `react`          | dependencies   | UI library, required at runtime                          |
| `@prisma/client` | dependencies   | Database client, used at runtime                         |
| `openai`         | dependencies   | AI API client, core business logic                       |
| `@radix-ui/*`    | dependencies   | UI components rendered at runtime                        |
| `autoprefixer`   | dependencies   | **FIXED** - Required for CSS processing in Vercel builds |

### Correctly Classified DevDependencies ✅

| Package      | Classification  | Rationale                                     |
| ------------ | --------------- | --------------------------------------------- |
| `typescript` | devDependencies | Compiler, not needed at runtime               |
| `eslint`     | devDependencies | Code quality tool, development only           |
| `jest`       | devDependencies | Testing framework, development only           |
| `prisma`     | devDependencies | CLI tool for schema management                |
| `@types/*`   | devDependencies | Type definitions, TypeScript compilation only |

### Packages Requiring Monitoring ⚠️

| Package                | Current         | Risk Level | Notes                                    |
| ---------------------- | --------------- | ---------- | ---------------------------------------- |
| `postcss`              | devDependencies | Low        | Next.js bundles own PostCSS, but monitor |
| `tailwindcss`          | devDependencies | Medium     | CSS framework, watch for build issues    |
| `isomorphic-dompurify` | devDependencies | Medium     | May need runtime availability            |

---

## 6. Emergency Override Process

### When to Break the Rules

**Acceptable scenarios**:

- Legacy package compatibility issues
- Temporary workarounds for upstream bugs
- Vendor-specific deployment requirements

**Override documentation required**:

```markdown
## Dependency Override: [package-name]

**Classification**: dependencies (override)
**Normal Classification**: devDependencies
**Reason**: [Specific technical reason]
**Timeline**: [When will this be resolved]
**Risk Assessment**: [Impact on bundle size/performance]
**Review Date**: [When to reassess this decision]
```

### Emergency Deployment

If a misclassified dependency blocks critical deployment:

1. **Quick fix**: Move to `dependencies` temporarily
2. **Document the override** in this guide
3. **Create issue** to investigate proper classification
4. **Set timeline** for proper resolution

---

## 7. Maintenance & Updates

### Update Triggers

- ✅ After any dependency-related build failure
- ✅ When adding new package categories to the project
- ✅ Following major framework updates (Next.js, React)
- ✅ Quarterly dependency audit reviews

### Success Metrics

- **Zero dependency-related build failures** per month
- **Faster new dependency integration** (measured in review time)
- **Consistent code review feedback** on dependency classification

### Review Process

1. **Monthly audit**: Review all dependencies for correct classification
2. **Post-incident**: Update guide after any dependency-related failure
3. **Team education**: Include in new developer onboarding

---

## Quick Reference

### Decision Shortcuts

**Always `dependencies`**:

- Framework core packages (Next.js, React)
- Database clients
- API clients (OpenAI, Supabase)
- UI component libraries
- CSS processors (autoprefixer, PostCSS plugins)

**Always `devDependencies`**:

- Testing frameworks
- Linting and formatting tools
- TypeScript compiler and type definitions
- Development servers and CLIs

**When unsure**: Test with `npm ci --only=production && npm run build`

---

_This guide is living documentation that evolves with FormaOps. Update it immediately when discovering new classification patterns or resolving dependency-related build failures._
