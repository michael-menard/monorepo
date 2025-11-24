#!/bin/bash

# Validate Amazon Managed Grafana Workspace
# Story 2.1: Amazon Managed Grafana Workspace Provisioning
# 
# This script validates the deployed Grafana workspace configuration
# and tests connectivity to data sources.

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

# Help function
show_help() {
    cat << EOF
Validate Amazon Managed Grafana Workspace

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    -h, --help                  Show this help message

Examples:
    $0                          # Validate dev stage workspace
    $0 -s prod                  # Validate prod stage workspace
    $0 --stage staging --region us-west-2

EOF
}

# Parse command line arguments
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

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE. Must be one of: dev, staging, prod"
    exit 1
fi

STACK_NAME="$STACK_NAME_PREFIX-$STAGE"

log_info "Validating Grafana Workspace: $STACK_NAME"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo

# Validate AWS CLI and credentials
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed or not in PATH"
    exit 1
fi

# Test AWS credentials
log_info "Validating AWS credentials..."
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    log_error "AWS credentials validation failed. Check your profile and region."
    exit 1
fi
log_success "AWS credentials validated"

# Check if CloudFormation stack exists
log_info "Checking CloudFormation stack status..."
if ! aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" &> /dev/null; then
    log_error "CloudFormation stack $STACK_NAME not found"
    exit 1
fi

STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text)

if [[ "$STACK_STATUS" != "CREATE_COMPLETE" && "$STACK_STATUS" != "UPDATE_COMPLETE" ]]; then
    log_error "Stack is not in a complete state. Status: $STACK_STATUS"
    exit 1
fi
log_success "CloudFormation stack is in complete state: $STACK_STATUS"

# Get stack outputs
log_info "Retrieving stack outputs..."
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

