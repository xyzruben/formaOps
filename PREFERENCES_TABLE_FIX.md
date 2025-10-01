# Preferences API Fix - Missing Database Table

## Executive Summary

**Problem:** `/api/preferences` endpoint returning 500 errors in production causing repeated console errors.

**Root Cause:** The `user_preferences` table doesn't exist in the database despite being defined in Prisma schema.

**Solution:** Created missing migration for `UserPreferences` model.

---

## Root Cause Analysis

### Investigation Process

1. **Error Observed:** Browser console showing repeated `GET /api/preferences 500` errors
2. **API Route Check:** `/api/preferences/route.ts` queries `prisma.userPreferences.findUnique()`
3. **Schema Verification:** `UserPreferences` model exists in `prisma/schema.prisma`
4. **Migration Check:** Only one migration exists: `20250913184143_init/migration.sql`
5. **Missing Table:** The init migration doesn't create `user_preferences` table

### Why This Happened

The `UserPreferences` model was added to the Prisma schema after the initial migration, but no migration was generated to create the table in the database.

### Call Chain

```
Root Layout (layout.tsx)
  ↓ renders
AuthProvider
  ↓ renders
PreferencesProvider (PreferencesContext.tsx)
  ↓ useEffect with user dependency
fetchPreferences() [line 210-218]
  ↓ calls
fetch('/api/preferences')
  ↓ server-side
GET handler (src/app/api/preferences/route.ts:58)
  ↓ calls
prisma.userPreferences.findUnique() [line 65]
  ↓ fails
Table 'user_preferences' doesn't exist
  ↓ returns
500 Internal Server Error
```

---

## Solution Implementation

### Migration Created

```bash
npx prisma migrate dev --name add_user_preferences
```

**Migration File:** `prisma/migrations/20251001162511_add_user_preferences/migration.sql`

**Created:**

- Table: `user_preferences` with 32 columns
- Unique constraint on `userId`
- Index on `userId`
- Foreign key: `userId` → `users(id)` with CASCADE delete

### Table Structure

```sql
CREATE TABLE "user_preferences" (
  id                         TEXT PRIMARY KEY,
  userId                     TEXT NOT NULL UNIQUE,

  -- AI Results Viewer (11 fields)
  defaultViewMode            TEXT DEFAULT 'output',
  outputFontSize             TEXT DEFAULT 'medium',
  customFontSize             INTEGER,
  enableSyntaxHighlight      BOOLEAN DEFAULT true,
  enableWordWrap             BOOLEAN DEFAULT true,
  showTokenMetrics           BOOLEAN DEFAULT true,
  showCostMetrics            BOOLEAN DEFAULT true,
  showLatencyMetrics         BOOLEAN DEFAULT true,
  enableAutoRefresh          BOOLEAN DEFAULT true,
  defaultExportFormat        TEXT DEFAULT 'txt',
  defaultCopyFormat          TEXT DEFAULT 'formatted',

  -- Dashboard (9 fields)
  defaultLandingPage         TEXT DEFAULT 'dashboard',
  executionsPerPage          INTEGER DEFAULT 20,
  executionsSortBy           TEXT DEFAULT 'createdAt',
  executionsSortOrder        TEXT DEFAULT 'desc',
  promptsViewMode            TEXT DEFAULT 'list',
  promptsPerPage             INTEGER DEFAULT 20,
  promptsSortBy              TEXT DEFAULT 'updatedAt',
  promptsSortOrder           TEXT DEFAULT 'desc',
  sidebarCollapsed           BOOLEAN DEFAULT false,

  -- Theme (4 fields)
  theme                      TEXT DEFAULT 'system',
  primaryColor               TEXT DEFAULT 'blue',
  layoutDensity              TEXT DEFAULT 'comfortable',
  enableAnimations           BOOLEAN DEFAULT true,

  -- Behavior (4 fields)
  enableDesktopNotifications BOOLEAN DEFAULT false,
  showDetailedErrors         BOOLEAN DEFAULT true,
  enableConfirmationDialogs  BOOLEAN DEFAULT true,
  enableAutoSave             BOOLEAN DEFAULT true,

  -- Privacy (4 fields)
  dataRetentionDays          INTEGER,
  enableUsageAnalytics       BOOLEAN DEFAULT false,
  defaultShareExpiration     INTEGER DEFAULT 168,
  includeMetadataInExports   BOOLEAN DEFAULT true,

  createdAt                  TIMESTAMP DEFAULT NOW(),
  updatedAt                  TIMESTAMP NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Verification

### Local Database

✅ Migration applied successfully to local development database

### Build Verification

```bash
npm run type-check  # ✅ Passed
npm run build       # ✅ Succeeded
```

---

## Production Deployment

### Pre-Deployment

The migration will be automatically applied during Vercel deployment via:

```bash
npx prisma migrate deploy
```

This runs as part of the build process defined in `package.json` build script.

### Post-Deployment Verification

After deployment, verify:

1. **No Console Errors:**
   - Open https://forma-ops.vercel.app
   - Open Chrome DevTools Console
   - Should see NO `/api/preferences 500` errors

2. **API Endpoint Works:**
   - Navigate to any authenticated page
   - Check Network tab
   - `/api/preferences` should return 200 with user preferences

3. **User Experience:**
   - Preferences load without errors
   - Default preferences created for new users
   - Existing preferences retrieved for returning users

---

## Files Changed

| File                                                                  | Action     | Purpose            |
| --------------------------------------------------------------------- | ---------- | ------------------ |
| `prisma/migrations/20251001162511_add_user_preferences/migration.sql` | **CREATE** | Database migration |

**Total Files Changed:** 1 (new migration)

---

## Rollback Plan

If issues arise after deployment:

1. **Revert Migration in Database:**

```sql
-- Connect to production database
DROP TABLE user_preferences CASCADE;
```

2. **Revert Git Commit:**

```bash
git revert HEAD
git push origin main
```

3. **Temporary Fix:** Disable preferences loading in `PreferencesContext.tsx`:

```typescript
const fetchPreferences = useCallback(async (): Promise<void> => {
  if (!user) {
    setPreferences(null);
    return;
  }

  // TEMPORARY: Skip API call, use defaults
  setPreferences({
    id: 'temp',
    userId: user.id,
    ...DEFAULT_PREFERENCES,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserPreferences);
  setIsDefault(true);
}, [user]);
```

---

## Related Issues

This fix resolves:

- ✅ Repeated 500 errors in browser console
- ✅ Missing user preferences functionality
- ✅ Database schema/migration mismatch

This is separate from the previous Prisma bundling fix (API_FIX.md), which resolved:

- ✅ "PrismaClient is not a constructor" errors
- ✅ Prisma bundled into client code

---

## Success Criteria

✅ Migration created and applied locally
✅ TypeScript check passes
✅ Build succeeds
⏳ Production deployment (pending)
⏳ No console errors in production (pending)
⏳ `/api/preferences` returns 200 (pending)

---

**Created:** 2025-10-01
**Status:** Ready for Production Deployment
**Related:** API_FIX.md (Prisma client bundling fix)
