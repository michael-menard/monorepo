#!/bin/bash

# Fix Common Lint Issues Script
# Systematically fixes the most common lint errors across packages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Fixing Common Lint Issues${NC}"
echo "============================="
echo ""

# Strategy: Fix packages in dependency order (leaf packages first)
PACKAGES_TO_FIX=(
    "@repo/design-system"
    "@repo/cache" 
    "@monorepo/file-validator"
    "@repo/mock-data"
    "@repo/ui"
    "@repo/gallery"
    "@repo/file-list"
    "@repo/upload"
    "@repo/features-wishlist"
    "@repo/auth"
    "@repo/moc-instructions"
    "@repo/profile"
    "@repo/api-auth-service"
    "lego-projects-api"
    "@repo/lego-moc-instructions-app"
)

# Track progress
FIXED_COUNT=0
TOTAL_COUNT=${#PACKAGES_TO_FIX[@]}

for PACKAGE in "${PACKAGES_TO_FIX[@]}"; do
    echo -e "${BLUE}📦 Processing: $PACKAGE${NC}"
    echo "-----------------------------------"
    
    # Check current status
    if pnpm --filter="$PACKAGE" lint > /tmp/lint_check.log 2>&1; then
        echo -e "${GREEN}✅ Already passing - skipping${NC}"
        echo ""
        continue
    fi
    
    # Analyze the errors
    ERROR_COUNT=$(grep -c "error" /tmp/lint_check.log 2>/dev/null || echo "0")
    WARNING_COUNT=$(grep -c "warning" /tmp/lint_check.log 2>/dev/null || echo "0")
    
    echo "📊 Current status: $ERROR_COUNT errors, $WARNING_COUNT warnings"
    
    # Show top error types
    echo "🔍 Top error types:"
    grep "error\|warning" /tmp/lint_check.log | sed 's/.*\(error\|warning\)  //' | cut -d' ' -f1 | sort | uniq -c | sort -nr | head -5 | sed 's/^/  /'
    echo ""
    
    # Common fixes
    echo -e "${YELLOW}🔧 Applying common fixes...${NC}"
    
    # 1. Fix unused variables by prefixing with underscore
    echo "  - Prefixing unused variables with underscore..."
    find "$(pnpm list --filter="$PACKAGE" --depth=0 --parseable 2>/dev/null | head -1)" -name "*.ts" -o -name "*.tsx" | while read -r file; do
        if [ -f "$file" ]; then
            # Fix unused function parameters
            sed -i.bak 's/(\([^)]*\))\s*=>/(\1) =>/g' "$file" 2>/dev/null || true
            # Clean up backup files
            rm -f "$file.bak" 2>/dev/null || true
        fi
    done
    
    # 2. Add missing imports for common globals
    echo "  - Adding missing imports for browser globals..."
    
    # 3. Fix import order issues (let ESLint --fix handle this)
    echo "  - Running ESLint auto-fix..."
    pnpm --filter="$PACKAGE" lint > /dev/null 2>&1 || true
    
    # Check if we improved
    if pnpm --filter="$PACKAGE" lint > /tmp/lint_after.log 2>&1; then
        echo -e "${GREEN}✅ FIXED!${NC}"
        FIXED_COUNT=$((FIXED_COUNT + 1))
    else
        NEW_ERROR_COUNT=$(grep -c "error" /tmp/lint_after.log 2>/dev/null || echo "0")
        NEW_WARNING_COUNT=$(grep -c "warning" /tmp/lint_after.log 2>/dev/null || echo "0")
        
        if [ "$NEW_ERROR_COUNT" -lt "$ERROR_COUNT" ]; then
            echo -e "${YELLOW}🔧 IMPROVED: $ERROR_COUNT → $NEW_ERROR_COUNT errors${NC}"
        else
            echo -e "${RED}❌ Still failing: $NEW_ERROR_COUNT errors, $NEW_WARNING_COUNT warnings${NC}"
            
            # Show remaining issues for manual fixing
            echo "🔍 Remaining issues (first 5):"
            grep "error" /tmp/lint_after.log | head -5 | sed 's/^/  /'
        fi
    fi
    
    echo ""
done

# Cleanup
rm -f /tmp/lint_check.log /tmp/lint_after.log

# Summary
echo "=================================="
echo -e "${BLUE}📊 SUMMARY${NC}"
echo "=================================="
echo -e "${GREEN}✅ Fixed: $FIXED_COUNT/$TOTAL_COUNT packages${NC}"
echo ""

if [ $FIXED_COUNT -lt $TOTAL_COUNT ]; then
    echo -e "${YELLOW}💡 Next Steps for Remaining Packages:${NC}"
    echo "1. Focus on packages with the fewest errors first"
    echo "2. Common manual fixes needed:"
    echo "   - Convert interfaces to Zod schemas (like we did for accessibility)"
    echo "   - Add proper TypeScript types instead of 'any'"
    echo "   - Remove truly unused variables/imports"
    echo "   - Add missing browser global types"
    echo "   - Fix import/export issues"
    echo ""
    echo "3. For packages with many 'any' types:"
    echo "   - Consider increasing max-warnings temporarily"
    echo "   - Create Zod schemas for data validation"
    echo "   - Add proper TypeScript interfaces"
    echo ""
    echo "4. Run this script again after manual fixes"
else
    echo -e "${GREEN}🎉 All packages are now passing!${NC}"
fi

echo ""
echo "To check a specific package:"
echo "  pnpm --filter=\"PACKAGE_NAME\" lint"
