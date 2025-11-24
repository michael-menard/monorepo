# Amazon Managed Grafana Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Amazon Managed Grafana workspace for User Metrics observability.

## Prerequisites

- AWS CLI configured with appropriate permissions
- CloudFormation deployment permissions
- IAM role/policy creation permissions
- Access to the target AWS account and region

## Deployment Steps

### Step 1: Deploy Grafana Workspace

Deploy the main Grafana workspace infrastructure:

```bash
cd apps/api/lego-api-serverless

# Deploy to development
./scripts/observability/deploy-grafana-workspace.sh --stage dev

# Deploy to staging
./scripts/observability/deploy-grafana-workspace.sh --stage staging

# Deploy to production
./scripts/observability/deploy-grafana-workspace.sh --stage prod
```

**Expected Output:**

- CloudFormation stack: `user-metrics-grafana-{stage}`
- Workspace ID and URL in stack outputs
- IAM service role with data source permissions

### Step 2: Deploy User Access Policies

Deploy IAM policies and roles for user access:

```bash
# Deploy user policies (requires workspace to be deployed first)
./scripts/observability/deploy-grafana-user-policies.sh --stage dev

# For other environments
./scripts/observability/deploy-grafana-user-policies.sh --stage staging
./scripts/observability/deploy-grafana-user-policies.sh --stage prod
```

**Expected Output:**

- CloudFormation stack: `user-metrics-grafana-users-{stage}`
- Admin and viewer IAM policies
- Team IAM groups for access control

### Step 3: Manual Configuration (AWS Console)

Complete these manual steps in the AWS Console:

1. **Configure Essential Tier**:
   - Navigate to AWS Console → Amazon Managed Grafana
   - Select your workspace
   - Go to "Workspace settings" → "Pricing tier"
   - Change from Standard to Essential ($9/month)

2. **Set Basic Configuration**:
   - Timezone: UTC
   - Organization name: UserMetrics

3. **Configure Authentication**:
   - Enable IAM Identity Center authentication
   - Configure user assignments

### Step 4: Validate Deployment

Run comprehensive validation tests:

```bash
# Validate workspace deployment
./scripts/observability/validate-grafana-workspace.sh --stage dev

# Run integration tests
./scripts/observability/test-grafana-integration.sh --stage dev

# Monitor costs
./scripts/observability/monitor-grafana-costs.sh --stage dev
```

### Step 5: Add Team Members

Add team members to appropriate IAM groups:

```bash
# Add user to engineering team (viewer access)
aws iam add-user-to-group \
  --group-name user-metrics-grafana-engineering-dev \
  --user-name john.doe

# Add user to product team (viewer access)
aws iam add-user-to-group \
  --group-name user-metrics-grafana-product-dev \
  --user-name jane.smith

# Add user to customer success team (viewer access)
aws iam add-user-to-group \
  --group-name user-metrics-grafana-cs-dev \
  --user-name mike.johnson
```

## Verification Checklist

After deployment, verify the following:

### Infrastructure Verification

- [ ] CloudFormation stacks deployed successfully
- [ ] Grafana workspace in ACTIVE state
- [ ] IAM service role has required permissions
- [ ] User access policies created
- [ ] Team IAM groups created

### Configuration Verification

- [ ] Workspace tier set to Essential ($9/month)
- [ ] Timezone set to UTC
- [ ] Organization name set to UserMetrics
- [ ] Authentication configured for IAM

### Access Verification

- [ ] Admin user can access workspace
- [ ] Team members can access workspace (viewer role)
- [ ] Workspace URL accessible via HTTPS
- [ ] Authentication working correctly

### Integration Verification

- [ ] Existing CloudWatch dashboard still accessible
- [ ] Existing CloudWatch alarms still active
- [ ] OpenSearch domain accessible (if deployed)
- [ ] No interference with application URLs

## Troubleshooting

### Common Issues

**Issue: CloudFormation deployment fails**

- Check IAM permissions for CloudFormation and Grafana
- Verify AWS service quotas not exceeded
- Review CloudFormation events for specific errors

**Issue: Workspace not accessible**

- Verify workspace is in ACTIVE state
- Check IAM user permissions and group membership
- Confirm authentication configuration

**Issue: Data sources not working**

- Verify service role permissions
- Check CloudWatch and OpenSearch service status
- Review AWS service quotas

### Getting Help

- Review logs in CloudFormation console
- Check AWS service health dashboard
- Contact engineering@example.com for internal support

## Cost Monitoring

### Expected Costs

| Component      | Monthly Cost | Notes                    |
| -------------- | ------------ | ------------------------ |
| Essential Tier | $9.00        | Fixed cost per workspace |
| Data Transfer  | ~$1.00       | Estimated based on usage |
| **Total**      | **~$10.00**  | Per environment          |

### Cost Optimization

- Essential tier selected for budget optimization
- Service-managed VPC reduces networking costs
- IAM authentication avoids AWS SSO costs
- Monitor user count (5 user limit)

### Budget Monitoring

```bash
# Monitor costs regularly
./scripts/observability/monitor-grafana-costs.sh --stage dev

# Export cost data for analysis
./scripts/observability/monitor-grafana-costs.sh --stage dev --export-csv
```

## Environment Promotion

### Development → Staging

```bash
# Deploy to staging
./scripts/observability/deploy-grafana-workspace.sh --stage staging
./scripts/observability/deploy-grafana-user-policies.sh --stage staging

# Validate staging deployment
./scripts/observability/validate-grafana-workspace.sh --stage staging
```

### Staging → Production

```bash
# Deploy to production
./scripts/observability/deploy-grafana-workspace.sh --stage prod
./scripts/observability/deploy-grafana-user-policies.sh --stage prod

# Validate production deployment
./scripts/observability/validate-grafana-workspace.sh --stage prod
```

## Next Steps

After successful deployment:

1. **Create Initial Dashboards**:
   - Application performance metrics
   - Infrastructure health monitoring
   - Business KPIs tracking

2. **Set Up Data Sources**:
   - Configure CloudWatch data source
   - Set up CloudWatch Logs data source
   - Configure OpenSearch data source (Story 2.4)

3. **Configure Alerting**:
   - Set up alert rules for critical metrics
   - Configure notification channels
   - Test alert delivery

4. **Team Training**:
   - Conduct Grafana training sessions
   - Create dashboard-specific guides
   - Establish monitoring best practices

## Resources

- [Grafana Workspace Guide](./grafana-workspace-guide.md)
- [Amazon Managed Grafana Documentation](https://docs.aws.amazon.com/grafana/)
- [CloudWatch Data Source Guide](https://grafana.com/docs/grafana/latest/datasources/cloudwatch/)

---

**Story**: 2.1 Amazon Managed Grafana Workspace Provisioning  
**Last Updated**: 2025-11-23  
**Version**: 1.0  
**Maintained By**: Engineering Team
