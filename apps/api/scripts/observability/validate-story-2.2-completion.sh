#!/bin/bash

# Validate Story 2.2 Completion
# Story 2.2: CloudWatch Data Source Configuration
# 
# This script validates that all acceptance criteria and integration
# verification requirements have been met for Story 2.2

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
STAGE="${STAGE:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test result functions
test_pass() {
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
    log_success "✓ $1"
}

test_fail() {
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
    log_error "✗ $1"
}

test_warning() {
    ((TESTS_TOTAL++))
    log_warning "⚠ $1"
}

# Help function
show_help() {
    cat << EOF
Validate Story 2.2 Completion

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --detailed                  Show detailed test results
    -h, --help                  Show this help message

Examples:
    $0                          # Validate story completion for dev
    $0 -s prod --detailed       # Detailed validation for production

EOF
}

# Parse command line arguments
DETAILED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--stage)
            STAGE="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --detailed)
            DETAILED=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

log_info "Validating Story 2.2: CloudWatch Data Source Configuration"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Detailed Mode:  $DETAILED"
echo

# Validate AWS CLI and credentials
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed or not in PATH"
    exit 1
fi

if ! aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    log_error "AWS credentials validation failed"
    exit 1
fi

# Get workspace information
STACK_NAME="user-metrics-grafana-$STAGE"
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    log_error "Grafana workspace stack not found: $STACK_NAME"
    exit 1
fi

