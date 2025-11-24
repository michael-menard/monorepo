#!/bin/bash

# Configure CloudWatch Data Sources in Grafana
# Story 2.2: CloudWatch Data Source Configuration
# 
# This script configures CloudWatch metrics and CloudWatch Logs Insights
# as data sources in the Amazon Managed Grafana workspace

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
Configure CloudWatch Data Sources in Grafana

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --dry-run                   Show configuration without applying
    -h, --help                  Show this help message

Examples:
    $0                          # Configure data sources for dev stage
    $0 -s prod                  # Configure for production
    $0 --dry-run                # Preview configuration

Prerequisites:
    - Grafana workspace must be deployed (Story 2.1)
    - Admin access to Grafana workspace
    - AWS CLI configured with appropriate permissions

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

STACK_NAME="$STACK_NAME_PREFIX-$STAGE"

log_info "Configuring CloudWatch Data Sources in Grafana"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Dry Run:        $DRY_RUN"
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
log_info "Retrieving Grafana workspace information..."
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    log_error "Grafana workspace stack not found: $STACK_NAME"
    log_error "Please deploy the workspace first using deploy-grafana-workspace.sh"
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

WORKSPACE_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceRoleArn`].OutputValue' \
    --output text)

if [[ -z "$WORKSPACE_ID" || -z "$WORKSPACE_URL" || -z "$WORKSPACE_ROLE_ARN" ]]; then
    log_error "Failed to retrieve workspace information from CloudFormation stack"
    exit 1
fi

echo "  Workspace ID:   $WORKSPACE_ID"
echo "  Workspace URL:  $WORKSPACE_URL"
echo "  Service Role:   $WORKSPACE_ROLE_ARN"
echo

# Validate workspace is active
log_info "Validating workspace status..."
WORKSPACE_STATUS=$(aws grafana describe-workspace \
    --workspace-id "$WORKSPACE_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'workspace.status' \
    --output text 2>/dev/null || echo "ERROR")

if [[ "$WORKSPACE_STATUS" != "ACTIVE" ]]; then
    log_error "Workspace is not in ACTIVE state. Current status: $WORKSPACE_STATUS"
    exit 1
fi
log_success "Workspace is active and ready for configuration"

# Create data source configuration files
log_info "Creating data source configuration files..."

# CloudWatch Metrics Data Source Configuration
cat > /tmp/cloudwatch-metrics-datasource.json << EOF
{
  "name": "CloudWatch-UserMetrics",
  "type": "cloudwatch",
  "access": "proxy",
  "isDefault": true,
  "jsonData": {
    "defaultRegion": "$AWS_REGION",
    "authType": "arn",
    "assumeRoleArn": "$WORKSPACE_ROLE_ARN",
    "externalId": "",
    "profile": "",
    "endpoint": "",
    "customMetricsNamespaces": "UserMetrics/Cost,UserMetrics/Performance",
    "namespaces": [
      "AWS/Lambda",
      "AWS/ApiGateway", 
      "AWS/CloudFront",
      "AWS/RDS",
      "AWS/ElastiCache",
      "AWS/ES"
    ]
  },
  "secureJsonData": {}
}
EOF

# CloudWatch Logs Insights Data Source Configuration
cat > /tmp/cloudwatch-logs-datasource.json << EOF
{
  "name": "CloudWatch-Logs-UserMetrics",
  "type": "cloudwatch",
  "access": "proxy",
  "isDefault": false,
  "jsonData": {
    "defaultRegion": "$AWS_REGION",
    "authType": "arn",
    "assumeRoleArn": "$WORKSPACE_ROLE_ARN",
    "externalId": "",
    "profile": "",
    "endpoint": "",
    "logsTimeout": "30s",
    "logGroups": [
      "/aws/lambda/lego-api-serverless-$STAGE-HealthCheckFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-MocInstructionsFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-UploadImageFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-ListImagesFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-SearchImagesFunction"
    ]
  },
  "secureJsonData": {}
}
EOF

log_success "Data source configuration files created"

if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN - Configuration files created:"
    echo "  CloudWatch Metrics: /tmp/cloudwatch-metrics-datasource.json"
    echo "  CloudWatch Logs: /tmp/cloudwatch-logs-datasource.json"
    echo
    log_info "CloudWatch Metrics Data Source Configuration:"
    cat /tmp/cloudwatch-metrics-datasource.json | jq '.'
    echo
    log_info "CloudWatch Logs Data Source Configuration:"
    cat /tmp/cloudwatch-logs-datasource.json | jq '.'
    echo
    log_info "Use without --dry-run to apply configuration to Grafana workspace"

    # Cleanup
    rm -f /tmp/cloudwatch-metrics-datasource.json /tmp/cloudwatch-logs-datasource.json
    exit 0
fi

# Note: Since Amazon Managed Grafana doesn't expose a direct API for data source configuration,
# we need to provide instructions for manual configuration or use Grafana's HTTP API if available

log_warning "Amazon Managed Grafana requires manual data source configuration via the web UI"
log_info "Configuration files have been created for reference"

echo
log_info "Manual Configuration Steps:"
echo "  1. Access Grafana workspace: $WORKSPACE_URL"
echo "  2. Navigate to Configuration → Data Sources"
echo "  3. Click 'Add data source'"
echo "  4. Select 'CloudWatch'"
echo "  5. Use the configuration from: /tmp/cloudwatch-metrics-datasource.json"
echo "  6. Repeat for CloudWatch Logs data source"
echo

log_info "Data Source Configuration Details:"
echo "  CloudWatch Metrics:"
echo "    - Name: CloudWatch-UserMetrics"
echo "    - Type: CloudWatch"
echo "    - Default Region: $AWS_REGION"
echo "    - Auth Type: AWS IAM Role ARN"
echo "    - Role ARN: $WORKSPACE_ROLE_ARN"
echo "    - Mark as Default: Yes"
echo
echo "  CloudWatch Logs:"
echo "    - Name: CloudWatch-Logs-UserMetrics"
echo "    - Type: CloudWatch"
echo "    - Default Region: $AWS_REGION"
echo "    - Auth Type: AWS IAM Role ARN"
echo "    - Role ARN: $WORKSPACE_ROLE_ARN"
echo "    - Mark as Default: No"
echo

# Test CloudWatch permissions
log_info "Testing CloudWatch permissions..."

# Test CloudWatch metrics access
if aws cloudwatch list-metrics --namespace AWS/Lambda --profile "$AWS_PROFILE" --region "$AWS_REGION" --max-items 1 &> /dev/null; then
    log_success "CloudWatch metrics access verified"
else
    log_error "CloudWatch metrics access failed"
fi

# Test CloudWatch logs access
if aws logs describe-log-groups --profile "$AWS_PROFILE" --region "$AWS_REGION" --max-items 1 &> /dev/null; then
    log_success "CloudWatch logs access verified"
else
    log_error "CloudWatch logs access failed"
fi

# List available log groups for reference
log_info "Available Lambda log groups:"
aws logs describe-log-groups \
    --log-group-name-prefix "/aws/lambda/lego-api-serverless-$STAGE" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'logGroups[].logGroupName' \
    --output table 2>/dev/null || log_warning "Could not list log groups"

# Cleanup temporary files
rm -f /tmp/cloudwatch-metrics-datasource.json /tmp/cloudwatch-logs-datasource.json

echo
log_success "CloudWatch data source configuration preparation complete!"
echo
log_info "Next Steps:"
echo "  1. Access the Grafana workspace using the URL above"
echo "  2. Configure the data sources manually using the provided settings"
echo "  3. Test the data sources with sample queries"
echo "  4. Run validation script: ./validate-cloudwatch-datasources.sh"
