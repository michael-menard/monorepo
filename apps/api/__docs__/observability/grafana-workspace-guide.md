# Amazon Managed Grafana Workspace Guide

## Overview

This guide provides comprehensive information for accessing and using the Amazon Managed Grafana workspace for User Metrics observability.

**Workspace Details:**

- **Name**: `user-metrics-grafana-{stage}`
- **Tier**: Essential ($9/month)
- **Organization**: UserMetrics
- **Authentication**: IAM-based
- **Data Sources**: CloudWatch, CloudWatch Logs, OpenSearch

## Quick Access

### Workspace URLs

| Environment | Workspace URL                                                      | Status  |
| ----------- | ------------------------------------------------------------------ | ------- |
| Development | `https://{workspace-id}.grafana-workspace.{region}.amazonaws.com/` | Active  |
| Staging     | `https://{workspace-id}.grafana-workspace.{region}.amazonaws.com/` | Pending |
| Production  | `https://{workspace-id}.grafana-workspace.{region}.amazonaws.com/` | Pending |

> **Note**: Replace `{workspace-id}` and `{region}` with actual values from deployment outputs.

### Access Credentials

**Admin Access:**

- **User**: `user-metrics-grafana-admin-{stage}`
- **Role**: `user-metrics-grafana-admin-role-{stage}`
- **Permissions**: Full workspace management

**Team Access:**

- **Engineering Team**: `user-metrics-grafana-engineering-{stage}` (Viewer)
- **Product Team**: `user-metrics-grafana-product-{stage}` (Viewer)
- **Customer Success Team**: `user-metrics-grafana-cs-{stage}` (Viewer)

## Getting Started

### 1. Initial Setup (Admin Only)

After deployment, complete these manual configuration steps:

1. **Configure Essential Tier**:
   - Navigate to AWS Console → Amazon Managed Grafana
   - Select your workspace
   - Go to "Workspace settings" → "Pricing tier"
   - Change from Standard to Essential ($9/month)

2. **Set Timezone and Organization**:
   - In workspace settings, set:
     - Timezone: UTC
     - Organization name: UserMetrics

3. **Configure Authentication**:
   - Go to "Authentication" tab
   - Ensure IAM Identity Center is enabled
   - Configure user assignments

### 2. User Onboarding

#### For Admin Users

1. **AWS Console Access**:
   - Log into AWS Console with appropriate permissions
   - Navigate to Amazon Managed Grafana
   - Select the workspace for your environment

2. **Direct Workspace Access**:
   - Use the workspace URL from the table above
   - Authenticate using your AWS credentials
   - You'll have full admin access to create/edit dashboards

#### For Team Members (Viewers)

1. **Request Access**:
   - Contact your admin to be added to the appropriate IAM group:
     - Engineering: `user-metrics-grafana-engineering-{stage}`
     - Product: `user-metrics-grafana-product-{stage}`
     - Customer Success: `user-metrics-grafana-cs-{stage}`

2. **Access Workspace**:
   - Use the workspace URL for your environment
   - Authenticate using your AWS credentials
   - You'll have viewer access to existing dashboards

## Workspace Configuration

### IAM Roles and Permissions

#### Service Role

- **Role**: `user-metrics-grafana-workspace-role-{stage}`
- **Purpose**: Allows Grafana to access AWS data sources
- **Permissions**:
  - CloudWatch metrics and alarms (read-only)
  - CloudWatch Logs Insights (query access)
  - OpenSearch domain access (read-only)

#### User Roles

**Admin Role** (`user-metrics-grafana-admin-role-{stage}`):

- Create/update/delete workspaces
- Manage workspace configuration
- Full dashboard management
- User and permission management

**Viewer Role** (`user-metrics-grafana-viewer-role-{stage}`):

- View workspace configuration
- Access existing dashboards
- No modification permissions

### Data Sources

The workspace is pre-configured with access to:

1. **CloudWatch**:
   - Metrics from Lambda functions, API Gateway, RDS, Redis, OpenSearch
   - Custom business metrics
   - Alarms and alarm history

2. **CloudWatch Logs**:
   - Lambda function logs
   - Application logs
   - Log Insights queries

3. **OpenSearch** (Future - Story 2.4):
   - Search and analytics data
   - Custom dashboards for search metrics

### Essential Tier Limitations

- **Users**: Maximum 5 users (sufficient for current team size)
- **Data Sources**: CloudWatch, Logs, and OpenSearch supported
- **Dashboards**: Unlimited dashboards and panels
- **Alerting**: Basic alerting rules
- **API Access**: Limited (prefer manual dashboard creation)

## Team Onboarding Guide

### For Engineering Team

**Access Level**: Viewer
**Primary Use Cases**:

- Monitor application performance metrics
- View error rates and response times
- Track infrastructure health
- Analyze user behavior patterns

**Getting Started**:

1. Request access from admin
2. Access workspace URL
3. Explore pre-built dashboards:
   - Application Performance Dashboard
   - Infrastructure Health Dashboard
   - Error Monitoring Dashboard

