#!/bin/bash

# Deploy Amazon Managed Grafana Workspace
# Story 2.1: Amazon Managed Grafana Workspace Provisioning
# 
# This script deploys the Grafana workspace using CloudFormation
# since SST has limited support for Amazon Managed Grafana.

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE_PATH="$PROJECT_ROOT/sst/observability/grafana-workspace.yaml"
STACK_NAME_PREFIX="user-metrics-grafana"

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
Deploy Amazon Managed Grafana Workspace

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

Environment Variables:
    STAGE                       Deployment stage
    OWNER_EMAIL                 Project owner email
    AWS_REGION                  AWS region
    AWS_PROFILE                 AWS profile

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

# Validate email format
if [[ ! "$OWNER_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    log_error "Invalid email format: $OWNER_EMAIL"
    exit 1
fi

# Set stack name
STACK_NAME="$STACK_NAME_PREFIX-$STAGE"

# Display configuration
log_info "Deployment Configuration:"
echo "  Stack Name:     $STACK_NAME"
echo "  Stage:          $STAGE"
echo "  Owner Email:    $OWNER_EMAIL"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Template:       $TEMPLATE_PATH"
echo "  Dry Run:        $DRY_RUN"
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
log_info "Checking if stack already exists..."
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
    echo "    ProjectOwnerEmail=$OWNER_EMAIL"
    echo
    log_info "Use without --dry-run to execute the deployment"
    exit 0
fi

# Deploy the stack
log_info "Deploying Grafana workspace stack..."

if [[ "$STACK_EXISTS" == "true" ]]; then
    # Update existing stack
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_PATH" \
        --parameters \
            ParameterKey=Stage,ParameterValue="$STAGE" \
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

log_success "Stack deployment initiated: $STACK_NAME"
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
    
    # Extract key values
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
    
    echo
    log_success "Grafana Workspace Deployed Successfully!"
    echo "  Workspace ID:  $WORKSPACE_ID"
    echo "  Workspace URL: $WORKSPACE_URL"
    echo
    log_info "Next Steps:"
    echo "  1. Configure workspace tier to Essential ($9/month) via AWS Console"
    echo "  2. Set up user authentication and permissions"
    echo "  3. Configure data sources (CloudWatch, Logs, OpenSearch)"
    echo "  4. Create initial dashboards"
    echo
    log_warning "Note: Essential tier must be configured manually via AWS Console"
    log_warning "CloudFormation does not support tier configuration directly"
    
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