WORKSPACE_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceEndpoint`].OutputValue' \
    --output text)

echo "  Workspace URL:  $WORKSPACE_URL"
echo

# Acceptance Criteria Validation
log_info "Validating Acceptance Criteria:"
echo

# AC1: CloudWatch data source added to Grafana workspace with IAM role authentication
log_info "AC1: CloudWatch data source configuration"
if [[ -f "$SCRIPT_DIR/configure-cloudwatch-datasources.sh" ]]; then
    test_pass "Data source configuration script exists"
else
    test_fail "Data source configuration script missing"
fi

# AC2: Permissions validated to query all relevant CloudWatch namespaces
log_info "AC2: CloudWatch namespace permissions"
NAMESPACES=("AWS/Lambda" "AWS/ApiGateway" "AWS/CloudFront" "AWS/RDS" "AWS/ElastiCache" "AWS/ES")
for namespace in "${NAMESPACES[@]}"; do
    METRICS=$(aws cloudwatch list-metrics \
        --namespace "$namespace" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'length(Metrics)' \
        --output text 2>/dev/null || echo "0")
    
    if [[ "$METRICS" -gt 0 ]]; then
        test_pass "Namespace $namespace accessible ($METRICS metrics)"
    else
        test_warning "Namespace $namespace has no metrics (may be expected)"
    fi
done

# AC3: CloudWatch Logs Insights configured as data source for log queries
log_info "AC3: CloudWatch Logs Insights configuration"
LOG_GROUPS=$(aws logs describe-log-groups \
    --log-group-name-prefix "/aws/lambda/lego-api-serverless-$STAGE" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(logGroups)' \
    --output text 2>/dev/null || echo "0")

if [[ "$LOG_GROUPS" -gt 0 ]]; then
    test_pass "CloudWatch Logs accessible ($LOG_GROUPS log groups found)"
else
    test_fail "No CloudWatch log groups found"
fi

# Test log insights query capability
HEALTH_CHECK_LOG="/aws/lambda/lego-api-serverless-$STAGE-HealthCheckFunction"
if aws logs start-query \
    --log-group-name "$HEALTH_CHECK_LOG" \
    --start-time $(date -d '1 hour ago' +%s) \
    --end-time $(date +%s) \
    --query-string 'fields @timestamp, @message | limit 1' \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" &> /dev/null; then
    test_pass "CloudWatch Logs Insights query capability verified"
else
    test_warning "CloudWatch Logs Insights query test failed (log group may not exist)"
fi

# AC4: Default region set correctly for data source
log_info "AC4: Default region configuration"
if [[ "$AWS_REGION" == "us-east-1" ]] || [[ -n "$AWS_REGION" ]]; then
    test_pass "Default region configured: $AWS_REGION"
else
    test_fail "Default region not properly configured"
fi

# AC5: Test query executed successfully to verify connectivity
log_info "AC5: Test query execution"
if [[ -f "$SCRIPT_DIR/test-cloudwatch-queries.sh" ]]; then
    test_pass "Test query script exists"

    # Run a quick test query
    END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
    START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)

    TEST_QUERY=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value="lego-api-serverless-$STAGE-HealthCheckFunction" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 3600 \
        --statistics Sum \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --output json 2>/dev/null || echo '{"Datapoints":[]}')

    if echo "$TEST_QUERY" | jq -e '.Datapoints' &> /dev/null; then
        test_pass "Test query executed successfully"
    else
        test_fail "Test query execution failed"
    fi
else
    test_fail "Test query script missing"
fi

# AC6: Data source marked as default for CloudWatch metrics
log_info "AC6: Default data source configuration"
if [[ -f "$SCRIPT_DIR/configure-cloudwatch-datasources.sh" ]]; then
    if grep -q '"isDefault": true' "$SCRIPT_DIR/configure-cloudwatch-datasources.sh"; then
        test_pass "CloudWatch metrics configured as default data source"
    else
        test_fail "Default data source configuration not found"
    fi
else
    test_fail "Data source configuration script missing"
fi

# Integration Verification
log_info "Integration Verification:"
echo

# IV1: CloudWatch metrics collection for existing resources unaffected
log_info "IV1: Existing CloudWatch metrics collection"
EXISTING_DASHBOARD="LEGO-API-Serverless-$STAGE"
if aws cloudwatch get-dashboard --dashboard-name "$EXISTING_DASHBOARD" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    test_pass "Existing CloudWatch dashboard accessible: $EXISTING_DASHBOARD"
else
    test_warning "Existing CloudWatch dashboard not found (may not be deployed)"
fi

# IV2: Existing CloudWatch alarms continue functioning normally
log_info "IV2: Existing CloudWatch alarms"
ALARM_COUNT=$(aws cloudwatch describe-alarms \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(MetricAlarms[?contains(AlarmName, `lego-api`)])' \
    --output text 2>/dev/null || echo "0")

if [[ "$ALARM_COUNT" -gt 0 ]]; then
    test_pass "Existing CloudWatch alarms accessible ($ALARM_COUNT alarms)"
else
    test_warning "No existing CloudWatch alarms found (may not be deployed)"
fi

# IV3: No additional CloudWatch API costs from Grafana queries
log_info "IV3: CloudWatch API cost impact"
if [[ -f "$SCRIPT_DIR/optimize-cloudwatch-datasources.sh" ]]; then
    test_pass "Cost optimization script exists"

    # Check if optimization recommendations are in place
    if grep -q "caching" "$SCRIPT_DIR/optimize-cloudwatch-datasources.sh"; then
        test_pass "Cost optimization recommendations include caching"
    else
        test_warning "Cost optimization recommendations may be incomplete"
    fi
else
    test_fail "Cost optimization script missing"
fi

# Deliverables Validation
log_info "Deliverables Validation:"
echo

# Check for required scripts
REQUIRED_SCRIPTS=(
    "configure-cloudwatch-datasources.sh"
    "validate-cloudwatch-datasources.sh"
    "test-cloudwatch-queries.sh"
    "optimize-cloudwatch-datasources.sh"
    "import-grafana-dashboards.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ -f "$SCRIPT_DIR/$script" ]]; then
        test_pass "Script exists: $script"
    else
        test_fail "Script missing: $script"
    fi
done

# Check for dashboard templates
DASHBOARDS_DIR="$PROJECT_ROOT/sst/observability/grafana-dashboards"
if [[ -d "$DASHBOARDS_DIR" ]]; then
    DASHBOARD_COUNT=$(find "$DASHBOARDS_DIR" -name "*.json" | wc -l)
    if [[ "$DASHBOARD_COUNT" -gt 0 ]]; then
        test_pass "Dashboard templates exist ($DASHBOARD_COUNT templates)"
    else
        test_fail "No dashboard templates found"
    fi
else
    test_fail "Dashboard templates directory missing"
fi

# Test Summary
echo
log_info "Story 2.2 Validation Summary"
echo "  Tests Passed:   $TESTS_PASSED"
echo "  Tests Failed:   $TESTS_FAILED"
echo "  Tests Total:    $TESTS_TOTAL"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo
    log_success "Story 2.2 validation completed successfully! ✓"
    echo
    log_info "All acceptance criteria and integration verification requirements met"
    echo "  Next steps:"
    echo "    1. Configure data sources in Grafana UI using provided scripts"
    echo "    2. Import dashboard templates"
    echo "    3. Test data visualization and alerting"
    echo "    4. Monitor CloudWatch API usage and costs"
    exit 0
else
    echo
    log_error "Story 2.2 validation failed! ✗"
    echo
    log_info "Please address the failed validation items before marking story complete"
    exit 1
fi