### For Product Team

**Access Level**: Viewer
**Primary Use Cases**:

- Track user engagement metrics
- Monitor feature adoption
- Analyze conversion funnels
- Review business KPIs

**Getting Started**:

1. Request access from admin
2. Access workspace URL
3. Focus on business metrics dashboards:
   - User Analytics Dashboard
   - Feature Usage Dashboard
   - Business KPIs Dashboard

### For Customer Success Team

**Access Level**: Viewer
**Primary Use Cases**:

- Monitor customer experience metrics
- Track support ticket trends
- Analyze user satisfaction data
- Review system reliability metrics

**Getting Started**:

1. Request access from admin
2. Access workspace URL
3. Review customer-focused dashboards:
   - Customer Experience Dashboard
   - System Reliability Dashboard
   - Support Metrics Dashboard

## Troubleshooting Guide

### Common Access Issues

#### Issue: "Access Denied" when accessing workspace URL

**Possible Causes**:

- User not added to appropriate IAM group
- Incorrect AWS credentials
- Workspace not properly configured

**Solutions**:

1. Verify IAM group membership
2. Check AWS credentials and permissions
3. Contact admin to verify workspace configuration

#### Issue: "Workspace not found" error

**Possible Causes**:

- Incorrect workspace URL
- Workspace not deployed in current region
- Network connectivity issues

**Solutions**:

1. Verify workspace URL from deployment outputs
2. Check AWS region in URL
3. Test network connectivity

#### Issue: Data sources not loading

**Possible Causes**:

- Service role permissions insufficient
- Data source configuration incorrect
- AWS service limits reached

**Solutions**:

1. Verify service role has required permissions
2. Check CloudWatch and OpenSearch service status
3. Review AWS service quotas

### Performance Issues

#### Issue: Slow dashboard loading

**Possible Causes**:

- Complex queries with large time ranges
- Too many panels on single dashboard
- Network latency

**Solutions**:

1. Reduce query time ranges
2. Optimize dashboard panel count
3. Use dashboard variables for filtering

#### Issue: Query timeouts

**Possible Causes**:

- CloudWatch API rate limits
- Complex log queries
- Large data sets

**Solutions**:

1. Implement query result caching
2. Optimize log query patterns
3. Use appropriate time ranges

### Getting Help

**Internal Support**:

- **Admin Contact**: engineering@example.com
- **Slack Channel**: #observability
- **Documentation**: This guide and AWS documentation

**AWS Support**:

- AWS Support Console for service issues
- Amazon Managed Grafana documentation
- AWS CloudWatch documentation

## Cost Monitoring

### Current Costs

- **Essential Tier**: $9/month (fixed)
- **Data Transfer**: Minimal (estimated <$1/month)
- **Total Estimated**: $10/month per environment

### Cost Optimization

1. **Use Essential Tier**: Chosen for budget optimization
2. **Limit Users**: Maximum 5 users per workspace
3. **Optimize Queries**: Reduce unnecessary data transfer
4. **Monitor Usage**: Regular cost reviews

### Budget Alerts

- Workspace tagged with `BudgetAlert: $9`
- Included in UserMetrics project budget ($150/month)
- Cost anomaly detection configured

## Next Steps

1. **Complete Manual Configuration**:
   - Set Essential tier in AWS Console
   - Configure timezone and organization settings

2. **Add Team Members**:
   - Add users to appropriate IAM groups
   - Test access for each team

3. **Create Initial Dashboards**:
   - Application performance metrics
   - Infrastructure health monitoring
   - Business KPIs tracking

4. **Set Up Alerting**:
   - Configure alert rules for critical metrics
   - Set up notification channels

5. **Training and Documentation**:
   - Conduct team training sessions
   - Create dashboard-specific guides
   - Establish monitoring best practices

## Deployment Commands

### Deploy Workspace (Admin Only)

```bash
# Deploy the main Grafana workspace
cd apps/api/lego-api-serverless
./scripts/observability/deploy-grafana-workspace.sh --stage dev

# Deploy user policies and roles
./scripts/observability/deploy-grafana-user-policies.sh --stage dev

# Validate deployment
./scripts/observability/validate-grafana-workspace.sh --stage dev
```

### Get Workspace Information

```bash
# Get workspace URL and ID
aws cloudformation describe-stacks \
  --stack-name user-metrics-grafana-dev \
  --query 'Stacks[0].Outputs' \
  --output table

# Check workspace status
aws grafana describe-workspace \
  --workspace-id <workspace-id> \
  --output table
```

## Resources

- [Amazon Managed Grafana Documentation](https://docs.aws.amazon.com/grafana/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [CloudWatch Data Source Configuration](https://grafana.com/docs/grafana/latest/datasources/cloudwatch/)
- [Internal Architecture Documentation](../architecture/)

---

**Last Updated**: 2025-11-23
**Version**: 1.0
**Maintained By**: Engineering Team
