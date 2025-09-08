#!/bin/bash

# Environment Drift Detection Script
# Monitors for configuration drift that could cause deployment failures
# Based on Deployment Engineering Implementation Phase 3

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔍 $1${NC}"
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

print_info() {
    echo -e "${NC}ℹ️  $1${NC}"
}

# Initialize tracking variables
ISSUES_FOUND=0
WARNINGS_FOUND=0

echo "🔍 FormaOps Environment Drift Detection"
echo "========================================"
echo "Checking for configuration drift that could cause deployment failures..."
echo ""

# 1. Check for Emergency Bypasses
print_step "Checking for emergency bypasses in next.config.js..."
if [ -f "next.config.js" ]; then
    if grep -q "ignoreBuildErrors.*true\|typescript:.*ignoreBuildErrors.*true" next.config.js; then
        print_error "Emergency bypass detected: ignoreBuildErrors = true"
        print_info "This bypass should only be active for P0 critical issues"
        ((ISSUES_FOUND++))
    else
        print_success "No TypeScript build error bypasses detected"
    fi

    if grep -q "ignoreDuringBuilds.*true\|eslint:.*ignoreDuringBuilds.*true" next.config.js; then
        print_error "Emergency bypass detected: ignoreDuringBuilds = true" 
        print_info "This bypass should only be active for P0 critical issues"
        ((ISSUES_FOUND++))
    else
        print_success "No ESLint build bypasses detected"
    fi
else
    print_error "next.config.js not found - this is required for Next.js projects"
    ((ISSUES_FOUND++))
fi

echo ""

# 2. Validate Node.js Version Consistency  
print_step "Checking Node.js version consistency..."
CURRENT_NODE_VERSION=$(node --version)
print_info "Current Node.js version: $CURRENT_NODE_VERSION"

# Check package.json engines field
if [ -f "package.json" ]; then
    if grep -q '"engines"' package.json; then
        ENGINES_NODE=$(grep -A 5 '"engines"' package.json | grep '"node"' | sed 's/.*"node": "\([^"]*\)".*/\1/' || echo "not specified")
        if [ "$ENGINES_NODE" != "not specified" ]; then
            print_info "package.json engines.node: $ENGINES_NODE"
            print_success "Node.js version constraints defined in package.json"
        else
            print_warning "Node.js version not specified in engines field"
            ((WARNINGS_FOUND++))
        fi
    else
        print_warning "No engines field found in package.json"
        print_info "Consider adding engines field to prevent version drift"
        ((WARNINGS_FOUND++))
    fi
else
    print_error "package.json not found"
    ((ISSUES_FOUND++))
fi

# Check for .nvmrc file
if [ -f ".nvmrc" ]; then
    NVMRC_VERSION=$(cat .nvmrc)
    print_info ".nvmrc specifies: $NVMRC_VERSION"
    print_success "Node version controlled via .nvmrc"
else
    print_warning "No .nvmrc file found - consider adding for version consistency"
    ((WARNINGS_FOUND++))
fi

echo ""

# 3. Dependency Classification Validation
print_step "Validating dependency classifications..."
if [ -f "package.json" ] && [ -f "package-lock.json" ]; then
    print_info "Testing production-only build to validate dependency classifications..."
    
    # Backup current node_modules if it exists
    if [ -d "node_modules" ]; then
        print_info "Backing up current node_modules..."
        mv node_modules node_modules.backup.drift-check
    fi
    
    # Test production build
    if npm ci --omit=dev --silent && npm run build --silent; then
        print_success "Production build validation passed"
        print_info "All dependencies correctly classified"
    else
        print_error "Production build validation failed"
        print_info "Some dependencies may be misclassified (devDependencies needed at build time)"
        ((ISSUES_FOUND++))
    fi
    
    # Cleanup and restore
    rm -rf node_modules
    if [ -d "node_modules.backup.drift-check" ]; then
        mv node_modules.backup.drift-check node_modules
    else
        print_info "Restoring full dependencies..."
        npm install --silent
    fi
else
    print_error "package.json or package-lock.json missing"
    ((ISSUES_FOUND++))
fi

echo ""

