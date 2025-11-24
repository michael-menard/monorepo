#!/bin/bash
#
# Master script for running complete performance validation
# Runs load tests, extracts metrics, validates thresholds, and generates reports
#
# Usage:
#   ./run-performance-validation.sh [API_BASE_URL] [AUTH_TOKEN]
#
# Examples:
#   ./run-performance-validation.sh https://api.example.com your-jwt-token
#   API_BASE_URL=https://api.example.com TEST_AUTH_TOKEN=token ./run-performance-validation.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${1:-${API_BASE_URL:-http://localhost:3000}}"
TEST_AUTH_TOKEN="${2:-${TEST_AUTH_TOKEN}}"
RESULTS_DIR="tests/performance/results"
SCRIPTS_DIR="scripts/performance"
BASELINE_FILE="baselines/ecs-baseline.json"

# Ensure we're in the right directory
cd "$(dirname "$0")/../.."

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}🚀 LEGO API Performance Validation Suite${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  API URL:     $API_BASE_URL"
echo "  Auth Token:  ${TEST_AUTH_TOKEN:0:20}..."
echo "  Results Dir: $RESULTS_DIR"
echo ""

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v artillery &> /dev/null; then
    echo -e "${RED}❌ Artillery not found. Install with: npm install -g artillery${NC}"
    exit 1
fi

if ! command -v tsx &> /dev/null; then
    echo -e "${RED}❌ tsx not found. Install with: npm install -g tsx${NC}"
    exit 1
fi

if [ -z "$TEST_AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Warning: TEST_AUTH_TOKEN not set. Some tests may fail.${NC}"
fi

# Check for test fixtures
if [ ! -f "tests/performance/fixtures/test-image.jpg" ]; then
    echo -e "${YELLOW}⚠️  Warning: test-image.jpg not found in fixtures. Image upload tests will be skipped.${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Step 1: Run Artillery load test
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 Step 1: Running Artillery load test${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

export API_BASE_URL
export TEST_AUTH_TOKEN

artillery run tests/performance/load-test.yml \
  --output "$RESULTS_DIR/artillery-report.json" \
  2>&1 | tee "$RESULTS_DIR/artillery-console.log"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Artillery load test failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Load test completed${NC}"
echo ""

# Step 2: Generate HTML report
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}📈 Step 2: Generating HTML report${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

artillery report "$RESULTS_DIR/artillery-report.json" \
  --output "$RESULTS_DIR/artillery-report.html"

echo -e "${GREEN}✅ HTML report generated: $RESULTS_DIR/artillery-report.html${NC}"
echo ""

# Step 3: Extract metrics
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}📋 Step 3: Extracting key metrics${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"

tsx "$SCRIPTS_DIR/extract-metrics.ts" \
  "$RESULTS_DIR/artillery-report.json" \
  "$RESULTS_DIR/metrics.json"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Metrics extraction failed${NC}"
    exit 1
fi

echo ""

# Step 4: Compare with baseline
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}🔍 Step 4: Comparing with ECS baseline${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"

tsx "$SCRIPTS_DIR/compare-baselines.ts" \
  "$RESULTS_DIR/metrics.json" \
  "$BASELINE_FILE"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Baseline comparison completed with warnings${NC}"
fi

echo ""

# Step 5: Validate thresholds
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}✅ Step 5: Validating performance thresholds${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"

THRESHOLDS_PASSED=false
if tsx "$SCRIPTS_DIR/validate-thresholds.ts" "$RESULTS_DIR/metrics.json"; then
    THRESHOLDS_PASSED=true
fi

echo ""

# Step 6: Analyze costs (optional, requires AWS credentials)
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}💰 Step 6: Analyzing AWS costs (optional)${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

COST_ANALYSIS_PASSED=true
if [ -n "$AWS_ACCESS_KEY_ID" ] || [ -n "$AWS_PROFILE" ]; then
    if tsx "$SCRIPTS_DIR/analyze-costs.ts" 7 "$BASELINE_FILE"; then
        echo -e "${GREEN}✅ Cost analysis passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Cost analysis failed or not meeting target${NC}"
        COST_ANALYSIS_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠️  Skipping cost analysis (AWS credentials not configured)${NC}"
fi

echo ""

# Step 7: Analyze cold starts (optional, requires AWS credentials)
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}🥶 Step 7: Analyzing Lambda cold starts (optional)${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

COLD_START_PASSED=true
if [ -n "$AWS_ACCESS_KEY_ID" ] || [ -n "$AWS_PROFILE" ]; then
    if tsx "$SCRIPTS_DIR/analyze-cold-starts.ts" 24; then
        echo -e "${GREEN}✅ Cold start analysis passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Cold start analysis failed or not meeting target${NC}"
        COLD_START_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠️  Skipping cold start analysis (AWS credentials not configured)${NC}"
fi

echo ""

# Final summary
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 VALIDATION SUMMARY${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

if [ "$THRESHOLDS_PASSED" = true ]; then
    echo -e "Performance Thresholds:    ${GREEN}✅ PASSED${NC}"
else
    echo -e "Performance Thresholds:    ${RED}❌ FAILED${NC}"
fi

if [ "$COST_ANALYSIS_PASSED" = true ]; then
    echo -e "Cost Analysis:             ${GREEN}✅ PASSED${NC}"
else
    echo -e "Cost Analysis:             ${YELLOW}⚠️  FAILED or SKIPPED${NC}"
fi

if [ "$COLD_START_PASSED" = true ]; then
    echo -e "Cold Start Analysis:       ${GREEN}✅ PASSED${NC}"
else
    echo -e "Cold Start Analysis:       ${YELLOW}⚠️  FAILED or SKIPPED${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "📄 Generated Reports:"
echo "   - Artillery HTML Report:   $RESULTS_DIR/artillery-report.html"
echo "   - Metrics JSON:            $RESULTS_DIR/metrics.json"
echo "   - Comparison Report:       $RESULTS_DIR/comparison-report.json"
echo "   - Cost Analysis:           $RESULTS_DIR/cost-analysis.json"
echo "   - Cold Start Analysis:     $RESULTS_DIR/cold-start-analysis.json"
echo ""

if [ "$THRESHOLDS_PASSED" = true ] && [ "$COST_ANALYSIS_PASSED" = true ] && [ "$COLD_START_PASSED" = true ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME VALIDATIONS FAILED${NC}"
    echo ""
    echo "Please review the reports and logs for details."
    exit 1
fi
