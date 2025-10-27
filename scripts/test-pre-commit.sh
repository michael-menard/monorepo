#!/bin/bash

# Test Pre-commit Setup
# This script helps you test the pre-commit hooks without actually committing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Pre-commit Setup${NC}"
echo "============================="
echo ""

# Check if Husky is installed
if [ ! -d ".husky" ]; then
    echo -e "${RED}❌ Husky not found. Run: npx husky init${NC}"
    exit 1
fi

# Check if pre-commit hook exists
if [ ! -f ".husky/pre-commit" ]; then
    echo -e "${RED}❌ Pre-commit hook not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Husky setup found${NC}"
echo ""

# Test frontend linting
echo -e "${YELLOW}🧹 Testing Frontend Linting...${NC}"
cd apps/web/lego-moc-instructions-app

if pnpm lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ESLint passed${NC}"
else
    echo -e "${RED}❌ ESLint failed${NC}"
    echo "Run: cd apps/web/lego-moc-instructions-app && pnpm lint"
fi

# Test TypeScript checking
echo -e "${YELLOW}🔍 Testing TypeScript Check...${NC}"
if pnpm type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript check failed${NC}"
    echo "Run: cd apps/web/lego-moc-instructions-app && pnpm type-check"
fi

# Test Prettier formatting
echo -e "${YELLOW}💅 Testing Prettier Check...${NC}"
if pnpm prettier --check src/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Prettier check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Prettier formatting issues found${NC}"
    echo "Run: cd apps/web/lego-moc-instructions-app && pnpm format"
fi

# Go back to root
cd ../../..

echo ""
echo -e "${BLUE}📋 Pre-commit Hook Status${NC}"
echo "-------------------------"

# Test lint-staged configuration
if command -v npx > /dev/null && npx lint-staged --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ lint-staged available${NC}"
else
    echo -e "${RED}❌ lint-staged not available${NC}"
fi

# Check if git hooks are installed
if [ -f ".git/hooks/pre-commit" ]; then
    echo -e "${GREEN}✅ Git pre-commit hook installed${NC}"
else
    echo -e "${YELLOW}⚠️  Git pre-commit hook not installed${NC}"
    echo "Run: npx husky install"
fi

echo ""
echo -e "${BLUE}🚀 How to Test${NC}"
echo "---------------"
echo "1. Make a small change to a frontend file:"
echo "   echo '// Test change' >> apps/web/lego-moc-instructions-app/src/main.tsx"
echo ""
echo "2. Stage the change:"
echo "   git add apps/web/lego-moc-instructions-app/src/main.tsx"
echo ""
echo "3. Try to commit (hooks will run):"
echo "   git commit -m 'test: trigger pre-commit hooks'"
echo ""
echo "4. If hooks pass, reset the test change:"
echo "   git reset HEAD~1"
echo "   git checkout -- apps/web/lego-moc-instructions-app/src/main.tsx"
echo ""
echo -e "${GREEN}✅ Pre-commit setup test complete!${NC}"
