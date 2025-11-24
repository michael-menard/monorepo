# CloudWatch Data Source Configuration Guide

## Overview

This guide provides comprehensive instructions for configuring CloudWatch as a data source in Amazon Managed Grafana for the User Metrics observability stack.

**Story**: 2.2 CloudWatch Data Source Configuration  
**Dependencies**: Story 2.1 (Amazon Managed Grafana Workspace Provisioning)

## Quick Start

### Prerequisites

- Amazon Managed Grafana workspace deployed and active
- Admin access to Grafana workspace
- AWS CLI configured with appropriate permissions
- CloudWatch metrics and logs available from existing infrastructure

### Configuration Steps

1. **Run Configuration Script**:

   ```bash
   cd apps/api/lego-api-serverless
   ./scripts/observability/configure-cloudwatch-datasources.sh --stage dev
   ```

2. **Access Grafana Workspace**:
   - Open the workspace URL provided by the script
   - Navigate to Configuration → Data Sources

3. **Configure Data Sources**:
   - Add CloudWatch metrics data source using provided configuration
   - Add CloudWatch Logs Insights data source
   - Test connections and save configurations

4. **Import Dashboard Templates**:

   ```bash
   ./scripts/observability/import-grafana-dashboards.sh --stage dev
   ```

5. **Validate Configuration**:
   ```bash
   ./scripts/observability/validate-cloudwatch-datasources.sh --stage dev
   ```

## Data Source Configuration

### CloudWatch Metrics Data Source

**Configuration Details**:

- **Name**: `CloudWatch-UserMetrics`
- **Type**: CloudWatch
- **Default**: Yes (marked as default data source)
- **Authentication**: IAM Role ARN
- **Region**: us-east-1 (or your configured region)

**IAM Role Configuration**:

- **Role ARN**: `arn:aws:iam::ACCOUNT_ID:role/user-metrics-grafana-workspace-role-{stage}`
- **Permissions**: CloudWatch metrics read access
- **Namespaces**: AWS/Lambda, AWS/ApiGateway, AWS/CloudFront, AWS/RDS, AWS/ElastiCache, AWS/ES

**Optimization Settings**:

- **Timeout**: 30 seconds
- **Max Concurrent Queries**: 5
- **Cache Level**: High
- **Cache TTL**: 5 minutes
- **Max Retries**: 3

### CloudWatch Logs Insights Data Source

**Configuration Details**:

- **Name**: `CloudWatch-Logs-UserMetrics`
- **Type**: CloudWatch
- **Default**: No
- **Authentication**: IAM Role ARN (same as metrics)
- **Region**: us-east-1 (or your configured region)

**Log Groups Configuration**:

- `/aws/lambda/lego-api-serverless-{stage}-HealthCheckFunction`
- `/aws/lambda/lego-api-serverless-{stage}-MocInstructionsFunction`
- `/aws/lambda/lego-api-serverless-{stage}-UploadImageFunction`
- `/aws/lambda/lego-api-serverless-{stage}-ListImagesFunction`
- `/aws/lambda/lego-api-serverless-{stage}-SearchImagesFunction`

**Optimization Settings**:

- **Logs Timeout**: 30 seconds
- **Max Concurrent Queries**: 3
- **Cache Level**: Medium
- **Cache TTL**: 2 minutes
- **Max Retries**: 2

## IAM Permissions

### Required Permissions for CloudWatch Metrics

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:DescribeAlarmHistory",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetInsightRuleReport"
      ],
      "Resource": "*"
    }
  ]
}
```

### Required Permissions for CloudWatch Logs

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents",
        "logs:StartQuery",
        "logs:StopQuery",
        "logs:GetQueryResults",
        "logs:GetLogRecord"
      ],
      "Resource": "*"
    }
  ]
}
```

## Query Syntax and Examples

### CloudWatch Metrics Queries

#### Lambda Function Metrics

**Invocations**:

```
Namespace: AWS/Lambda
Metric: Invocations
Dimensions: FunctionName = lego-api-serverless-dev-HealthCheckFunction
Statistics: Sum
Period: 300 (5 minutes)
```

**Duration**:

