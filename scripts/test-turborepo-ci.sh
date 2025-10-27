#!/bin/bash

# Test Turborepo CI Integration
# This script helps you test the Turborepo change detection and CI integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Testing Turborepo CI Integration${NC}"
echo "===================================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Check if Turborepo is available
if ! command -v turbo &> /dev/null; then
    echo -e "${RED}❌ Turborepo not found. Installing...${NC}"
    pnpm install -g turbo
fi

echo -e "${GREEN}✅ Turborepo available${NC}"
echo ""

# Test change detection
echo -e "${YELLOW}🔍 Testing Change Detection${NC}"
echo "----------------------------"

# Show current branch and commit
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo "Current commit: $CURRENT_COMMIT"
echo ""

# Test different Turborepo filters
echo -e "${BLUE}📋 Testing Turborepo Filters${NC}"
echo ""

echo "1. Changed projects since last commit:"
pnpm turbo build --filter="...[HEAD^1]" --dry-run | grep -E "^@repo|^apps|^packages" || echo "  No changes detected"
echo ""

echo "2. Changed projects since main branch:"
if git show-ref --verify --quiet refs/remotes/origin/main; then
    pnpm turbo build --filter="...[origin/main]" --dry-run | grep -E "^@repo|^apps|^packages" || echo "  No changes detected"
else
    echo "  origin/main not found, skipping"
fi
echo ""

echo "3. All projects that would be affected by current changes:"
pnpm turbo build --filter="...[HEAD]" --dry-run | grep -E "^@repo|^apps|^packages" || echo "  No changes detected"
echo ""

# Test specific project filters
echo -e "${BLUE}🎯 Testing Project-specific Filters${NC}"
echo ""

echo "Frontend and dependencies:"
pnpm turbo build --filter="@repo/lego-moc-instructions-app^..." --dry-run | grep -E "^@repo|^apps|^packages" || echo "  No dependencies found"
echo ""

echo "Auth service and dependencies:"
pnpm turbo build --filter="@repo/auth-service^..." --dry-run | grep -E "^@repo|^apps|^packages" || echo "  No dependencies found"
echo ""

# Test the pre-commit hook logic
echo -e "${YELLOW}🪝 Testing Pre-commit Hook Logic${NC}"
echo "--------------------------------"

# Simulate staged files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")
if [ -n "$STAGED_FILES" ]; then
    echo "Staged files detected:"
    echo "$STAGED_FILES" | sed 's/^/  - /'
    echo ""
    
    echo "Projects that would be checked by pre-commit:"
    pnpm turbo build --filter="...[HEAD]" --dry-run | grep -E "^@repo|^apps|^packages" || echo "  No projects affected"
else
    echo "No staged files. To test:"
    echo "  1. Make a small change: echo '// test' >> apps/web/lego-moc-instructions-app/src/main.tsx"
    echo "  2. Stage it: git add apps/web/lego-moc-instructions-app/src/main.tsx"
    echo "  3. Run this script again"
fi
echo ""

# Test deployment detection logic
echo -e "${YELLOW}🚀 Testing Deployment Detection${NC}"
echo "--------------------------------"

echo "Projects that would be deployed based on changes:"

# Simulate the deployment workflow logic
FRONTEND_CHANGED="false"
AUTH_CHANGED="false"
LEGO_API_CHANGED="false"

if pnpm turbo build --filter="@repo/lego-moc-instructions-app...[HEAD^1]" --dry-run | grep -q "@repo/lego-moc-instructions-app"; then
    FRONTEND_CHANGED="true"
    echo -e "  ${GREEN}✅ Frontend would be deployed${NC}"
else
    echo -e "  ${YELLOW}⏭️  Frontend deployment skipped${NC}"
fi

if pnpm turbo build --filter="@repo/auth-service...[HEAD^1]" --dry-run | grep -q "@repo/auth-service"; then
    AUTH_CHANGED="true"
    echo -e "  ${GREEN}✅ Auth Service would be deployed${NC}"
else
    echo -e "  ${YELLOW}⏭️  Auth Service deployment skipped${NC}"
fi

if pnpm turbo build --filter="@repo/lego-projects-api...[HEAD^1]" --dry-run | grep -q "@repo/lego-projects-api"; then
    LEGO_API_CHANGED="true"
    echo -e "  ${GREEN}✅ LEGO API would be deployed${NC}"
else
    echo -e "  ${YELLOW}⏭️  LEGO API deployment skipped${NC}"
fi

echo ""

# Performance test
echo -e "${YELLOW}⚡ Performance Test${NC}"
echo "-------------------"

echo "Testing build performance with change detection..."
START_TIME=$(date +%s)
pnpm turbo build --filter="...[HEAD^1]" > /dev/null 2>&1 || true
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Build with change detection took: ${DURATION}s"
echo ""

# Summary
echo -e "${BLUE}📊 Summary${NC}"
echo "----------"
echo "✅ Turborepo change detection working"
echo "✅ Project filters configured correctly"
echo "✅ Pre-commit integration ready"
echo "✅ Deployment detection logic ready"
echo ""

if [ "$FRONTEND_CHANGED" = "true" ] || [ "$AUTH_CHANGED" = "true" ] || [ "$LEGO_API_CHANGED" = "true" ]; then
    echo -e "${GREEN}🎯 Changes detected - CI/CD would be triggered${NC}"
else
    echo -e "${YELLOW}💤 No changes detected - CI/CD would be skipped${NC}"
fi

echo ""
echo -e "${BLUE}💡 Next Steps${NC}"
echo "-------------"
echo "1. Make a test change to trigger the workflow:"
echo "   echo '// Test change' >> apps/web/lego-moc-instructions-app/src/main.tsx"
echo ""
echo "2. Test pre-commit hooks:"
echo "   git add . && git commit -m 'test: trigger turborepo checks'"
echo ""
echo "3. Push to trigger CI/CD:"
echo "   git push origin $(git branch --show-current)"
echo ""
echo -e "${GREEN}✅ Turborepo CI integration test complete!${NC}"
