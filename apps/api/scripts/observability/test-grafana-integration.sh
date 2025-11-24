#!/bin/bash

# Integration Tests for Amazon Managed Grafana Workspace
# Story 2.1: Amazon Managed Grafana Workspace Provisioning - Task 5
# 
# This script performs comprehensive integration testing of the deployed
# Grafana workspace to ensure it doesn't interfere with existing infrastructure

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
Integration Tests for Amazon Managed Grafana Workspace

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --skip-network              Skip network connectivity tests
    --skip-existing             Skip existing infrastructure tests
    -h, --help                  Show this help message

Examples:
    $0                          # Run all integration tests for dev
    $0 -s prod                  # Run tests for production
    $0 --skip-network           # Skip network tests

EOF
}

# Parse command line arguments
SKIP_NETWORK=false
SKIP_EXISTING=false

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
        --skip-network)
            SKIP_NETWORK=true
            shift
            ;;
        --skip-existing)
            SKIP_EXISTING=true
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

log_info "Starting Grafana Workspace Integration Tests"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Skip Network:   $SKIP_NETWORK"
echo "  Skip Existing:  $SKIP_EXISTING"
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

WORKSPACE_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceId`].OutputValue' \
    --output text)

WORKSPACE_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceEndpoint`].OutputValue' \
    --output text)

echo "  Workspace ID:   $WORKSPACE_ID"
echo "  Workspace URL:  $WORKSPACE_URL"
echo

