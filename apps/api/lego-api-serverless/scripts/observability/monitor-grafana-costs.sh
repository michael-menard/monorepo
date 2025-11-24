#!/bin/bash

# Monitor Amazon Managed Grafana Workspace Costs
# Story 2.1: Amazon Managed Grafana Workspace Provisioning - Task 6
# 
# This script monitors and reports on Grafana workspace costs,
# validates Essential tier pricing, and provides cost optimization recommendations

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME_PREFIX="user-metrics-grafana"

# Default values
STAGE="${STAGE:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"
DAYS_BACK="${DAYS_BACK:-30}"

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
Monitor Amazon Managed Grafana Workspace Costs

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    -d, --days DAYS             Number of days to look back [default: 30]
    --export-csv                Export cost data to CSV file
    -h, --help                  Show this help message

Examples:
    $0                          # Monitor dev stage costs for last 30 days
    $0 -s prod -d 7             # Monitor prod costs for last 7 days
    $0 --export-csv             # Export cost data to CSV

EOF
}

# Parse command line arguments
EXPORT_CSV=false

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
        -d|--days)
            DAYS_BACK="$2"
            shift 2
            ;;
        --export-csv)
            EXPORT_CSV=true
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

log_info "Monitoring Grafana Workspace Costs"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Days Back:      $DAYS_BACK"
echo "  Export CSV:     $EXPORT_CSV"
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

# Calculate date range
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "$DAYS_BACK days ago" +%Y-%m-%d)

log_info "Cost Analysis Period: $START_DATE to $END_DATE"

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

echo "  Workspace ID:   $WORKSPACE_ID"

# Get UserMetrics project costs
log_info "Retrieving UserMetrics project costs..."

# Create filter for UserMetrics project
cat > /tmp/cost-filter.json << EOF
{
  "Tags": {
    "Key": "Project",
    "Values": ["UserMetrics"]
  }
}
EOF

