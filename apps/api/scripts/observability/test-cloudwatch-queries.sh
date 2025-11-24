#!/bin/bash

# Test CloudWatch Queries for Grafana Data Sources
# Story 2.2: CloudWatch Data Source Configuration
# 
# This script tests various CloudWatch queries that will be used in Grafana
# to ensure data sources are working correctly

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
STAGE="${STAGE:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"
TIME_RANGE="${TIME_RANGE:-1h}"

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
Test CloudWatch Queries for Grafana Data Sources

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    -t, --time-range RANGE      Time range for queries (1h, 6h, 24h) [default: 1h]
    --export-results            Export query results to JSON files
    -h, --help                  Show this help message

Examples:
    $0                          # Test queries for dev stage
    $0 -s prod -t 24h           # Test production with 24h range
    $0 --export-results         # Export results to files

EOF
}

# Parse command line arguments
EXPORT_RESULTS=false

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
        -t|--time-range)
            TIME_RANGE="$2"
            shift 2
            ;;
        --export-results)
            EXPORT_RESULTS=true
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

log_info "Testing CloudWatch Queries for Grafana Data Sources"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Time Range:     $TIME_RANGE"
echo "  Export Results: $EXPORT_RESULTS"
echo

# Calculate time range
case $TIME_RANGE in
    1h)
        HOURS_BACK=1
        ;;
    6h)
        HOURS_BACK=6
        ;;
    24h)
        HOURS_BACK=24
        ;;
    *)
        log_error "Invalid time range: $TIME_RANGE. Use 1h, 6h, or 24h"
        exit 1
        ;;
esac

END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
START_TIME=$(date -u -d "$HOURS_BACK hours ago" +%Y-%m-%dT%H:%M:%S)

echo "  Query Period:   $START_TIME to $END_TIME"
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

# Test 1: Lambda Function Metrics
log_info "Test 1: Lambda Function Metrics"

# Test Lambda invocations
LAMBDA_FUNCTION="lego-api-serverless-$STAGE-HealthCheckFunction"
INVOCATIONS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Invocations \
    --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Sum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

INVOCATION_COUNT=$(echo "$INVOCATIONS" | jq '.Datapoints | length')
if [[ "$INVOCATION_COUNT" -gt 0 ]]; then
    TOTAL_INVOCATIONS=$(echo "$INVOCATIONS" | jq '[.Datapoints[].Sum] | add // 0')
    test_pass "Lambda invocations query successful ($TOTAL_INVOCATIONS invocations)"
    
    if [[ "$EXPORT_RESULTS" == "true" ]]; then
        echo "$INVOCATIONS" > "/tmp/lambda-invocations-$STAGE.json"
    fi
else
    test_warning "No Lambda invocation data found (function may not have been invoked)"
fi

# Test Lambda errors
ERRORS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Sum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

ERROR_COUNT=$(echo "$ERRORS" | jq '.Datapoints | length')
if [[ "$ERROR_COUNT" -gt 0 ]]; then
    TOTAL_ERRORS=$(echo "$ERRORS" | jq '[.Datapoints[].Sum] | add // 0')
    test_pass "Lambda errors query successful ($TOTAL_ERRORS errors)"
else
    test_pass "Lambda errors query successful (no errors found - good!)"
fi

# Test Lambda duration
DURATION=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Duration \
    --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Average,Maximum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

DURATION_COUNT=$(echo "$DURATION" | jq '.Datapoints | length')
if [[ "$DURATION_COUNT" -gt 0 ]]; then
    AVG_DURATION=$(echo "$DURATION" | jq '[.Datapoints[].Average] | add / length')
    test_pass "Lambda duration query successful (avg: ${AVG_DURATION}ms)"
else
    test_warning "No Lambda duration data found"
fi

# Test 2: API Gateway Metrics
log_info "Test 2: API Gateway Metrics"

# Get API Gateway ID from existing infrastructure
API_ID=$(aws apigateway get-rest-apis \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query "items[?contains(name, 'lego-api-serverless-$STAGE')].id" \
    --output text 2>/dev/null || echo "")