# Test 1: Workspace Status
log_info "Test 1: Workspace Status and Configuration"
WORKSPACE_STATUS=$(aws grafana describe-workspace \
    --workspace-id "$WORKSPACE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'workspace.status' \
    --output text 2>/dev/null || echo "ERROR")

if [[ "$WORKSPACE_STATUS" == "ACTIVE" ]]; then
    test_pass "Workspace is in ACTIVE state"
else
    test_fail "Workspace status is $WORKSPACE_STATUS (expected ACTIVE)"
fi

# Test 2: Workspace Configuration
log_info "Test 2: Workspace Configuration Validation"
WORKSPACE_DETAILS=$(aws grafana describe-workspace \
    --workspace-id "$WORKSPACE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null)

if [[ $? -eq 0 ]]; then
    WORKSPACE_NAME=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.name // "N/A"')
    WORKSPACE_ORG_ROLE=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.organizationRoleName // "N/A"')
    
    EXPECTED_NAME="user-metrics-grafana-$STAGE"
    if [[ "$WORKSPACE_NAME" == "$EXPECTED_NAME" ]]; then
        test_pass "Workspace name is correct: $EXPECTED_NAME"
    else
        test_fail "Workspace name mismatch: expected $EXPECTED_NAME, got $WORKSPACE_NAME"
    fi
    
    if [[ "$WORKSPACE_ORG_ROLE" == "UserMetrics" ]]; then
        test_pass "Organization role name is correct: UserMetrics"
    else
        test_fail "Organization role mismatch: expected UserMetrics, got $WORKSPACE_ORG_ROLE"
    fi
else
    test_fail "Could not retrieve workspace configuration"
fi

# Test 3: IAM Service Role
log_info "Test 3: IAM Service Role Validation"
SERVICE_ROLE_NAME="user-metrics-grafana-workspace-role-$STAGE"
if aws iam get-role --role-name "$SERVICE_ROLE_NAME" --profile "$AWS_PROFILE" &> /dev/null; then
    test_pass "IAM service role exists: $SERVICE_ROLE_NAME"
    
    # Check attached policies
    ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
        --role-name "$SERVICE_ROLE_NAME" \
        --profile "$AWS_PROFILE" \
        --query 'AttachedPolicies[].PolicyName' \
        --output text)
    
    EXPECTED_POLICIES=("user-metrics-grafana-cloudwatch-policy-$STAGE" "user-metrics-grafana-logs-policy-$STAGE" "user-metrics-grafana-opensearch-policy-$STAGE")
    for policy in "${EXPECTED_POLICIES[@]}"; do
        if echo "$ATTACHED_POLICIES" | grep -q "$policy"; then
            test_pass "Policy attached: $policy"
        else
            test_fail "Policy not attached: $policy"
        fi
    done
else
    test_fail "IAM service role not found: $SERVICE_ROLE_NAME"
fi

# Test 4: User Access Policies
log_info "Test 4: User Access Policies Validation"
USER_STACK_NAME="user-metrics-grafana-users-$STAGE"
if aws cloudformation describe-stacks --stack-name "$USER_STACK_NAME" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    test_pass "User policies stack exists: $USER_STACK_NAME"
    
    # Check IAM groups
    EXPECTED_GROUPS=("user-metrics-grafana-engineering-$STAGE" "user-metrics-grafana-product-$STAGE" "user-metrics-grafana-cs-$STAGE")
    for group in "${EXPECTED_GROUPS[@]}"; do
        if aws iam get-group --group-name "$group" --profile "$AWS_PROFILE" &> /dev/null; then
            test_pass "IAM group exists: $group"
        else
            test_fail "IAM group not found: $group"
        fi
    done
else
    test_fail "User policies stack not found: $USER_STACK_NAME"
fi

# Test 5: Network Connectivity
if [[ "$SKIP_NETWORK" == "false" ]]; then
    log_info "Test 5: Network Connectivity"
    if command -v curl &> /dev/null; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$WORKSPACE_URL" || echo "000")
        if [[ "$HTTP_STATUS" =~ ^[23] ]] || [[ "$HTTP_STATUS" == "401" ]] || [[ "$HTTP_STATUS" == "403" ]]; then
            test_pass "Workspace URL is accessible (HTTP $HTTP_STATUS)"
        else
            test_fail "Workspace URL returned HTTP $HTTP_STATUS"
        fi
    else
        test_skip "Network connectivity test - curl not available"
    fi
else
    test_skip "Network connectivity tests"
fi

# Test 6: Existing Infrastructure Compatibility
if [[ "$SKIP_EXISTING" == "false" ]]; then
    log_info "Test 6: Existing Infrastructure Compatibility"

    # Test existing CloudWatch dashboard
    EXISTING_DASHBOARD="LEGO-API-Serverless-$STAGE"
    if aws cloudwatch get-dashboard --dashboard-name "$EXISTING_DASHBOARD" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
        test_pass "Existing CloudWatch dashboard accessible: $EXISTING_DASHBOARD"
    else
        test_fail "Existing CloudWatch dashboard not accessible: $EXISTING_DASHBOARD"
    fi

    # Test existing CloudWatch alarms
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

    # Test existing OpenSearch domain
    OPENSEARCH_DOMAIN="lego-api-opensearch-$STAGE"
    if aws opensearch describe-domain --domain-name "$OPENSEARCH_DOMAIN" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
        test_pass "Existing OpenSearch domain accessible: $OPENSEARCH_DOMAIN"
    else
        test_warning "OpenSearch domain not found: $OPENSEARCH_DOMAIN (may not be deployed yet)"
    fi
else
    test_skip "Existing infrastructure compatibility tests"
fi

# Test 7: AWS Service Quotas
log_info "Test 7: AWS Service Quotas and Limits"

# Check Grafana workspace quota
GRAFANA_WORKSPACES=$(aws grafana list-workspaces \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'length(workspaces)' \
    --output text 2>/dev/null || echo "0")

if [[ "$GRAFANA_WORKSPACES" -le 5 ]]; then
    test_pass "Grafana workspace quota OK ($GRAFANA_WORKSPACES/5 workspaces)"
else
    test_warning "Grafana workspace quota approaching limit ($GRAFANA_WORKSPACES/5 workspaces)"
fi

# Check CloudWatch API quotas (basic check)
if aws cloudwatch list-metrics --max-items 1 --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    test_pass "CloudWatch API accessible"
else
    test_fail "CloudWatch API not accessible"
fi

# Test 8: Workspace Tags
log_info "Test 8: Workspace Tagging Validation"
WORKSPACE_ARN="arn:aws:grafana:$AWS_REGION:$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text):workspace/$WORKSPACE_ID"
WORKSPACE_TAGS=$(aws grafana list-tags-for-resource \
    --resource-arn "$WORKSPACE_ARN" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"tags":{}}')

if [[ $? -eq 0 ]]; then
    PROJECT_TAG=$(echo "$WORKSPACE_TAGS" | jq -r '.tags.Project // "MISSING"')
    ENVIRONMENT_TAG=$(echo "$WORKSPACE_TAGS" | jq -r '.tags.Environment // "MISSING"')
    COMPONENT_TAG=$(echo "$WORKSPACE_TAGS" | jq -r '.tags.Component // "MISSING"')

    if [[ "$PROJECT_TAG" == "UserMetrics" ]]; then
        test_pass "Project tag is correct: UserMetrics"
    else
        test_fail "Project tag incorrect: expected UserMetrics, got $PROJECT_TAG"
    fi

    if [[ "$ENVIRONMENT_TAG" == "$STAGE" ]]; then
        test_pass "Environment tag is correct: $STAGE"
    else
        test_fail "Environment tag incorrect: expected $STAGE, got $ENVIRONMENT_TAG"
    fi

    if [[ "$COMPONENT_TAG" == "Grafana" ]]; then
        test_pass "Component tag is correct: Grafana"
    else
        test_fail "Component tag incorrect: expected Grafana, got $COMPONENT_TAG"
    fi
else
    test_fail "Could not retrieve workspace tags"
fi

# Test Summary
echo
log_info "Integration Test Summary"
echo "  Tests Passed:   $TESTS_PASSED"
echo "  Tests Failed:   $TESTS_FAILED"
echo "  Tests Total:    $TESTS_TOTAL"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo
    log_success "All integration tests passed! ✓"
    echo
    log_info "Grafana workspace is ready for use:"
    echo "  Workspace URL: $WORKSPACE_URL"
    echo "  Next steps:"
    echo "    1. Configure Essential tier in AWS Console"
    echo "    2. Add team members to IAM groups"
    echo "    3. Create initial dashboards"
    echo "    4. Set up alerting rules"
    exit 0
else
    echo
    log_error "Some integration tests failed! ✗"
    echo
    log_info "Please review the failed tests and resolve issues before proceeding."
    exit 1
fi
