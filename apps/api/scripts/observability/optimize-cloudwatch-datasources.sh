#!/bin/bash

# Optimize CloudWatch Data Sources Configuration
# Story 2.2: CloudWatch Data Source Configuration - Task 4
# 
# This script provides optimization recommendations and configuration
# templates for CloudWatch data sources in Grafana

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
Optimize CloudWatch Data Sources Configuration

Usage: $0 [OPTIONS]

Options:
    -s, --stage STAGE           Deployment stage (dev, staging, prod) [default: dev]
    -r, --region REGION         AWS region [default: us-east-1]
    -p, --profile PROFILE       AWS profile [default: default]
    --generate-config           Generate optimized configuration files
    --analyze-usage             Analyze CloudWatch API usage patterns
    -h, --help                  Show this help message

Examples:
    $0                          # Show optimization recommendations
    $0 --generate-config        # Generate optimized configuration files
    $0 --analyze-usage          # Analyze current API usage

EOF
}

# Parse command line arguments
GENERATE_CONFIG=false
ANALYZE_USAGE=false

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
        --generate-config)
            GENERATE_CONFIG=true
            shift
            ;;
        --analyze-usage)
            ANALYZE_USAGE=true
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

log_info "CloudWatch Data Sources Optimization"
echo "  Stage:          $STAGE"
echo "  AWS Region:     $AWS_REGION"
echo "  AWS Profile:    $AWS_PROFILE"
echo "  Generate Config: $GENERATE_CONFIG"
echo "  Analyze Usage:  $ANALYZE_USAGE"
echo

# Analyze CloudWatch API usage if requested
if [[ "$ANALYZE_USAGE" == "true" ]]; then
    log_info "Analyzing CloudWatch API Usage Patterns..."
    
    # Check CloudWatch API calls from the last 24 hours
    END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
    START_TIME=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)
    
    # Get CloudWatch API usage metrics (if available)
    API_CALLS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Usage \
        --metric-name CallCount \
        --dimensions Name=Type,Value=API Name=Resource,Value=GetMetricStatistics Name=Service,Value=CloudWatch Name=Class,Value=None \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 3600 \
        --statistics Sum \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --output json 2>/dev/null || echo '{"Datapoints":[]}')
    
    API_CALL_COUNT=$(echo "$API_CALLS" | jq '.Datapoints | length')
    if [[ "$API_CALL_COUNT" -gt 0 ]]; then
        TOTAL_CALLS=$(echo "$API_CALLS" | jq '[.Datapoints[].Sum] | add // 0')
        log_info "CloudWatch API calls in last 24h: $TOTAL_CALLS"
        
        # Calculate cost estimate (first 1M calls free, then $0.01 per 1000 calls)
        if [[ $(echo "$TOTAL_CALLS > 1000000" | bc -l) -eq 1 ]]; then
            BILLABLE_CALLS=$(echo "$TOTAL_CALLS - 1000000" | bc -l)
            ESTIMATED_COST=$(echo "scale=4; $BILLABLE_CALLS / 1000 * 0.01" | bc -l)
            log_warning "Estimated additional cost: \$${ESTIMATED_COST} (beyond free tier)"
        else
            log_success "API usage within free tier limits"
        fi
    else
        log_info "No CloudWatch API usage data available"
    fi
    echo
fi

# Generate optimized configuration files
if [[ "$GENERATE_CONFIG" == "true" ]]; then
    log_info "Generating optimized CloudWatch data source configurations..."
    
    # Optimized CloudWatch Metrics Data Source
    cat > /tmp/optimized-cloudwatch-metrics.json << EOF
{
  "name": "CloudWatch-UserMetrics",
  "type": "cloudwatch",
  "access": "proxy",
  "isDefault": true,
  "jsonData": {
    "defaultRegion": "$AWS_REGION",
    "authType": "arn",
    "assumeRoleArn": "arn:aws:iam::ACCOUNT_ID:role/user-metrics-grafana-workspace-role-$STAGE",
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
    ],
    "timeout": "30s",
    "maxConcurrentQueries": 5,
    "maxDataPoints": 43200,
    "cacheLevel": "High",
    "cacheTTL": "5m",
    "retryDelay": "1s",
    "maxRetries": 3
  },
  "secureJsonData": {}
}
EOF

    # Optimized CloudWatch Logs Data Source
    cat > /tmp/optimized-cloudwatch-logs.json << EOF
{
  "name": "CloudWatch-Logs-UserMetrics",
  "type": "cloudwatch",
  "access": "proxy",
  "isDefault": false,
  "jsonData": {
    "defaultRegion": "$AWS_REGION",
    "authType": "arn",
    "assumeRoleArn": "arn:aws:iam::ACCOUNT_ID:role/user-metrics-grafana-workspace-role-$STAGE",
    "externalId": "",
    "profile": "",
    "endpoint": "",
    "logsTimeout": "30s",
    "maxConcurrentQueries": 3,
    "logGroups": [
      "/aws/lambda/lego-api-serverless-$STAGE-HealthCheckFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-MocInstructionsFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-UploadImageFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-ListImagesFunction",
      "/aws/lambda/lego-api-serverless-$STAGE-SearchImagesFunction"
    ],
    "cacheLevel": "Medium",
    "cacheTTL": "2m",
    "retryDelay": "2s",
    "maxRetries": 2
  },
  "secureJsonData": {}
}
EOF

    log_success "Optimized configuration files generated:"
    echo "  CloudWatch Metrics: /tmp/optimized-cloudwatch-metrics.json"
    echo "  CloudWatch Logs: /tmp/optimized-cloudwatch-logs.json"
    echo