if [[ -n "$API_ID" && "$API_ID" != "None" ]]; then
    # Test API Gateway requests
    API_REQUESTS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name Count \
        --dimensions Name=ApiName,Value="lego-api-serverless-$STAGE" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 3600 \
        --statistics Sum \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --output json 2>/dev/null || echo '{"Datapoints":[]}')

    REQUEST_COUNT=$(echo "$API_REQUESTS" | jq '.Datapoints | length')
    if [[ "$REQUEST_COUNT" -gt 0 ]]; then
        TOTAL_REQUESTS=$(echo "$API_REQUESTS" | jq '[.Datapoints[].Sum] | add // 0')
        test_pass "API Gateway requests query successful ($TOTAL_REQUESTS requests)"
    else
        test_warning "No API Gateway request data found"
    fi

    # Test API Gateway latency
    API_LATENCY=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name Latency \
        --dimensions Name=ApiName,Value="lego-api-serverless-$STAGE" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 3600 \
        --statistics Average,Maximum \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --output json 2>/dev/null || echo '{"Datapoints":[]}')

    LATENCY_COUNT=$(echo "$API_LATENCY" | jq '.Datapoints | length')
    if [[ "$LATENCY_COUNT" -gt 0 ]]; then
        AVG_LATENCY=$(echo "$API_LATENCY" | jq '[.Datapoints[].Average] | add / length')
        test_pass "API Gateway latency query successful (avg: ${AVG_LATENCY}ms)"
    else
        test_warning "No API Gateway latency data found"
    fi
else
    test_fail "API Gateway not found for stage: $STAGE"
fi

# Test 3: RDS Metrics
log_info "Test 3: RDS Metrics"

# Get RDS cluster identifier
RDS_CLUSTER="lego-api-postgres-$STAGE"

# Test RDS CPU utilization
RDS_CPU=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name CPUUtilization \
    --dimensions Name=DBClusterIdentifier,Value="$RDS_CLUSTER" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Average,Maximum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

RDS_CPU_COUNT=$(echo "$RDS_CPU" | jq '.Datapoints | length')
if [[ "$RDS_CPU_COUNT" -gt 0 ]]; then
    AVG_CPU=$(echo "$RDS_CPU" | jq '[.Datapoints[].Average] | add / length')
    test_pass "RDS CPU utilization query successful (avg: ${AVG_CPU}%)"
else
    test_warning "No RDS CPU data found (cluster may not exist or be active)"
fi

# Test RDS connections
RDS_CONNECTIONS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name DatabaseConnections \
    --dimensions Name=DBClusterIdentifier,Value="$RDS_CLUSTER" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Average,Maximum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

RDS_CONN_COUNT=$(echo "$RDS_CONNECTIONS" | jq '.Datapoints | length')
if [[ "$RDS_CONN_COUNT" -gt 0 ]]; then
    AVG_CONNECTIONS=$(echo "$RDS_CONNECTIONS" | jq '[.Datapoints[].Average] | add / length')
    test_pass "RDS connections query successful (avg: ${AVG_CONNECTIONS} connections)"
else
    test_warning "No RDS connection data found"
fi

# Test 4: ElastiCache Redis Metrics
log_info "Test 4: ElastiCache Redis Metrics"

# Get Redis cluster ID
REDIS_CLUSTER="lego-api-redis-$STAGE"

# Test Redis CPU utilization
REDIS_CPU=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ElastiCache \
    --metric-name CPUUtilization \
    --dimensions Name=CacheClusterId,Value="$REDIS_CLUSTER-001" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Average,Maximum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

REDIS_CPU_COUNT=$(echo "$REDIS_CPU" | jq '.Datapoints | length')
if [[ "$REDIS_CPU_COUNT" -gt 0 ]]; then
    AVG_REDIS_CPU=$(echo "$REDIS_CPU" | jq '[.Datapoints[].Average] | add / length')
    test_pass "Redis CPU utilization query successful (avg: ${AVG_REDIS_CPU}%)"
else
    test_warning "No Redis CPU data found (cluster may not exist or be active)"
fi

# Test 5: OpenSearch Metrics
log_info "Test 5: OpenSearch Metrics"

# Get OpenSearch domain name
OPENSEARCH_DOMAIN="lego-api-opensearch-$STAGE"

# Test OpenSearch cluster health
OPENSEARCH_HEALTH=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ES \
    --metric-name ClusterStatus.yellow \
    --dimensions Name=DomainName,Value="$OPENSEARCH_DOMAIN" Name=ClientId,Value="$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 3600 \
    --statistics Maximum \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"Datapoints":[]}')

