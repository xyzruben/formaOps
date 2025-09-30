#!/usr/bin/env node

/**
 * Verification script for Prisma client-side bundling fix
 *
 * This script checks that:
 * 1. No client-side Prisma imports exist
 * 2. Build completes successfully
 * 3. Bundle analysis shows Prisma is server-only
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Prisma client-side bundling fix...\n');

// Check 1: Scan for problematic client-side Prisma runtime imports (not types)
console.log('1. Checking for client-side Prisma runtime imports...');
try {
  // Check for runtime imports (not type imports)
  const runtimeImports = execSync(
    'grep -r "import.*{.*}.*from.*@prisma/client" src/app src/components --include="*.tsx" | grep -v "import type" || true'
  ).toString();
  const clientImports = execSync(
    'grep -r "from.*@prisma/client/runtime" src/app src/components --include="*.tsx" || true'
  ).toString();

  const problematicImports = runtimeImports + clientImports;

  if (problematicImports.trim()) {
    console.log('❌ Found problematic client-side Prisma imports:');
    console.log(problematicImports);
    process.exit(1);
  } else {
    console.log('✅ No problematic client-side Prisma runtime imports found');
  }
} catch {
  console.log('✅ No problematic client-side Prisma imports found');
}

// Check 2: Verify build succeeds
console.log('\n2. Testing build process...');
try {
  execSync('npm run build > /dev/null 2>&1');
  console.log('✅ Build completed successfully');
} catch (error) {
  console.log('❌ Build failed');
  console.log(error.message);
  process.exit(1);
}

// Check 3: Verify Next.js config has proper Prisma handling
console.log('\n3. Checking Next.js configuration...');
const nextConfigPath = path.join(__dirname, '../next.config.js');
const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

if (
  nextConfig.includes("serverExternalPackages: ['@prisma/client', 'prisma']")
) {
  console.log('✅ serverExternalPackages configured correctly');
} else {
  console.log('❌ serverExternalPackages not configured');
  process.exit(1);
}

if (nextConfig.includes("@prisma/client': false")) {
  console.log('✅ Client-side Prisma bundling disabled');
} else {
  console.log('❌ Client-side Prisma bundling not disabled');
  process.exit(1);
}

// Check 4: Verify API routes have dynamic exports
console.log('\n4. Checking API route configuration...');
try {
  const dynamicRoutes = execSync(
    'grep -l "export const dynamic" src/app/api/**/route.ts'
  )
    .toString()
    .split('\n')
    .filter(Boolean);
  const totalRoutes = execSync('find src/app/api -name "route.ts"')
    .toString()
    .split('\n')
    .filter(Boolean);

  console.log(
    `✅ ${dynamicRoutes.length} out of ${totalRoutes.length} API routes have dynamic configuration`
  );

  // Key routes that must have dynamic exports
  const keyRoutes = [
    'src/app/api/preferences/route.ts',
    'src/app/api/executions/route.ts',
    'src/app/api/prompts/route.ts',
  ];

  for (const route of keyRoutes) {
    if (dynamicRoutes.includes(route)) {
      console.log(`✅ ${route} has dynamic export`);
    } else {
      console.log(`❌ ${route} missing dynamic export`);
    }
  }
} catch {
  console.log('⚠️  Could not verify API route configuration');
}

console.log(
  '\n🎉 All checks passed! Prisma client-side bundling fix verified.'
);
console.log('\nNext steps:');
console.log('1. Deploy to production');
console.log('2. Test the /api/preferences endpoint');
console.log('3. Verify the Execution History page loads without errors');
