#!/bin/bash

# Validate CloudWatch Data Sources Configuration
# Story 2.2: CloudWatch Data Source Configuration
# 
# This script validates that CloudWatch data sources are properly configured
# and can access the required metrics and logs

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME_PREFIX="user-metrics-grafana"

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

test_skip() {
    ((TESTS_TOTAL++))
    log_warning "⚠ $1 (SKIPPED)"
}

# Help function
show_help() {
    cat << EOF
Validate CloudWatch Data Sources Configuration

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --skip-logs                 Skip CloudWatch Logs validation
    -h, --help                  Show this help message

Examples:
    $0                          # Validate all data sources for dev
    $0 -s prod                  # Validate production data sources
    $0 --skip-logs              # Skip logs validation

EOF
}

# Parse command line arguments
SKIP_LOGS=false

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
        --skip-logs)
            SKIP_LOGS=true
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

STACK_NAME="$STACK_NAME_PREFIX-$STAGE"

log_info "Validating CloudWatch Data Sources Configuration"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Skip Logs:      $SKIP_LOGS"
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
log_info "Retrieving workspace information..."
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    log_error "Grafana workspace stack not found: $STACK_NAME"
    exit 1
fi

WORKSPACE_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceRoleArn`].OutputValue' \
    --output text)

echo "  Service Role:   $WORKSPACE_ROLE_ARN"
echo

# Test 1: CloudWatch Metrics Access
log_info "Test 1: CloudWatch Metrics Access"

# Test Lambda metrics
LAMBDA_METRICS=$(aws cloudwatch list-metrics \
    --namespace AWS/Lambda \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null || echo "0")

if [[ "$LAMBDA_METRICS" -gt 0 ]]; then
    test_pass "Lambda metrics accessible ($LAMBDA_METRICS metrics found)"
else
    test_fail "No Lambda metrics found"
fi

# Test API Gateway metrics
API_METRICS=$(aws cloudwatch list-metrics \
    --namespace AWS/ApiGateway \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null || echo "0")

if [[ "$API_METRICS" -gt 0 ]]; then
    test_pass "API Gateway metrics accessible ($API_METRICS metrics found)"
else
    test_fail "No API Gateway metrics found"
fi

# Test RDS metrics
RDS_METRICS=$(aws cloudwatch list-metrics \
    --namespace AWS/RDS \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null || echo "0")

if [[ "$RDS_METRICS" -gt 0 ]]; then
    test_pass "RDS metrics accessible ($RDS_METRICS metrics found)"
else
    test_fail "No RDS metrics found"
fi

# Test ElastiCache metrics
ELASTICACHE_METRICS=$(aws cloudwatch list-metrics \
    --namespace AWS/ElastiCache \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null || echo "0")

if [[ "$ELASTICACHE_METRICS" -gt 0 ]]; then
    test_pass "ElastiCache metrics accessible ($ELASTICACHE_METRICS metrics found)"
else
    test_fail "No ElastiCache metrics found"
fi

# Test OpenSearch metrics
OPENSEARCH_METRICS=$(aws cloudwatch list-metrics \
    --namespace AWS/ES \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null || echo "0")

if [[ "$OPENSEARCH_METRICS" -gt 0 ]]; then
    test_pass "OpenSearch metrics accessible ($OPENSEARCH_METRICS metrics found)"
else
    test_fail "No OpenSearch metrics found"
fi

# Test 2: CloudWatch Logs Access
if [[ "$SKIP_LOGS" == "false" ]]; then
    log_info "Test 2: CloudWatch Logs Access"

    # Test log groups access
    LOG_GROUPS=$(aws logs describe-log-groups \
        --log-group-name-prefix "/aws/lambda/lego-api-serverless-$STAGE" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'length(logGroups)' \
        --output text 2>/dev/null || echo "0")

    if [[ "$LOG_GROUPS" -gt 0 ]]; then
        test_pass "Lambda log groups accessible ($LOG_GROUPS log groups found)"
    else
        test_fail "No Lambda log groups found"
    fi

    # Test specific log group access
    HEALTH_CHECK_LOG="/aws/lambda/lego-api-serverless-$STAGE-HealthCheckFunction"
    if aws logs describe-log-groups --log-group-name-prefix "$HEALTH_CHECK_LOG" --profile "$AWS_PROFILE" --region "$AWS_REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$HEALTH_CHECK_LOG"; then
        test_pass "Health check function log group accessible"
    else
        test_fail "Health check function log group not accessible"
    fi

    # Test log insights query capability
    if aws logs start-query \
        --log-group-name "$HEALTH_CHECK_LOG" \
        --start-time $(date -d '1 hour ago' +%s) \
        --end-time $(date +%s) \
        --query-string 'fields @timestamp, @message | limit 1' \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" &> /dev/null; then
        test_pass "CloudWatch Logs Insights query capability verified"
    else
        test_fail "CloudWatch Logs Insights query failed"
    fi
else
    test_skip "CloudWatch Logs validation"
fi

# Test 3: Metric Data Retrieval
log_info "Test 3: Metric Data Retrieval"

# Test Lambda invocation metrics
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)

LAMBDA_DATA=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Invocations \
    --dimensions Name=FunctionName,Value="lego-api-serverless-$STAGE-HealthCheckFunction" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Sum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(Datapoints)' \
    --output text 2>/dev/null || echo "0")

if [[ "$LAMBDA_DATA" -gt 0 ]]; then
    test_pass "Lambda metric data retrieval successful"
else
    test_warning "No Lambda metric data found (function may not have been invoked recently)"
fi

# Test 4: IAM Role Permissions
log_info "Test 4: IAM Role Permissions Validation"

# Check if the workspace service role exists
ROLE_NAME=$(echo "$WORKSPACE_ROLE_ARN" | cut -d'/' -f2)
if aws iam get-role --role-name "$ROLE_NAME" --profile "$AWS_PROFILE" &> /dev/null; then
    test_pass "Workspace service role exists: $ROLE_NAME"

    # Check attached policies
    ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
        --role-name "$ROLE_NAME" \
        --profile "$AWS_PROFILE" \
        --query 'AttachedPolicies[].PolicyName' \
        --output text)

    if echo "$ATTACHED_POLICIES" | grep -q "cloudwatch"; then
        test_pass "CloudWatch policies attached to service role"
    else
        test_fail "CloudWatch policies not found on service role"
    fi

    if echo "$ATTACHED_POLICIES" | grep -q "logs"; then
        test_pass "CloudWatch Logs policies attached to service role"
    else
        test_fail "CloudWatch Logs policies not found on service role"
    fi
else
    test_fail "Workspace service role not found: $ROLE_NAME"
fi

# Test 5: Existing Infrastructure Compatibility
log_info "Test 5: Existing Infrastructure Compatibility"

# Check existing CloudWatch dashboard
EXISTING_DASHBOARD="LEGO-API-Serverless-$STAGE"
if aws cloudwatch get-dashboard --dashboard-name "$EXISTING_DASHBOARD" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    test_pass "Existing CloudWatch dashboard accessible: $EXISTING_DASHBOARD"
else
    test_fail "Existing CloudWatch dashboard not accessible: $EXISTING_DASHBOARD"
fi

# Check existing alarms
ALARM_COUNT=$(aws cloudwatch describe-alarms \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(MetricAlarms[?contains(AlarmName, `lego-api`)])' \
    --output text 2>/dev/null || echo "0")

if [[ "$ALARM_COUNT" -gt 0 ]]; then
    test_pass "Existing CloudWatch alarms accessible ($ALARM_COUNT alarms)"
else
    test_fail "No existing CloudWatch alarms found"
fi

# Test Summary
echo
log_info "CloudWatch Data Sources Validation Summary"
echo "  Tests Passed:   $TESTS_PASSED"
echo "  Tests Failed:   $TESTS_FAILED"
echo "  Tests Total:    $TESTS_TOTAL"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo
    log_success "All validation tests passed! ✓"
    echo
    log_info "CloudWatch data sources are ready for use in Grafana"
    echo "  Next steps:"
    echo "    1. Configure data sources in Grafana UI using provided settings"
    echo "    2. Create test dashboards with sample queries"
    echo "    3. Verify data visualization works correctly"
    exit 0
else
    echo
    log_error "Some validation tests failed! ✗"
    echo
    log_info "Please review the failed tests and resolve issues before proceeding."
    exit 1
fi