```
Namespace: AWS/Lambda
Metric: Duration
Dimensions: FunctionName = lego-api-serverless-dev-HealthCheckFunction
Statistics: Average, Maximum
Period: 300
```

**Errors**:

```
Namespace: AWS/Lambda
Metric: Errors
Dimensions: FunctionName = lego-api-serverless-dev-HealthCheckFunction
Statistics: Sum
Period: 300
```

#### API Gateway Metrics

**Request Count**:

```
Namespace: AWS/ApiGateway
Metric: Count
Dimensions: ApiName = lego-api-serverless-dev
Statistics: Sum
Period: 300
```

**Latency**:

```
Namespace: AWS/ApiGateway
Metric: Latency
Dimensions: ApiName = lego-api-serverless-dev
Statistics: Average, p95, p99
Period: 300
```

**Error Rates**:

```
Namespace: AWS/ApiGateway
Metric: 4XXError, 5XXError
Dimensions: ApiName = lego-api-serverless-dev
Statistics: Sum
Period: 300
```

#### RDS Metrics

**CPU Utilization**:

```
Namespace: AWS/RDS
Metric: CPUUtilization
Dimensions: DBClusterIdentifier = lego-api-postgres-dev
Statistics: Average, Maximum
Period: 300
```

**Database Connections**:

```
Namespace: AWS/RDS
Metric: DatabaseConnections
Dimensions: DBClusterIdentifier = lego-api-postgres-dev
Statistics: Average, Maximum
Period: 300
```

### CloudWatch Logs Insights Queries

#### Basic Log Query

```
fields @timestamp, @message
| sort @timestamp desc
| limit 100
```

#### Error Pattern Search

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

#### Lambda Function Performance

```
fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| filter @type = "REPORT"
| sort @timestamp desc
| limit 100
```

#### API Request Analysis

```
fields @timestamp, @message
| filter @message like /START RequestId/
| parse @message "START RequestId: * Version:"
| sort @timestamp desc
| limit 100
```

#### Custom Log Analysis

```
fields @timestamp, @message
| filter @message like /user_id/
| parse @message '"user_id": "*"' as user_id
| stats count() by user_id
| sort count desc
```

## Dashboard Templates

### Available Templates

1. **Lambda Performance Dashboard**
   - File: `sst/observability/grafana-dashboards/lambda-performance-dashboard.json`
   - Metrics: Invocations, errors, duration, throttles
   - Time series and statistical views

2. **API Gateway Dashboard**
   - File: `sst/observability/grafana-dashboards/api-gateway-dashboard.json`
   - Metrics: Request count, latency, error rates
   - Performance and error analysis

3. **Test Dashboard**
   - File: `sst/observability/grafana-dashboards/test-dashboard.json`
   - Validation of data source connectivity
   - Basic functionality testing

### Template Variables

**Stage Variable**:

```json
{
  "name": "stage",
  "type": "custom",
  "options": [
    { "text": "dev", "value": "dev", "selected": true },
    { "text": "staging", "value": "staging", "selected": false },
    { "text": "prod", "value": "prod", "selected": false }
  ]
}
```

**Function Variable**:

```json
{
  "name": "function",
  "type": "query",
  "datasource": "CloudWatch-UserMetrics",
  "query": "dimension_values(us-east-1,AWS/Lambda,Invocations,FunctionName)",
  "regex": "/lego-api-serverless-$stage-.*/",
  "multi": true,
  "includeAll": true
}
```

## Troubleshooting Guide

### Common Issues

#### Issue: "Data source not found" error

**Symptoms**:

- Panels show "Data source not found"
- Queries fail to execute

**Possible Causes**:

- Data source not configured correctly
- Data source name mismatch in dashboard
- Authentication issues

**Solutions**:

1. Verify data source configuration in Grafana UI
2. Check data source name matches dashboard configuration
3. Test data source connection
4. Verify IAM role permissions

#### Issue: "No data" displayed in panels

**Symptoms**:

- Panels load but show no data
- Queries execute but return empty results

**Possible Causes**:

- Incorrect metric names or dimensions
- Wrong time range selected
- Resources don't exist in specified stage
- IAM permissions insufficient

**Solutions**:

1. Verify resource names match your environment
2. Check time range includes periods with activity
3. Test queries manually in CloudWatch console
4. Verify IAM role has required permissions

