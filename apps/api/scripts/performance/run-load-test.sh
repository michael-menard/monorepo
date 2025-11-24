#!/bin/bash

##
# Load Test Execution Script
# Story 3.5: Performance Validation & Optimization
#
# Runs Artillery load tests against tracking endpoints and generates reports
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Load Testing: Tracking Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if API_BASE_URL is set
if [ -z "$API_BASE_URL" ]; then
    echo -e "${RED}❌ Error: API_BASE_URL environment variable not set${NC}"
    echo -e "${YELLOW}   Set it with: export API_BASE_URL=https://your-api-url${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} API Base URL: ${API_BASE_URL}"
echo ""

# Create reports directory
mkdir -p performance-reports

# Run load test
echo -e "${BLUE}🚀 Starting load test...${NC}"
echo ""

artillery run \
    --output performance-reports/load-test-results.json \
    scripts/performance/load-test-tracking.yml

# Check if test passed
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Load test completed successfully${NC}"
else
    echo ""
    echo -e "${RED}❌ Load test failed${NC}"
    exit 1
fi

# Generate HTML report
echo ""
echo -e "${BLUE}📊 Generating HTML report...${NC}"

artillery report \
    performance-reports/load-test-results.json \
    --output performance-reports/load-test-report.html

echo -e "${GREEN}✓${NC} HTML report generated: performance-reports/load-test-report.html"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Load Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  JSON Results:  ${YELLOW}performance-reports/load-test-results.json${NC}"
echo -e "  HTML Report:   ${YELLOW}performance-reports/load-test-report.html${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