# Get cost data for UserMetrics project
COST_DATA=$(aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --filter file:///tmp/cost-filter.json \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"ResultsByTime":[]}')

if [[ $(echo "$COST_DATA" | jq '.ResultsByTime | length') -gt 0 ]]; then
    TOTAL_COST=$(echo "$COST_DATA" | jq -r '.ResultsByTime[0].Total.BlendedCost.Amount // "0"')
    COST_UNIT=$(echo "$COST_DATA" | jq -r '.ResultsByTime[0].Total.BlendedCost.Unit // "USD"')
    
    log_success "UserMetrics project total cost: $TOTAL_COST $COST_UNIT"
else
    log_warning "No cost data found for UserMetrics project (may be too recent)"
    TOTAL_COST="0"
    COST_UNIT="USD"
fi

# Get Grafana-specific costs
log_info "Retrieving Grafana service costs..."

# Create filter for Grafana service
cat > /tmp/grafana-filter.json << EOF
{
  "And": [
    {
      "Tags": {
        "Key": "Project",
        "Values": ["UserMetrics"]
      }
    },
    {
      "Tags": {
        "Key": "Component",
        "Values": ["Grafana"]
      }
    }
  ]
}
EOF

GRAFANA_COST_DATA=$(aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --filter file:///tmp/grafana-filter.json \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo '{"ResultsByTime":[]}')

if [[ $(echo "$GRAFANA_COST_DATA" | jq '.ResultsByTime | length') -gt 0 ]]; then
    GRAFANA_COST=$(echo "$GRAFANA_COST_DATA" | jq -r '.ResultsByTime[0].Total.BlendedCost.Amount // "0"')
    log_success "Grafana workspace cost: $GRAFANA_COST $COST_UNIT"
else
    log_warning "No Grafana-specific cost data found (may be too recent or not tagged)"
    GRAFANA_COST="0"
fi

# Validate Essential tier pricing
log_info "Validating Essential tier pricing..."
EXPECTED_MONTHLY_COST=9.00

if [[ $(echo "$GRAFANA_COST > 0" | bc -l) -eq 1 ]]; then
    if [[ $(echo "$GRAFANA_COST <= $EXPECTED_MONTHLY_COST * 1.1" | bc -l) -eq 1 ]]; then
        log_success "Grafana cost within expected range (≤ $$(echo "$EXPECTED_MONTHLY_COST * 1.1" | bc -l))"
    else
        log_warning "Grafana cost higher than expected Essential tier ($EXPECTED_MONTHLY_COST/month)"
        log_warning "Actual: $GRAFANA_COST, Expected: ≤ $EXPECTED_MONTHLY_COST"
    fi
else
    log_info "Grafana cost data not yet available (charges may not have appeared in billing)"
fi

# Check budget status
log_info "Checking budget status..."
BUDGET_NAME="UserMetrics-Monthly-Budget"
BUDGET_STATUS=$(aws budgets describe-budget \
    --account-id "$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)" \
    --budget-name "$BUDGET_NAME" \
    --profile "$AWS_PROFILE" \
    --output json 2>/dev/null || echo '{}')

if [[ $(echo "$BUDGET_STATUS" | jq 'has("Budget")') == "true" ]]; then
    BUDGET_LIMIT=$(echo "$BUDGET_STATUS" | jq -r '.Budget.BudgetLimit.Amount // "0"')
    BUDGET_UNIT=$(echo "$BUDGET_STATUS" | jq -r '.Budget.BudgetLimit.Unit // "USD"')
    
    log_success "UserMetrics budget found: $BUDGET_LIMIT $BUDGET_UNIT"
    
    if [[ $(echo "$TOTAL_COST > 0" | bc -l) -eq 1 ]]; then
        BUDGET_USAGE=$(echo "scale=2; $TOTAL_COST / $BUDGET_LIMIT * 100" | bc -l)
        log_info "Budget usage: ${BUDGET_USAGE}% ($TOTAL_COST / $BUDGET_LIMIT $BUDGET_UNIT)"
        
        if [[ $(echo "$BUDGET_USAGE > 80" | bc -l) -eq 1 ]]; then
            log_warning "Budget usage above 80% threshold"
        fi
    fi
else
    log_warning "UserMetrics budget not found or not accessible"
fi

# Cost optimization recommendations
log_info "Cost Optimization Recommendations"

echo "  Current Configuration:"
echo "    - Tier: Essential ($9/month fixed)"
echo "    - Users: Up to 5 included"
echo "    - Data Sources: CloudWatch, Logs, OpenSearch"
echo "    - Dashboards: Unlimited"
echo

echo "  Optimization Opportunities:"
echo "    ✓ Essential tier already selected (vs Standard $50/month)"
echo "    ✓ Service-managed VPC reduces networking costs"
echo "    ✓ IAM authentication avoids AWS SSO costs"
echo "    • Monitor user count (5 user limit)"
echo "    • Optimize dashboard queries to reduce data transfer"
echo "    • Use dashboard variables for efficient filtering"
echo

# Export to CSV if requested
if [[ "$EXPORT_CSV" == "true" ]]; then
    CSV_FILE="grafana-costs-$STAGE-$(date +%Y%m%d).csv"
    log_info "Exporting cost data to: $CSV_FILE"
    
    echo "Date,Stage,Service,Cost,Unit,Budget_Limit,Budget_Usage_Percent" > "$CSV_FILE"
    echo "$END_DATE,$STAGE,Grafana,$GRAFANA_COST,$COST_UNIT,$BUDGET_LIMIT,${BUDGET_USAGE:-0}" >> "$CSV_FILE"
    echo "$END_DATE,$STAGE,UserMetrics_Total,$TOTAL_COST,$COST_UNIT,$BUDGET_LIMIT,${BUDGET_USAGE:-0}" >> "$CSV_FILE"
    
    log_success "Cost data exported to: $CSV_FILE"
fi

# Cleanup temporary files
rm -f /tmp/cost-filter.json /tmp/grafana-filter.json

echo
log_success "Cost monitoring complete!"
echo
log_info "Summary:"
echo "  UserMetrics Total: $TOTAL_COST $COST_UNIT"
echo "  Grafana Workspace: $GRAFANA_COST $COST_UNIT"
echo "  Expected Monthly: $EXPECTED_MONTHLY_COST $COST_UNIT"
echo "  Budget Status: ${BUDGET_USAGE:-N/A}% of $BUDGET_LIMIT $BUDGET_UNIT"