#### Issue: "Query timeout" errors

**Symptoms**:

- Queries fail with timeout errors
- Slow dashboard loading

**Possible Causes**:

- Large time ranges
- Complex queries
- High query concurrency
- CloudWatch API throttling

**Solutions**:

1. Reduce query time ranges
2. Optimize query complexity
3. Reduce concurrent query limits
4. Implement query caching
5. Check CloudWatch API quotas

#### Issue: "Authentication failed" errors

**Symptoms**:

- Data source connection test fails
- Queries fail with authentication errors

**Possible Causes**:

- Incorrect IAM role ARN
- IAM role doesn't exist
- Insufficient permissions
- Cross-account access issues

**Solutions**:

1. Verify IAM role ARN is correct
2. Check IAM role exists and is assumable
3. Verify IAM policies are attached
4. Test role assumption manually

### Performance Optimization

#### Query Optimization

1. **Use Appropriate Time Ranges**:
   - Avoid unnecessarily large time ranges
   - Use dashboard time controls effectively
   - Consider data retention periods

2. **Optimize Metric Queries**:
   - Use specific dimensions when possible
   - Choose appropriate statistics (Average, Sum, Maximum)
   - Set optimal period values (300s recommended)

3. **Implement Caching**:
   - Enable data source caching
   - Set appropriate cache TTL values
   - Use high cache levels for stable metrics

#### Dashboard Design

1. **Limit Panel Count**:
   - Keep dashboards focused (10-15 panels max)
   - Use multiple dashboards for different use cases
   - Group related metrics logically

2. **Use Template Variables**:
   - Implement stage/environment variables
   - Use function/resource filtering
   - Enable multi-select where appropriate

3. **Optimize Refresh Rates**:
   - Use appropriate refresh intervals (30s-5m)
   - Avoid high-frequency refreshes for historical data
   - Consider real-time vs batch monitoring needs

### Cost Management

#### Monitoring API Usage

1. **Track CloudWatch API Calls**:

   ```bash
   ./scripts/observability/optimize-cloudwatch-datasources.sh --analyze-usage
   ```

2. **Set Up Usage Alerts**:
   - Configure CloudWatch billing alerts
   - Monitor GetMetricStatistics API calls
   - Set up cost anomaly detection

3. **Optimize Query Patterns**:
   - Use caching to reduce redundant calls
   - Optimize dashboard refresh intervals
   - Avoid unnecessary high-frequency queries

#### Free Tier Management

- **CloudWatch API**: 1,000,000 requests/month free
- **GetMetricStatistics**: Most common API call from Grafana
- **Logs Insights**: 5GB of log data analyzed per month free

## Team Usage Guide

### For Engineering Team

**Primary Use Cases**:

- Monitor Lambda function performance
- Track API Gateway metrics
- Analyze error patterns and trends
- Debug performance issues

**Key Dashboards**:

- Lambda Performance Dashboard
- API Gateway Dashboard
- Custom error tracking dashboards

**Best Practices**:

- Use template variables for environment filtering
- Create alerts for critical metrics
- Share dashboard URLs for incident response

### For Product Team

**Primary Use Cases**:

- Monitor user-facing API performance
- Track feature usage patterns
- Analyze user experience metrics

**Key Metrics**:

- API response times
- Request success rates
- Feature adoption metrics

### For Customer Success Team

**Primary Use Cases**:

- Monitor system reliability
- Track customer-impacting issues
- Analyze support ticket correlation

**Key Metrics**:

- System availability
- Error rates
- Performance trends

## Maintenance and Updates

### Regular Tasks

1. **Weekly**:
   - Review dashboard performance
   - Check for query errors
   - Monitor API usage patterns

2. **Monthly**:
   - Optimize slow queries
   - Update dashboard templates
   - Review cost implications

3. **Quarterly**:
   - Audit IAM permissions
   - Update documentation
   - Review monitoring strategy

### Version Updates

When updating Grafana or AWS services:

1. Test data source connectivity
2. Verify query compatibility
3. Update documentation as needed
4. Communicate changes to team

---

**Last Updated**: 2025-11-23
**Version**: 1.0
**Maintained By**: Engineering Team
