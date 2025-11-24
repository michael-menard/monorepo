#!/bin/bash

# Deploy Amazon Managed Grafana User Policies and Roles
# Story 2.1: Amazon Managed Grafana Workspace Provisioning - Task 2
# 
# This script deploys IAM policies and roles for user access to the Grafana workspace

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE_PATH="$PROJECT_ROOT/sst/observability/grafana-user-policies.yaml"
STACK_NAME_PREFIX="user-metrics-grafana-users"
WORKSPACE_STACK_PREFIX="user-metrics-grafana"

# Default values
STAGE="${STAGE:-dev}"
OWNER_EMAIL="${OWNER_EMAIL:-engineering@example.com}"
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
Deploy Amazon Managed Grafana User Policies and Roles

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -e, --email EMAIL           Project owner email [default: engineering@example.com]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --dry-run                   Show what would be deployed without executing
    -h, --help                  Show this help message

Examples:
    $0                          # Deploy to dev stage with defaults
    $0 -s prod -e admin@company.com
    $0 --stage staging --region us-west-2
    $0 --dry-run                # Preview deployment

Prerequisites:
    - Grafana workspace must be deployed first
    - Run deploy-grafana-workspace.sh before this script

EOF
}

# Parse command line arguments
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--stage)
            STAGE="$2"
            shift 2
            ;;
        -e|--email)
            OWNER_EMAIL="$2"
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
        --dry-run)
            DRY_RUN=true
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

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE. Must be one of: dev, staging, prod"
    exit 1
fi

# Set stack names
STACK_NAME="$STACK_NAME_PREFIX-$STAGE"
WORKSPACE_STACK_NAME="$WORKSPACE_STACK_PREFIX-$STAGE"

# Display configuration
log_info "Deployment Configuration:"
echo "  Stack Name:         $STACK_NAME"
echo "  Workspace Stack:    $WORKSPACE_STACK_NAME"
echo "  Stage:              $STAGE"
echo "  Owner Email:        $OWNER_EMAIL"
echo "  AWS Region:         $AWS_REGION"
echo "  AWS Profile:        $AWS_PROFILE"
echo "  Template:           $TEMPLATE_PATH"
echo "  Dry Run:            $DRY_RUN"
echo

# Validate template exists
if [[ ! -f "$TEMPLATE_PATH" ]]; then
    log_error "CloudFormation template not found: $TEMPLATE_PATH"
    exit 1
fi

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

ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION" --query Account --output text)
log_success "AWS credentials validated. Account ID: $ACCOUNT_ID"

# Check if workspace stack exists and get workspace ID
log_info "Checking for existing Grafana workspace..."
if ! aws cloudformation describe-stacks \
    --stack-name "$WORKSPACE_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" &> /dev/null; then
    log_error "Grafana workspace stack not found: $WORKSPACE_STACK_NAME"
    log_error "Please deploy the workspace first using deploy-grafana-workspace.sh"
    exit 1
fi

WORKSPACE_ID=$(aws cloudformation describe-stacks \
    --stack-name "$WORKSPACE_STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceId`].OutputValue' \
    --output text)

if [[ -z "$WORKSPACE_ID" ]]; then
    log_error "Could not retrieve workspace ID from stack: $WORKSPACE_STACK_NAME"
    exit 1
fi

log_success "Found Grafana workspace: $WORKSPACE_ID"

# Validate CloudFormation template
log_info "Validating CloudFormation template..."
if ! aws cloudformation validate-template \
    --template-body "file://$TEMPLATE_PATH" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" &> /dev/null; then
    log_error "CloudFormation template validation failed"
    exit 1
fi
log_success "CloudFormation template is valid"

# Check if stack already exists
log_info "Checking if user policies stack already exists..."
if aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" &> /dev/null; then
    STACK_EXISTS=true
    OPERATION="update"
    log_warning "Stack $STACK_NAME already exists. Will perform update operation."
else
    STACK_EXISTS=false
    OPERATION="create"
    log_info "Stack $STACK_NAME does not exist. Will perform create operation."
fi

# Dry run - show what would be deployed
if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN - Would execute the following:"
    echo "  Operation: $OPERATION stack"
    echo "  Parameters:"
    echo "    Stage=$STAGE"
    echo "    WorkspaceId=$WORKSPACE_ID"
    echo "    ProjectOwnerEmail=$OWNER_EMAIL"
    echo
    log_info "Use without --dry-run to execute the deployment"
    exit 0
fi

# Deploy the stack
log_info "Deploying Grafana user policies stack..."

if [[ "$STACK_EXISTS" == "true" ]]; then
    # Update existing stack
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_PATH" \
        --parameters \
            ParameterKey=Stage,ParameterValue="$STAGE" \
            ParameterKey=WorkspaceId,ParameterValue="$WORKSPACE_ID" \
            ParameterKey=ProjectOwnerEmail,ParameterValue="$OWNER_EMAIL" \
        --capabilities CAPABILITY_NAMED_IAM \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --tags \
            Key=Project,Value=UserMetrics \
            Key=Environment,Value="$STAGE" \
            Key=ManagedBy,Value=CloudFormation \
            Key=CostCenter,Value=Observability \
            Key=Owner,Value="$OWNER_EMAIL"
else
    # Create new stack
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_PATH" \
        --parameters \
            ParameterKey=Stage,ParameterValue="$STAGE" \
            ParameterKey=WorkspaceId,ParameterValue="$WORKSPACE_ID" \
            ParameterKey=ProjectOwnerEmail,ParameterValue="$OWNER_EMAIL" \
        --capabilities CAPABILITY_NAMED_IAM \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --tags \
            Key=Project,Value=UserMetrics \
            Key=Environment,Value="$STAGE" \
            Key=ManagedBy,Value=CloudFormation \
            Key=CostCenter,Value=Observability \
            Key=Owner,Value="$OWNER_EMAIL"
fi

log_success "User policies stack deployment initiated: $STACK_NAME"
log_info "Waiting for stack $OPERATION to complete..."

# Wait for stack operation to complete
aws cloudformation wait "stack-${OPERATION}-complete" \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION"

if [[ $? -eq 0 ]]; then
    log_success "Stack $OPERATION completed successfully!"
    
    # Get stack outputs
    log_info "Retrieving stack outputs..."
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs' \
        --output table)
    
    echo "$OUTPUTS"
    
    echo
    log_success "Grafana User Policies Deployed Successfully!"
    echo
    log_info "Created Resources:"
    echo "  - Admin Policy: user-metrics-grafana-admin-policy-$STAGE"
    echo "  - Viewer Policy: user-metrics-grafana-viewer-policy-$STAGE"
    echo "  - Admin Role: user-metrics-grafana-admin-role-$STAGE"
    echo "  - Viewer Role: user-metrics-grafana-viewer-role-$STAGE"
    echo "  - Project Owner User: user-metrics-grafana-admin-$STAGE"
    echo "  - Engineering Group: user-metrics-grafana-engineering-$STAGE"
    echo "  - Product Group: user-metrics-grafana-product-$STAGE"
    echo "  - CS Group: user-metrics-grafana-cs-$STAGE"
    echo
    log_info "Next Steps:"
    echo "  1. Add team members to appropriate IAM groups"
    echo "  2. Configure workspace authentication in AWS Console"
    echo "  3. Test user access to the workspace"
    echo "  4. Set up data sources and create dashboards"
    
else
    log_error "Stack $OPERATION failed!"
    
    # Get stack events for debugging
    log_info "Recent stack events:"
    aws cloudformation describe-stack-events \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'StackEvents[0:10].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId,ResourceStatusReason]' \
        --output table
    
    exit 1
fi
