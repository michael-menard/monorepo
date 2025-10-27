#!/bin/bash

# Local CodeRabbit-style Analysis
# Run comprehensive code analysis similar to CodeRabbit's review process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Local CodeRabbit-style Analysis${NC}"
echo "===================================="
echo ""

# Parse command line arguments
SCOPE="all"
FIX_ISSUES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --scope)
            SCOPE="$2"
            shift 2
            ;;
        --fix)
            FIX_ISSUES=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--scope all|changed] [--fix]"
            echo ""
            echo "Options:"
            echo "  --scope all|changed  Analyze all files or only changed files (default: all)"
            echo "  --fix               Auto-fix issues where possible"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Determine filter based on scope
if [ "$SCOPE" = "changed" ]; then
    FILTER="--filter=\"...[HEAD]\""
    echo -e "${BLUE}📊 Analyzing changed files only${NC}"
else
    FILTER=""
    echo -e "${BLUE}📊 Analyzing entire codebase${NC}"
fi

echo ""

# Track issues
TOTAL_ISSUES=0
SECURITY_ISSUES=0
QUALITY_ISSUES=0
PERFORMANCE_ISSUES=0
TEST_ISSUES=0

# 1. Security Analysis
echo -e "${BLUE}🔒 Security Analysis${NC}"
echo "-------------------"

# Dependency audit
echo "🔍 Running dependency security audit..."
if pnpm audit --audit-level moderate > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No security vulnerabilities found${NC}"
else
    echo -e "${RED}❌ Security vulnerabilities detected${NC}"
    pnpm audit --audit-level moderate
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Secret scanning
echo "🔍 Scanning for potential secrets..."
SECRET_PATTERNS="(api[_-]?key|secret|password|token|private[_-]?key)"
if find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs grep -i -E "$SECRET_PATTERNS" 2>/dev/null | head -5; then
    echo -e "${YELLOW}⚠️  Potential secrets found (review above)${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e "${GREEN}✅ No obvious secrets detected${NC}"
fi

echo ""

# 2. Code Quality Analysis
echo -e "${BLUE}📝 Code Quality Analysis${NC}"
echo "------------------------"

# TypeScript checks
echo "🔍 Running TypeScript analysis..."
if eval "pnpm turbo type-check $FILTER" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript checks passed${NC}"
else
    echo -e "${RED}❌ TypeScript errors found${NC}"
    eval "pnpm turbo type-check $FILTER"
    QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
fi

# Linting
echo "🔍 Running ESLint analysis..."
if eval "pnpm turbo lint $FILTER" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Linting checks passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting issues found${NC}"
    if [ "$FIX_ISSUES" = true ]; then
        echo "🔧 Auto-fixing linting issues..."
        eval "pnpm turbo lint --fix $FILTER" || true
    else
        eval "pnpm turbo lint $FILTER" | head -20
        echo "💡 Use --fix flag to auto-fix some issues"
    fi
    QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
fi

echo ""

# 3. Performance Analysis
echo -e "${BLUE}⚡ Performance Analysis${NC}"
echo "-----------------------"

# React performance patterns
echo "🔍 Analyzing React performance patterns..."
REACT_FILES=$(find . -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | head -10)

if [ -n "$REACT_FILES" ]; then
    # Check for missing useCallback
    MISSING_CALLBACK=$(echo "$REACT_FILES" | xargs grep -l "const.*=.*(" | xargs grep -L "useCallback" | wc -l)
    if [ "$MISSING_CALLBACK" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $MISSING_CALLBACK file(s) might benefit from useCallback${NC}"
        PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
    fi
    
    # Check for expensive operations in render
    EXPENSIVE_OPS=$(echo "$REACT_FILES" | xargs grep -c "\.map\|\.filter\|\.reduce" | grep -v ":0" | wc -l)
    if [ "$EXPENSIVE_OPS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Consider memoizing expensive array operations${NC}"
        PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
    fi
    
    if [ "$PERFORMANCE_ISSUES" -eq 0 ]; then
        echo -e "${GREEN}✅ No obvious performance issues detected${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  No React files found to analyze${NC}"
fi

echo ""

# 4. Test Analysis
echo -e "${BLUE}🧪 Test Analysis${NC}"
echo "----------------"

echo "🔍 Running test suite..."
if eval "pnpm turbo test $FILTER" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passing${NC}"
else
    echo -e "${RED}❌ Test failures detected${NC}"
    eval "pnpm turbo test $FILTER" | tail -20
    TEST_ISSUES=$((TEST_ISSUES + 1))
fi

# Test coverage check
echo "🔍 Checking test coverage..."
TEST_FILES=$(find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules | wc -l)
SOURCE_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v test | grep -v spec | wc -l)
if [ "$SOURCE_FILES" -gt 0 ]; then
    COVERAGE_RATIO=$((TEST_FILES * 100 / SOURCE_FILES))
    if [ "$COVERAGE_RATIO" -lt 30 ]; then
        echo -e "${YELLOW}⚠️  Low test coverage: ~$COVERAGE_RATIO%${NC}"
        TEST_ISSUES=$((TEST_ISSUES + 1))
    else
        echo -e "${GREEN}✅ Test coverage looks reasonable: ~$COVERAGE_RATIO%${NC}"
    fi
fi

echo ""

# 5. Build Analysis
echo -e "${BLUE}🏗️  Build Analysis${NC}"
echo "------------------"

echo "🔍 Verifying build integrity..."
if eval "pnpm turbo build $FILTER" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    eval "pnpm turbo build $FILTER" | tail -20
    QUALITY_ISSUES=$((QUALITY_ISSUES + 1))
fi

echo ""

# Summary Report
TOTAL_ISSUES=$((SECURITY_ISSUES + QUALITY_ISSUES + PERFORMANCE_ISSUES + TEST_ISSUES))

echo "===================================="
echo -e "${BLUE}📊 Analysis Summary${NC}"
echo "===================================="
echo ""

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 Excellent! No issues found.${NC}"
    echo ""
    echo -e "${GREEN}✅ Security: Clean${NC}"
    echo -e "${GREEN}✅ Code Quality: Excellent${NC}"
    echo -e "${GREEN}✅ Performance: Optimized${NC}"
    echo -e "${GREEN}✅ Tests: Passing${NC}"
    echo -e "${GREEN}✅ Build: Successful${NC}"
else
    echo -e "${YELLOW}📋 Issues Summary:${NC}"
    [ $SECURITY_ISSUES -gt 0 ] && echo -e "${RED}🔒 Security: $SECURITY_ISSUES issue(s)${NC}"
    [ $QUALITY_ISSUES -gt 0 ] && echo -e "${YELLOW}📝 Code Quality: $QUALITY_ISSUES issue(s)${NC}"
    [ $PERFORMANCE_ISSUES -gt 0 ] && echo -e "${YELLOW}⚡ Performance: $PERFORMANCE_ISSUES issue(s)${NC}"
    [ $TEST_ISSUES -gt 0 ] && echo -e "${YELLOW}🧪 Tests: $TEST_ISSUES issue(s)${NC}"
    
    echo ""
    echo -e "${BLUE}💡 Recommendations:${NC}"
    echo "1. Address the issues listed above"
    echo "2. Run with --fix flag to auto-fix some issues"
    echo "3. Use specific turbo commands for detailed output"
    echo ""
fi

echo -e "${BLUE}🤖 This analysis mimics CodeRabbit's review process${NC}"
echo "For real-time AI review, create a Pull Request to trigger CodeRabbit"

exit $TOTAL_ISSUES
