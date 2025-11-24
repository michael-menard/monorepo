#!/bin/bash

##
# Performance Testing Suite
# Story 3.5: Performance Validation & Optimization
#
# Runs comprehensive performance tests including:
# - Lighthouse CI (Web Vitals, Performance budgets)
# - Bundle size analysis
# - Performance regression detection
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Performance Testing Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create reports directory
mkdir -p performance-reports

# Track failures
FAILED_TESTS=()

##
# 1. Build application
##
echo -e "${BLUE}📦 Step 1/4: Building application...${NC}"
pnpm build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Build completed"
else
    echo -e "${RED}❌${NC} Build failed"
    exit 1
fi
echo ""

##
# 2. Bundle size analysis
##
echo -e "${BLUE}📊 Step 2/4: Analyzing bundle size...${NC}"
tsx scripts/performance/analyze-bundle-size.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Bundle size validation passed"
else
    echo -e "${RED}❌${NC} Bundle size validation failed"
    FAILED_TESTS+=("Bundle Size")
fi
echo ""

##
# 3. Lighthouse CI
##
echo -e "${BLUE}🔍 Step 3/4: Running Lighthouse CI...${NC}"

# Start dev server in background
echo "  Starting dev server..."
pnpm preview --port 5173 &
SERVER_PID=$!

# Wait for server to be ready
echo "  Waiting for server to be ready..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}❌${NC} Dev server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "  Running Lighthouse tests..."
pnpm lhci autorun

LHCI_EXIT_CODE=$?

# Kill dev server
kill $SERVER_PID 2>/dev/null || true

if [ $LHCI_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Lighthouse CI passed"
else
    echo -e "${RED}❌${NC} Lighthouse CI failed"
    FAILED_TESTS+=("Lighthouse CI")
fi
echo ""

##
# 4. Generate performance summary
##
echo -e "${BLUE}📈 Step 4/4: Generating performance summary...${NC}"

# Create summary report
cat > performance-reports/summary.md << EOF
# Performance Test Summary

**Date:** $(date)

## Test Results

### Bundle Size Analysis
- Status: $([ "${FAILED_TESTS[@]}" =~ "Bundle Size" ] && echo "❌ FAILED" || echo "✅ PASSED")
- Report: \`performance-reports/bundle-analysis.json\`

### Lighthouse CI
- Status: $([ "${FAILED_TESTS[@]}" =~ "Lighthouse CI" ] && echo "❌ FAILED" || echo "✅ PASSED")
- Report: Check Lighthouse CI output above

## Performance Budgets

### Core Web Vitals Targets
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

### Bundle Size Targets
- Tracking overhead: < 50KB (gzip)
- Total JavaScript: < 500KB
- Total CSS: < 100KB

## Critical User Flows
- Homepage load
- Gallery browsing
- Wishlist operations
- Profile viewing

## Next Steps

1. Review failed tests if any
2. Optimize performance bottlenecks
3. Run tests again after optimizations
4. Compare with baseline metrics

EOF

echo -e "${GREEN}✓${NC} Summary generated: performance-reports/summary.md"
echo ""

##
# Final summary
##
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All performance tests PASSED${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}❌ Some performance tests FAILED:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  - ${test}"
    done
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
