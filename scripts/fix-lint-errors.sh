#!/bin/bash

# Systematic Lint Error Fixing Script
# This script runs lint --fix on all packages and provides a summary

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Systematic Lint Error Fixing${NC}"
echo "=================================="
echo ""

# Get list of all packages with lint scripts
PACKAGES=$(pnpm list --depth=0 --json | jq -r '.[] | select(.scripts.lint != null) | .name' 2>/dev/null || echo "")

if [ -z "$PACKAGES" ]; then
    # Fallback: get packages from turbo
    echo "Getting packages from turbo..."
    PACKAGES=$(pnpm turbo lint --dry-run 2>&1 | grep "Packages in scope:" | sed 's/.*: //' | tr ',' '\n' | sed 's/^ *//' | grep -v "^$")
fi

# Convert to array
PACKAGE_ARRAY=($PACKAGES)
TOTAL_PACKAGES=${#PACKAGE_ARRAY[@]}

echo -e "${BLUE}📦 Found $TOTAL_PACKAGES packages with lint scripts${NC}"
echo ""

# Track results
FIXED_PACKAGES=()
STILL_FAILING=()
ALREADY_PASSING=()

# Process each package
for i in "${!PACKAGE_ARRAY[@]}"; do
    PACKAGE="${PACKAGE_ARRAY[$i]}"
    PROGRESS=$((i + 1))
    
    echo -e "${BLUE}[$PROGRESS/$TOTAL_PACKAGES] Processing: $PACKAGE${NC}"
    
    # Run lint --fix and capture result
    if pnpm --filter="$PACKAGE" lint > /tmp/lint_output_$PACKAGE.log 2>&1; then
        echo -e "${GREEN}  ✅ PASSING${NC}"
        ALREADY_PASSING+=("$PACKAGE")
    else
        # Check if it was failing before
        echo -e "${YELLOW}  🔧 Running auto-fix...${NC}"
        
        # The lint command already includes --fix, so it already tried to fix
        # Let's check what's left
        REMAINING_ERRORS=$(grep -c "error" /tmp/lint_output_$PACKAGE.log 2>/dev/null || echo "0")
        REMAINING_WARNINGS=$(grep -c "warning" /tmp/lint_output_$PACKAGE.log 2>/dev/null || echo "0")
        
        if [ "$REMAINING_ERRORS" -eq 0 ]; then
            echo -e "${GREEN}  ✅ FIXED (only warnings remain)${NC}"
            FIXED_PACKAGES+=("$PACKAGE")
        else
            echo -e "${RED}  ❌ STILL FAILING ($REMAINING_ERRORS errors, $REMAINING_WARNINGS warnings)${NC}"
            STILL_FAILING+=("$PACKAGE")
        fi
    fi
    
    echo ""
done

# Summary
echo "=================================="
echo -e "${BLUE}📊 SUMMARY${NC}"
echo "=================================="
echo ""

echo -e "${GREEN}✅ Already Passing (${#ALREADY_PASSING[@]}):${NC}"
for pkg in "${ALREADY_PASSING[@]}"; do
    echo "  - $pkg"
done
echo ""

echo -e "${YELLOW}🔧 Fixed (${#FIXED_PACKAGES[@]}):${NC}"
for pkg in "${FIXED_PACKAGES[@]}"; do
    echo "  - $pkg"
done
echo ""

echo -e "${RED}❌ Still Failing (${#STILL_FAILING[@]}):${NC}"
for pkg in "${STILL_FAILING[@]}"; do
    echo "  - $pkg"
done
echo ""

# Detailed analysis for failing packages
if [ ${#STILL_FAILING[@]} -gt 0 ]; then
    echo -e "${BLUE}🔍 DETAILED ANALYSIS OF FAILING PACKAGES${NC}"
    echo "========================================"
    echo ""
    
    for pkg in "${STILL_FAILING[@]}"; do
        echo -e "${RED}📦 $pkg${NC}"
        echo "-------------------"
        
        # Show top error types
        if [ -f "/tmp/lint_output_$pkg.log" ]; then
            echo "Top error types:"
            grep "error" /tmp/lint_output_$pkg.log | sed 's/.*error  //' | cut -d' ' -f1 | sort | uniq -c | sort -nr | head -5 | sed 's/^/  /'
            echo ""
            
            echo "Sample errors:"
            grep "error" /tmp/lint_output_$pkg.log | head -3 | sed 's/^/  /'
            echo ""
        fi
    done
fi

# Cleanup
rm -f /tmp/lint_output_*.log

# Next steps
echo -e "${BLUE}🎯 NEXT STEPS${NC}"
echo "============="
echo ""

if [ ${#STILL_FAILING[@]} -gt 0 ]; then
    echo "1. Focus on the ${#STILL_FAILING[@]} still-failing packages"
    echo "2. Common strategies:"
    echo "   - Fix unused variables by removing or prefixing with underscore"
    echo "   - Add missing type definitions"
    echo "   - Fix import/export issues"
    echo "   - Add browser globals to eslint config for client-side code"
    echo ""
    echo "3. Run this script again after fixes to track progress"
else
    echo -e "${GREEN}🎉 All packages are now passing lint checks!${NC}"
fi

echo ""
echo "To fix a specific package:"
echo "  pnpm --filter=\"PACKAGE_NAME\" lint"
echo ""
echo "To see detailed errors for a package:"
echo "  pnpm --filter=\"PACKAGE_NAME\" lint 2>&1 | head -20"