# 4. Check for Outdated Dependencies
print_step "Checking for outdated dependencies..."
if command -v npm >/dev/null 2>&1; then
    OUTDATED_COUNT=$(npm outdated --json 2>/dev/null | grep -o '"[^"]*":' | wc -l || echo "0")
    if [ "$OUTDATED_COUNT" -gt 0 ]; then
        print_warning "$OUTDATED_COUNT outdated dependencies found"
        print_info "Run 'npm outdated' for details"
        ((WARNINGS_FOUND++))
    else
        print_success "All dependencies are up to date"
    fi
else
    print_error "npm not available for dependency checking"
    ((ISSUES_FOUND++))
fi

echo ""

# 5. Security Audit
print_step "Running security audit..."
if npm audit --audit-level=high --silent; then
    print_success "No high or critical security vulnerabilities found"
else
    AUDIT_COUNT=$(npm audit --json 2>/dev/null | grep -o '"high":[0-9]*\|"critical":[0-9]*' | awk -F: '{sum+=$2} END {print sum+0}' || echo "unknown")
    if [ "$AUDIT_COUNT" != "unknown" ] && [ "$AUDIT_COUNT" -gt 0 ]; then
        print_error "$AUDIT_COUNT high/critical security vulnerabilities found"
        print_info "Run 'npm audit' for details and 'npm audit fix' to resolve"
        ((ISSUES_FOUND++))
    else
        print_warning "Security audit completed with warnings"
        ((WARNINGS_FOUND++))
    fi
fi

echo ""

# 6. Check TypeScript Configuration
print_step "Validating TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    if npm run type-check --silent; then
        print_success "TypeScript compilation successful"
    else
        print_error "TypeScript compilation errors detected"
        print_info "Run 'npm run type-check' to see specific errors"
        ((ISSUES_FOUND++))
    fi
else
    print_warning "tsconfig.json not found - consider adding TypeScript"
    ((WARNINGS_FOUND++))
fi

echo ""

# 7. Validate CI/CD Configuration
print_step "Checking CI/CD configuration..."
if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l || echo "0")
    if [ "$WORKFLOW_COUNT" -gt 0 ]; then
        print_success "$WORKFLOW_COUNT GitHub Actions workflow(s) found"
        
        # Check for dependency validation workflow
        if ls .github/workflows/*.yml 2>/dev/null | xargs grep -l "omit=dev\|only=production" >/dev/null 2>&1; then
            print_success "Dependency validation found in CI workflows"
        else
            print_warning "No dependency validation detected in CI workflows"
            print_info "Consider adding production-only build test to CI"
            ((WARNINGS_FOUND++))
        fi
    else
        print_warning "No GitHub Actions workflows found"
        ((WARNINGS_FOUND++))
    fi
else
    print_warning "No .github/workflows directory found"
    ((WARNINGS_FOUND++))
fi

echo ""

# 8. Documentation Check
print_step "Checking deployment documentation..."
if [ -d "docs/deployment" ]; then
    DOC_COUNT=$(ls -1 docs/deployment/*.md 2>/dev/null | wc -l || echo "0")
    if [ "$DOC_COUNT" -gt 0 ]; then
        print_success "$DOC_COUNT deployment documentation files found"
    else
        print_warning "Deployment documentation directory exists but is empty"
        ((WARNINGS_FOUND++))
    fi
else
    print_error "No deployment documentation found"
    print_info "Create docs/deployment/ directory with deployment guides"
    ((ISSUES_FOUND++))
fi

echo ""

# Summary Report
echo "========================================"
echo "🔍 Environment Drift Check Complete"
echo "========================================"

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    print_success "No issues or warnings detected - environment is stable"
    echo ""
    echo "✨ Environment Health: EXCELLENT"
    exit 0
elif [ $ISSUES_FOUND -eq 0 ]; then
    print_success "No critical issues detected"
    print_warning "$WARNINGS_FOUND warnings found - consider addressing"
    echo ""
    echo "⚡ Environment Health: GOOD (with warnings)"
    exit 0
else
    print_error "$ISSUES_FOUND critical issues detected"
    if [ $WARNINGS_FOUND -gt 0 ]; then
        print_warning "$WARNINGS_FOUND additional warnings found"
    fi
    echo ""
    echo "🚨 Environment Health: NEEDS ATTENTION"
    echo ""
    print_info "Recommended actions:"
    echo "  1. Address critical issues immediately"
    echo "  2. Review warnings for potential improvements"
    echo "  3. Run 'npm run pre-merge' to validate fixes"
    echo "  4. Update deployment documentation if needed"
    exit 1
fi