WORKSPACE_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceRoleArn`].OutputValue' \
    --output text)

if [[ -z "$WORKSPACE_ID" || -z "$WORKSPACE_URL" || -z "$WORKSPACE_ROLE_ARN" ]]; then
    log_error "Failed to retrieve stack outputs"
    exit 1
fi

echo "  Workspace ID:   $WORKSPACE_ID"
echo "  Workspace URL:  $WORKSPACE_URL"
echo "  Service Role:   $WORKSPACE_ROLE_ARN"
echo

# Validate Grafana workspace exists and is active
log_info "Validating Grafana workspace status..."
WORKSPACE_STATUS=$(aws grafana describe-workspace \
    --workspace-id "$WORKSPACE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'workspace.status' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [[ "$WORKSPACE_STATUS" == "NOT_FOUND" ]]; then
    log_error "Grafana workspace not found: $WORKSPACE_ID"
    exit 1
elif [[ "$WORKSPACE_STATUS" != "ACTIVE" ]]; then
    log_warning "Grafana workspace is not active. Status: $WORKSPACE_STATUS"
else
    log_success "Grafana workspace is active"
fi

# Get workspace details
log_info "Retrieving workspace configuration..."
WORKSPACE_DETAILS=$(aws grafana describe-workspace \
    --workspace-id "$WORKSPACE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null)

if [[ $? -eq 0 ]]; then
    WORKSPACE_NAME=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.name // "N/A"')
    WORKSPACE_DESCRIPTION=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.description // "N/A"')
    WORKSPACE_ORG_ROLE=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.organizationRoleName // "N/A"')
    WORKSPACE_AUTH_PROVIDERS=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.authentication.providers[]? // "N/A"' | tr '\n' ',' | sed 's/,$//')
    WORKSPACE_DATA_SOURCES=$(echo "$WORKSPACE_DETAILS" | jq -r '.workspace.dataSources[]? // "N/A"' | tr '\n' ',' | sed 's/,$//')
    
    echo "  Name:           $WORKSPACE_NAME"
    echo "  Description:    $WORKSPACE_DESCRIPTION"
    echo "  Org Role:       $WORKSPACE_ORG_ROLE"
    echo "  Auth Providers: $WORKSPACE_AUTH_PROVIDERS"
    echo "  Data Sources:   $WORKSPACE_DATA_SOURCES"
    echo
    
    # Validate expected configuration
    EXPECTED_NAME="user-metrics-grafana-$STAGE"
    if [[ "$WORKSPACE_NAME" == "$EXPECTED_NAME" ]]; then
        log_success "Workspace name matches expected: $EXPECTED_NAME"
    else
        log_warning "Workspace name mismatch. Expected: $EXPECTED_NAME, Got: $WORKSPACE_NAME"
    fi
    
    if [[ "$WORKSPACE_ORG_ROLE" == "UserMetrics" ]]; then
        log_success "Organization role name is correct: UserMetrics"
    else
        log_warning "Organization role name mismatch. Expected: UserMetrics, Got: $WORKSPACE_ORG_ROLE"
    fi
else
    log_warning "Could not retrieve detailed workspace configuration"
fi

# Validate IAM role exists and has correct policies
log_info "Validating IAM service role..."
if aws iam get-role --role-name "user-metrics-grafana-workspace-role-$STAGE" \
    --profile "$AWS_PROFILE" &> /dev/null; then
    log_success "IAM service role exists"
    
    # Check attached policies
    ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
        --role-name "user-metrics-grafana-workspace-role-$STAGE" \
        --profile "$AWS_PROFILE" \
        --query 'AttachedPolicies[].PolicyName' \
        --output text)
    
    echo "  Attached Policies: $ATTACHED_POLICIES"
    
    # Validate expected policies
    EXPECTED_POLICIES=("user-metrics-grafana-cloudwatch-policy-$STAGE" "user-metrics-grafana-logs-policy-$STAGE" "user-metrics-grafana-opensearch-policy-$STAGE")
    for policy in "${EXPECTED_POLICIES[@]}"; do
        if echo "$ATTACHED_POLICIES" | grep -q "$policy"; then
            log_success "Policy attached: $policy"
        else
            log_warning "Policy not attached: $policy"
        fi
    done
else
    log_error "IAM service role not found"
fi

# Test workspace URL accessibility (basic connectivity)
log_info "Testing workspace URL accessibility..."
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$WORKSPACE_URL" || echo "000")
    if [[ "$HTTP_STATUS" =~ ^[23] ]]; then
        log_success "Workspace URL is accessible (HTTP $HTTP_STATUS)"
    elif [[ "$HTTP_STATUS" == "401" || "$HTTP_STATUS" == "403" ]]; then
        log_success "Workspace URL is accessible but requires authentication (HTTP $HTTP_STATUS)"
    else
        log_warning "Workspace URL returned HTTP $HTTP_STATUS"
    fi
else
    log_warning "curl not available, skipping URL accessibility test"
fi

# Check workspace tags
log_info "Validating workspace tags..."
WORKSPACE_TAGS=$(aws grafana list-tags-for-resource \
    --resource-arn "arn:aws:grafana:$AWS_REGION:$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text):workspace/$WORKSPACE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"tags":{}}')

if [[ $? -eq 0 ]]; then
    PROJECT_TAG=$(echo "$WORKSPACE_TAGS" | jq -r '.tags.Project // "MISSING"')
    ENVIRONMENT_TAG=$(echo "$WORKSPACE_TAGS" | jq -r '.tags.Environment // "MISSING"')
    COMPONENT_TAG=$(echo "$WORKSPACE_TAGS" | jq -r '.tags.Component // "MISSING"')
    
    echo "  Project:        $PROJECT_TAG"
    echo "  Environment:    $ENVIRONMENT_TAG"
    echo "  Component:      $COMPONENT_TAG"
    
    if [[ "$PROJECT_TAG" == "UserMetrics" ]]; then
        log_success "Project tag is correct"
    else
        log_warning "Project tag mismatch. Expected: UserMetrics, Got: $PROJECT_TAG"
    fi
    
    if [[ "$ENVIRONMENT_TAG" == "$STAGE" ]]; then
        log_success "Environment tag is correct"
    else
        log_warning "Environment tag mismatch. Expected: $STAGE, Got: $ENVIRONMENT_TAG"
    fi
else
    log_warning "Could not retrieve workspace tags"
fi

echo
log_success "Grafana Workspace Validation Complete!"
echo
log_info "Manual Steps Required:"
echo "  1. Configure workspace tier to Essential ($9/month) via AWS Console"
echo "  2. Set up user authentication and assign roles"
echo "  3. Configure data sources (CloudWatch, Logs)"
echo "  4. Create initial dashboards"
echo
log_info "Access your workspace at: $WORKSPACE_URL"
