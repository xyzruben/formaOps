#!/bin/bash

# Pre-Merge Validation Script
# Comprehensive validation to prevent deployment failures
# Based on Deployment Engineering Implementation Phase 2

set -e  # Exit on any error

echo "🚀 Starting FormaOps pre-merge validation..."
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Type Checking
print_step "1. Running TypeScript type checking..."
if npm run type-check; then
    print_success "TypeScript compilation passed"
else
    print_error "TypeScript compilation failed"
    echo "Fix TypeScript errors before proceeding. Do not bypass with ignoreBuildErrors."
    exit 1
fi

# Step 2: Linting
print_step "2. Running ESLint validation..."
if npm run lint -- --max-warnings 0; then
    print_success "ESLint validation passed"
else
    print_warning "ESLint warnings detected. Checking if blocking..."
    # Allow non-blocking warnings but fail on errors
    if npm run lint -- --quiet; then
        print_warning "Non-blocking ESLint warnings present but continuing"
    else
        print_error "Blocking ESLint errors detected"
        echo "Fix ESLint errors before proceeding. Use 'npm run lint -- --fix' where appropriate."
        exit 1
    fi
fi

# Step 3: Code Formatting
print_step "3. Checking code formatting..."
if npm run format:check 2>/dev/null || npx prettier --check "src/**/*.{ts,tsx,js,jsx}" --ignore-path .gitignore; then
    print_success "Code formatting is correct"
else
    print_error "Code formatting violations detected"
    echo "Fix formatting with 'npm run format' or use the emergency script: 'npm run emergency-format'"
    exit 1
fi

# Step 4: Unit Tests
print_step "4. Running unit tests..."
if npm test -- --passWithNoTests; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    echo "Fix failing tests before proceeding."
    exit 1
fi

# Step 5: Production Build Validation
print_step "5. Validating production-only build..."
print_warning "This may take a moment as we test with production dependencies only..."

# Check if Docker is available for environment parity testing
if command -v docker >/dev/null 2>&1; then
    print_step "Using Docker for environment parity validation..."
    if docker run --rm -v "$(pwd)":/app -w /app node:20-alpine sh -c "npm ci --omit=dev && npm run build"; then
        print_success "Production build validation passed (Docker environment)"
    else
        print_error "Production build validation failed"
        echo "Dependencies may be misclassified. Check Dependency Classification Guide."
        exit 1
    fi
else
    print_warning "Docker not available, using local environment for production build test..."
    
    # Backup current node_modules
    if [ -d "node_modules" ]; then
        print_step "Backing up current node_modules..."
        mv node_modules node_modules.backup
    fi
    
    # Test production-only build
    if npm ci --omit=dev && npm run build; then
        print_success "Production build validation passed (local environment)"
    else
        print_error "Production build validation failed"
        echo "Dependencies may be misclassified. Check Dependency Classification Guide."
        
        # Restore node_modules
        if [ -d "node_modules.backup" ]; then
            rm -rf node_modules
            mv node_modules.backup node_modules
        fi
        exit 1
    fi
    
    # Restore full node_modules
    rm -rf node_modules
    if [ -d "node_modules.backup" ]; then
        mv node_modules.backup node_modules
    else
        print_step "Reinstalling full dependencies..."
        npm install
    fi
fi

# Step 6: Emergency Bypass Check
print_step "6. Checking for emergency bypasses..."
if grep -q "ignoreBuildErrors.*true\|ignoreDuringBuilds.*true" next.config.js 2>/dev/null; then
    print_error "Emergency bypasses detected in next.config.js"
    echo "Remove emergency bypasses before merging. These should only be used for P0 critical issues."
    exit 1
else
    print_success "No emergency bypasses detected"
fi

# Step 7: Dependency Classification Audit (if package.json changed)
if git diff --name-only HEAD~1 2>/dev/null | grep -q "package.json\|package-lock.json"; then
    print_step "7. Auditing dependency classifications (package.json changed)..."
    print_warning "Package dependencies were modified. Ensure proper classification:"
    print_warning "- Build tools generating runtime code/assets → dependencies"
    print_warning "- Development-only tools → devDependencies" 
    print_warning "- CSS/asset processors needed at build time → dependencies"
    print_warning "See Dependency Classification Guide for decision tree"
else
    print_success "No dependency changes detected"
fi

echo ""
echo "=========================================="
print_success "🎉 All pre-merge validations passed!"
echo ""
print_step "Your code is ready for merge. Key validations completed:"
echo "  • TypeScript compilation ✅"
echo "  • ESLint validation ✅"
echo "  • Code formatting ✅"
echo "  • Unit tests ✅"
echo "  • Production build validation ✅"
echo "  • No emergency bypasses ✅"
echo ""
print_step "Remember: This validation helps prevent deployment failures."
print_step "For deployment issues, reference the CI/CD Failure Response Playbook."