fi

# Display optimization recommendations
log_info "CloudWatch Data Source Optimization Recommendations:"
echo
echo "## 1. Query Performance Optimization"
echo
echo "**Timeout Settings:**"
echo "- CloudWatch Metrics: 30 seconds (recommended for complex queries)"
echo "- CloudWatch Logs: 30 seconds (Logs Insights can be slow)"
echo "- Increase for large time ranges or complex aggregations"
echo
echo "**Concurrency Limits:**"
echo "- CloudWatch Metrics: 5 concurrent queries (balance performance vs API limits)"
echo "- CloudWatch Logs: 3 concurrent queries (Logs Insights has stricter limits)"
echo "- Reduce if hitting API throttling errors"
echo
echo "**Data Point Limits:**"
echo "- Maximum data points: 43,200 (CloudWatch limit)"
echo "- Use appropriate time ranges to stay within limits"
echo "- Consider aggregation for long time periods"
echo

echo "## 2. Caching Configuration"
echo
echo "**Cache Levels:**"
echo "- High: For metrics that don't change frequently (infrastructure metrics)"
echo "- Medium: For application metrics with moderate change rates"
echo "- Low: For real-time metrics requiring fresh data"
echo
echo "**Cache TTL (Time To Live):**"
echo "- Metrics: 5 minutes (balance freshness vs performance)"
echo "- Logs: 2 minutes (logs are more time-sensitive)"
echo "- Adjust based on your monitoring requirements"
echo

echo "## 3. Retry Policy Configuration"
echo
echo "**Retry Settings:**"
echo "- Max retries: 3 for metrics, 2 for logs"
echo "- Retry delay: 1-2 seconds with exponential backoff"
echo "- Helps handle temporary API throttling"
echo
echo "**Error Handling:**"
echo "- Configure appropriate error thresholds"
echo "- Set up alerts for persistent query failures"
echo "- Monitor data source health regularly"
echo

echo "## 4. Cost Optimization"
echo
echo "**API Call Reduction:**"
echo "- Use caching effectively to reduce redundant calls"
echo "- Optimize dashboard refresh intervals (30s-5m depending on use case)"
echo "- Avoid unnecessary high-frequency queries"
echo "- Use appropriate time ranges for queries"
echo
echo "**Free Tier Limits:**"
echo "- CloudWatch API: 1,000,000 requests/month free"
echo "- GetMetricStatistics: Most common API call from Grafana"
echo "- Monitor usage to stay within free tier"
echo
echo "**Cost Monitoring:**"
echo "- Set up CloudWatch billing alerts"
echo "- Monitor API usage patterns"
echo "- Review dashboard query efficiency regularly"
echo

echo "## 5. Performance Best Practices"
echo
echo "**Dashboard Design:**"
echo "- Limit panels per dashboard (10-15 recommended)"
echo "- Use template variables to reduce query complexity"
echo "- Implement proper time range controls"
echo "- Avoid overlapping time series in single panels"
echo
echo "**Query Optimization:**"
echo "- Use appropriate statistics (Average, Sum, Maximum)"
echo "- Choose optimal period values (300s for most use cases)"
echo "- Filter dimensions effectively"
echo "- Avoid wildcard queries when possible"
echo
echo "**Resource Naming:**"
echo "- Use consistent naming conventions for resources"
echo "- Tag resources appropriately for filtering"
echo "- Group related metrics logically"
echo

echo "## 6. Monitoring and Alerting"
echo
echo "**Data Source Health:**"
echo "- Set up health checks for data sources"
echo "- Monitor query success rates"
echo "- Alert on authentication failures"
echo "- Track query performance metrics"
echo
echo "**Usage Monitoring:**"
echo "- Monitor CloudWatch API usage"
echo "- Track query response times"
echo "- Set up cost anomaly detection"
echo "- Review dashboard performance regularly"
echo

log_info "Implementation Steps:"
echo
echo "1. **Update Data Source Configuration:**"
echo "   - Apply optimized settings in Grafana UI"
echo "   - Test query performance after changes"
echo "   - Monitor for any errors or timeouts"
echo
echo "2. **Optimize Existing Dashboards:**"
echo "   - Review panel queries for efficiency"
echo "   - Adjust refresh intervals appropriately"
echo "   - Implement template variables where beneficial"
echo
echo "3. **Set Up Monitoring:**"
echo "   - Configure CloudWatch usage alerts"
echo "   - Monitor data source health"
echo "   - Track query performance metrics"
echo
echo "4. **Regular Maintenance:**"
echo "   - Review and optimize queries monthly"
echo "   - Update cache settings based on usage patterns"
echo "   - Monitor costs and adjust as needed"
echo

log_success "CloudWatch data source optimization guide complete!"
echo
log_info "Next Steps:"
echo "  1. Apply optimized configuration settings to your data sources"
echo "  2. Test dashboard performance with new settings"
echo "  3. Set up monitoring for data source health and API usage"
echo "  4. Review and optimize dashboards based on recommendations"
