# CloudWatch Data Source Troubleshooting Guide

## Quick Reference

This guide provides solutions to common issues when configuring and using CloudWatch data sources in Grafana.

## Common Error Messages and Solutions

### Authentication Errors

#### Error: "AccessDenied: User is not authorized to perform: sts:AssumeRole"

**Cause**: IAM role cannot be assumed by Grafana workspace service.

**Solution**:

1. Verify the IAM role ARN is correct in data source configuration
2. Check the role's trust policy allows Grafana service to assume it:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Service": "grafana.amazonaws.com"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```
3. Ensure the role exists in the correct AWS account

#### Error: "AccessDenied: User is not authorized to perform: cloudwatch:ListMetrics"

**Cause**: IAM role lacks CloudWatch permissions.

**Solution**:

1. Attach the CloudWatch read policy to the IAM role
2. Verify policy includes required actions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cloudwatch:ListMetrics",
           "cloudwatch:GetMetricStatistics",
           "cloudwatch:GetMetricData"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

### Data Source Configuration Errors

#### Error: "Data source not found"

**Cause**: Data source name mismatch between dashboard and configuration.

**Solution**:

1. Check data source name in Grafana UI matches dashboard configuration
2. Verify data source is saved and active
3. Update dashboard data source references if needed

#### Error: "Invalid region specified"

**Cause**: Incorrect AWS region in data source configuration.

**Solution**:

1. Verify region matches where your resources are deployed
2. Update data source configuration with correct region
3. Test connection after region change

### Query Errors

#### Error: "No data points found"

**Cause**: Query parameters don't match existing metrics.

**Solution**:

1. Verify metric name and namespace are correct
2. Check dimension values match your resources
3. Ensure time range includes periods with data
4. Test query in AWS CloudWatch console first

#### Error: "Query timeout"

**Cause**: Query taking too long to execute.

**Solution**:

1. Reduce time range for the query
2. Increase timeout in data source settings
3. Optimize query by using specific dimensions
4. Check CloudWatch API throttling limits

### Dashboard Issues

#### Issue: Panels show "N/A" or empty data

**Troubleshooting Steps**:

1. Check data source connection status
2. Verify query syntax and parameters
3. Test with a simpler query first
4. Check AWS resource naming conventions

#### Issue: Dashboard loads slowly

**Optimization Steps**:

1. Reduce number of panels per dashboard
2. Optimize query time ranges
3. Enable data source caching
4. Reduce dashboard refresh frequency

## Diagnostic Commands

### Test AWS Credentials

```bash
# Test basic AWS access
aws sts get-caller-identity --profile your-profile

# Test CloudWatch access
aws cloudwatch list-metrics --namespace AWS/Lambda --profile your-profile

# Test specific metric query
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=your-function-name \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-01T01:00:00Z \
  --period 3600 \
  --statistics Sum \
  --profile your-profile
```

### Test CloudWatch Logs Access

```bash
# List log groups
aws logs describe-log-groups --profile your-profile

# Test log insights query
aws logs start-query \
  --log-group-name /aws/lambda/your-function \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | limit 10' \
  --profile your-profile
```

### Validate IAM Role

```bash
# Check if role exists
aws iam get-role --role-name your-grafana-role --profile your-profile

# List attached policies
aws iam list-attached-role-policies --role-name your-grafana-role --profile your-profile

# Get policy document
aws iam get-policy-version \
  --policy-arn arn:aws:iam::account:policy/your-policy \
  --version-id v1 \
  --profile your-profile
```

## Performance Troubleshooting

### High API Usage

**Symptoms**:

- Unexpected CloudWatch charges
- API throttling errors
- Slow query performance

**Investigation**:

1. Check CloudWatch API usage metrics
2. Review dashboard refresh rates
3. Analyze query complexity and frequency

**Solutions**:

1. Enable aggressive caching
2. Reduce dashboard refresh intervals
3. Optimize query time ranges
4. Use template variables to reduce query count

### Memory Issues

**Symptoms**:

- Browser becomes unresponsive
- Dashboard fails to load
- Out of memory errors

**Solutions**:

1. Reduce number of data points per query
2. Limit time ranges for complex queries
3. Split large dashboards into smaller ones
4. Use appropriate aggregation periods

## Environment-Specific Issues

### Development Environment

**Common Issues**:

- Resources may not exist yet
- Intermittent data due to low usage
- Different naming conventions

**Solutions**:

- Use template variables for environment switching
- Create development-specific dashboards
- Handle missing data gracefully

### Production Environment

**Common Issues**:

- High query volume
- Cost concerns
- Performance requirements

**Solutions**:

- Implement strict caching policies
- Monitor API usage closely
- Optimize for performance over real-time data

## Getting Help

### Internal Support

1. **Check Documentation**:
   - Review CloudWatch Data Source Guide
   - Check Grafana workspace documentation
   - Consult AWS CloudWatch documentation

2. **Use Diagnostic Scripts**:

   ```bash
   # Validate data source configuration
   ./scripts/observability/validate-cloudwatch-datasources.sh

   # Test query functionality
   ./scripts/observability/test-cloudwatch-queries.sh

   # Check optimization settings
   ./scripts/observability/optimize-cloudwatch-datasources.sh
   ```

3. **Contact Team**:
   - Engineering team: engineering@example.com
   - Slack channel: #observability
   - Create GitHub issue with diagnostic information

### External Resources

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [Grafana CloudWatch Data Source Documentation](https://grafana.com/docs/grafana/latest/datasources/cloudwatch/)
- [Amazon Managed Grafana User Guide](https://docs.aws.amazon.com/grafana/)

---

**Last Updated**: 2025-11-23  
**Version**: 1.0  
**Maintained By**: Engineering Team
