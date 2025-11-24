#!/bin/bash

# Import Grafana Dashboards
# Story 2.2: CloudWatch Data Source Configuration
# 
# This script provides instructions and templates for importing
# pre-configured dashboards into the Grafana workspace

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DASHBOARDS_DIR="$PROJECT_ROOT/sst/observability/grafana-dashboards"

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
Import Grafana Dashboards

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --list-dashboards           List available dashboard templates
    -h, --help                  Show this help message

Examples:
    $0                          # Show import instructions for dev stage
    $0 --list-dashboards        # List available dashboard templates
    $0 -s prod                  # Show instructions for production

Prerequisites:
    - Grafana workspace deployed and accessible
    - CloudWatch data sources configured
    - Admin access to Grafana workspace

EOF
}

# Parse command line arguments
LIST_DASHBOARDS=false

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
        --list-dashboards)
            LIST_DASHBOARDS=true
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

log_info "Grafana Dashboard Import Helper"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Dashboards Dir: $DASHBOARDS_DIR"
echo

# List available dashboards
if [[ "$LIST_DASHBOARDS" == "true" ]]; then
    log_info "Available Dashboard Templates:"
    
    if [[ -d "$DASHBOARDS_DIR" ]]; then
        for dashboard in "$DASHBOARDS_DIR"/*.json; do
            if [[ -f "$dashboard" ]]; then
                DASHBOARD_NAME=$(basename "$dashboard" .json)
                DASHBOARD_TITLE=$(jq -r '.dashboard.title // "Unknown"' "$dashboard" 2>/dev/null || echo "Unknown")
                echo "  - $DASHBOARD_NAME"
                echo "    Title: $DASHBOARD_TITLE"
                echo "    File: $dashboard"
                echo
            fi
        done
    else
        log_warning "Dashboard templates directory not found: $DASHBOARDS_DIR"
    fi
    exit 0
fi

# Get workspace information
STACK_NAME="user-metrics-grafana-$STAGE"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
    WORKSPACE_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`WorkspaceEndpoint`].OutputValue' \
        --output text)
    
    echo "  Workspace URL:  $WORKSPACE_URL"
else
    log_warning "Grafana workspace stack not found: $STACK_NAME"
    log_warning "Dashboard import instructions will be generic"
fi

echo

# Validate dashboard templates exist
if [[ ! -d "$DASHBOARDS_DIR" ]]; then
    log_error "Dashboard templates directory not found: $DASHBOARDS_DIR"
    exit 1
fi

DASHBOARD_COUNT=$(find "$DASHBOARDS_DIR" -name "*.json" | wc -l)
if [[ "$DASHBOARD_COUNT" -eq 0 ]]; then
    log_error "No dashboard templates found in: $DASHBOARDS_DIR"
    exit 1
fi

log_success "Found $DASHBOARD_COUNT dashboard template(s)"

# Display import instructions
log_info "Dashboard Import Instructions:"
echo
echo "1. **Access Grafana Workspace:**"
if [[ -n "$WORKSPACE_URL" ]]; then
    echo "   Open: $WORKSPACE_URL"
else
    echo "   Open your Grafana workspace URL"
fi
echo
echo "2. **Navigate to Dashboard Import:**"
echo "   - Click the '+' icon in the left sidebar"
echo "   - Select 'Import'"
echo "   - Or go to: Dashboards → Browse → Import"
echo
echo "3. **Import Dashboard Templates:**"
echo

# List each dashboard with import instructions
for dashboard in "$DASHBOARDS_DIR"/*.json; do
    if [[ -f "$dashboard" ]]; then
        DASHBOARD_NAME=$(basename "$dashboard" .json)
        DASHBOARD_TITLE=$(jq -r '.dashboard.title // "Unknown"' "$dashboard" 2>/dev/null || echo "Unknown")
        
        echo "   **$DASHBOARD_TITLE**"
        echo "   - Copy the contents of: $dashboard"
        echo "   - Paste into the 'Import via panel json' text area"
        echo "   - Click 'Load'"
        echo "   - Verify data source is set to 'CloudWatch-UserMetrics'"
        echo "   - Update the 'stage' variable to '$STAGE' if needed"
        echo "   - Click 'Import'"
        echo
    fi
done

echo "4. **Verify Dashboard Functionality:**"
echo "   - Check that all panels are displaying data"
echo "   - Verify template variables are working correctly"
echo "   - Test different time ranges"
echo "   - Ensure data sources are connected properly"
echo

# Display dashboard customization tips
log_info "Dashboard Customization Tips:"
echo
echo "- **Template Variables:**"
echo "  - Update the 'stage' variable default value to match your environment"
echo "  - Modify function name filters to match your Lambda naming convention"
echo "  - Add additional variables for filtering by resource tags"
echo
echo "- **Panel Configuration:**"
echo "  - Adjust thresholds based on your performance requirements"
echo "  - Modify time ranges and refresh intervals as needed"
echo "  - Add or remove metrics based on your monitoring needs"
echo
echo "- **Alerting:**"
echo "  - Configure alert rules for critical metrics"
echo "  - Set up notification channels (email, Slack, etc.)"
echo "  - Test alert conditions with appropriate thresholds"
echo

# Display troubleshooting information
log_info "Troubleshooting:"
echo
echo "- **No Data Displayed:**"
echo "  - Verify CloudWatch data sources are configured correctly"
echo "  - Check that the IAM role has proper permissions"
echo "  - Ensure the AWS region matches your resources"
echo "  - Verify Lambda functions and API Gateway exist in the specified stage"
echo
echo "- **Template Variables Not Working:**"
echo "  - Check data source configuration in variable settings"
echo "  - Verify the query syntax matches your resource naming"
echo "  - Test queries manually in the CloudWatch console"
echo
echo "- **Permission Errors:**"
echo "  - Ensure the Grafana workspace service role has CloudWatch permissions"
echo "  - Check that the data source authentication is configured correctly"
echo "  - Verify the IAM role ARN is correct in data source settings"
echo

log_success "Dashboard import instructions complete!"
echo
log_info "Next Steps:"
echo "  1. Import the dashboard templates using the instructions above"
echo "  2. Customize dashboards for your specific requirements"
echo "  3. Set up alerting rules for critical metrics"
echo "  4. Share dashboard URLs with your team"