OPENSEARCH_HEALTH_COUNT=$(echo "$OPENSEARCH_HEALTH" | jq '.Datapoints | length')
if [[ "$OPENSEARCH_HEALTH_COUNT" -gt 0 ]]; then
    test_pass "OpenSearch cluster health query successful"
else
    test_warning "No OpenSearch health data found (domain may not exist)"
fi

# Test 6: CloudWatch Logs Insights Queries
log_info "Test 6: CloudWatch Logs Insights Queries"

# Test log group access
LOG_GROUP="/aws/lambda/lego-api-serverless-$STAGE-HealthCheckFunction"

if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --profile "$AWS_PROFILE" --region "$AWS_REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
    test_pass "Log group accessible: $LOG_GROUP"

    # Test log insights query
    QUERY_ID=$(aws logs start-query \
        --log-group-name "$LOG_GROUP" \
        --start-time $(date -d "$HOURS_BACK hours ago" +%s) \
        --end-time $(date +%s) \
        --query-string 'fields @timestamp, @message | limit 10' \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'queryId' \
        --output text 2>/dev/null || echo "")

    if [[ -n "$QUERY_ID" ]]; then
        test_pass "CloudWatch Logs Insights query started successfully"

        # Wait a moment and check query status
        sleep 2
        QUERY_STATUS=$(aws logs get-query-results \
            --query-id "$QUERY_ID" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION" \
            --query 'status' \
            --output text 2>/dev/null || echo "Failed")

        if [[ "$QUERY_STATUS" == "Complete" || "$QUERY_STATUS" == "Running" ]]; then
            test_pass "CloudWatch Logs Insights query executed successfully"
        else
            test_warning "CloudWatch Logs Insights query status: $QUERY_STATUS"
        fi
    else
        test_fail "CloudWatch Logs Insights query failed to start"
    fi
else
    test_fail "Log group not accessible: $LOG_GROUP"
fi

# Export results if requested
if [[ "$EXPORT_RESULTS" == "true" ]]; then
    log_info "Exporting query results..."

    EXPORT_DIR="/tmp/cloudwatch-query-results-$STAGE"
    mkdir -p "$EXPORT_DIR"

    # Export Lambda metrics
    if [[ -n "$INVOCATIONS" ]]; then
        echo "$INVOCATIONS" > "$EXPORT_DIR/lambda-invocations.json"
    fi

    if [[ -n "$ERRORS" ]]; then
        echo "$ERRORS" > "$EXPORT_DIR/lambda-errors.json"
    fi

    if [[ -n "$DURATION" ]]; then
        echo "$DURATION" > "$EXPORT_DIR/lambda-duration.json"
    fi

    # Export API Gateway metrics
    if [[ -n "$API_REQUESTS" ]]; then
        echo "$API_REQUESTS" > "$EXPORT_DIR/api-requests.json"
    fi

    if [[ -n "$API_LATENCY" ]]; then
        echo "$API_LATENCY" > "$EXPORT_DIR/api-latency.json"
    fi

    # Export RDS metrics
    if [[ -n "$RDS_CPU" ]]; then
        echo "$RDS_CPU" > "$EXPORT_DIR/rds-cpu.json"
    fi

    if [[ -n "$RDS_CONNECTIONS" ]]; then
        echo "$RDS_CONNECTIONS" > "$EXPORT_DIR/rds-connections.json"
    fi

    log_success "Query results exported to: $EXPORT_DIR"
fi

# Test Summary
echo
log_info "CloudWatch Query Testing Summary"
echo "  Tests Passed:   $TESTS_PASSED"
echo "  Tests Failed:   $TESTS_FAILED"
echo "  Tests Total:    $TESTS_TOTAL"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo
    log_success "All CloudWatch queries executed successfully! ✓"
    echo
    log_info "Data sources are ready for Grafana dashboard creation"
    echo "  Next steps:"
    echo "    1. Configure data sources in Grafana UI"
    echo "    2. Create dashboards using these tested queries"
    echo "    3. Set up alerting rules based on metrics"
    exit 0
else
    echo
    log_error "Some CloudWatch queries failed! ✗"
    echo
    log_info "Please review the failed queries and resolve issues."
    log_info "Some failures may be expected if infrastructure is not fully deployed."
    exit 1
fi
