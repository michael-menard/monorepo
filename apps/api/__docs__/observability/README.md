# User Metrics Observability Infrastructure

## Overview

This directory contains the infrastructure and documentation for the User Metrics observability stack, including Amazon Managed Grafana workspace provisioning and configuration.

## Architecture

The observability stack consists of:

1. **Amazon Managed Grafana Workspace** - Essential tier ($9/month)
2. **IAM Roles and Policies** - User access control
3. **Data Source Integration** - CloudWatch, Logs, OpenSearch
4. **Cost Monitoring** - Budget tracking and optimization

## Directory Structure

```
docs/observability/
├── README.md                           # This file
├── grafana-workspace-guide.md          # Complete user guide
└── troubleshooting.md                  # Common issues and solutions

sst/observability/
├── grafana-workspace.yaml              # Main workspace CloudFormation template
├── grafana-user-policies.yaml          # User access policies template
└── tags.ts                            # Centralized tagging utilities

scripts/observability/
├── deploy-grafana-workspace.sh         # Deploy main workspace
├── deploy-grafana-user-policies.sh     # Deploy user access policies
└── validate-grafana-workspace.sh       # Validate deployment
```

## Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- CloudFormation deployment permissions
- IAM role/policy creation permissions

### Deployment Steps

1. **Deploy Grafana Workspace**:

   ```bash
   cd apps/api/lego-api-serverless
   ./scripts/observability/deploy-grafana-workspace.sh --stage dev
   ```

2. **Deploy User Policies**:

   ```bash
   ./scripts/observability/deploy-grafana-user-policies.sh --stage dev
   ```

3. **Validate Deployment**:

   ```bash
   ./scripts/observability/validate-grafana-workspace.sh --stage dev
   ```

4. **Manual Configuration** (AWS Console):
   - Set workspace tier to Essential
   - Configure timezone to UTC
   - Set organization name to UserMetrics

### Access Workspace

1. Get workspace URL from deployment outputs
2. Access via AWS Console or direct URL
3. Authenticate using IAM credentials

## Configuration

### Workspace Settings

- **Name**: `user-metrics-grafana-{stage}`
- **Tier**: Essential ($9/month)
- **Authentication**: IAM-based
- **Organization**: UserMetrics
- **Timezone**: UTC
- **VPC**: Service-managed endpoint

### User Access

**Admin Access**:

- User: `user-metrics-grafana-admin-{stage}`
- Full workspace management permissions

**Team Access** (Viewer):

- Engineering: `user-metrics-grafana-engineering-{stage}`
- Product: `user-metrics-grafana-product-{stage}`
- Customer Success: `user-metrics-grafana-cs-{stage}`

### Data Sources

1. **CloudWatch**:
   - Lambda metrics (duration, errors, invocations)
   - API Gateway metrics (requests, latency, errors)
   - RDS metrics (CPU, connections, memory)
   - Redis metrics (memory, evictions, CPU)
   - OpenSearch metrics (cluster health, indexing)

2. **CloudWatch Logs**:
   - Lambda function logs
   - Application logs
   - Log Insights queries

3. **OpenSearch** (Future - Story 2.4):
   - Search analytics
   - Custom metrics

## Cost Information

### Monthly Costs

| Component      | Cost        | Notes                    |
| -------------- | ----------- | ------------------------ |
| Essential Tier | $9.00       | Fixed monthly cost       |
| Data Transfer  | ~$1.00      | Estimated based on usage |
| **Total**      | **~$10.00** | Per environment          |

### Budget Tracking

- Tagged with `Project: UserMetrics`
- Included in $150/month observability budget
- Cost anomaly detection configured
- Monthly cost reviews scheduled

## Security

### IAM Permissions

**Service Role Permissions**:

- CloudWatch: Read-only access to metrics and alarms
- CloudWatch Logs: Query access for Log Insights
- OpenSearch: Read-only access to domain

**User Permissions**:

- Admin: Full workspace management
- Viewer: Read-only dashboard access

### Network Security

- Service-managed VPC endpoint
- No public internet exposure required
- Integration with existing VPC security groups

## Monitoring and Alerting

### Workspace Health

- Workspace status monitoring
- Authentication failure alerts
- Data source connectivity checks

### Cost Monitoring

- Monthly budget alerts at 80% and 100%
- Cost anomaly detection ($20 threshold)
- Quarterly cost optimization reviews

## Troubleshooting

Common issues and solutions are documented in:

- [Grafana Workspace Guide](./grafana-workspace-guide.md#troubleshooting-guide)
- [AWS Documentation](https://docs.aws.amazon.com/grafana/)

### Quick Diagnostics

```bash
# Check workspace status
aws grafana describe-workspace --workspace-id <workspace-id>

# Validate IAM roles
aws iam get-role --role-name user-metrics-grafana-workspace-role-dev

# Check CloudFormation stacks
aws cloudformation describe-stacks --stack-name user-metrics-grafana-dev
```

## Development

### Adding New Data Sources

1. Update service role permissions in `grafana-workspace.yaml`
2. Redeploy workspace stack
3. Configure data source in Grafana UI

### Adding New Users

1. Add users to appropriate IAM groups
2. Test access to workspace
3. Provide onboarding documentation

### Environment Promotion

```bash
# Deploy to staging
./scripts/observability/deploy-grafana-workspace.sh --stage staging
./scripts/observability/deploy-grafana-user-policies.sh --stage staging

# Deploy to production
./scripts/observability/deploy-grafana-workspace.sh --stage prod
./scripts/observability/deploy-grafana-user-policies.sh --stage prod
```

## Support

### Internal Support

- **Primary Contact**: engineering@example.com
- **Slack Channel**: #observability
- **Documentation**: This repository

### AWS Support

- AWS Support Console for service issues
- Amazon Managed Grafana documentation
- CloudWatch integration guides

## Related Documentation

- [User Metrics PRD](../../docs/prd/user-metrics/)
- [Architecture Documentation](../../docs/architecture/)
- [AWS Tagging Schema](../../docs/aws-tagging-schema.md)
- [Cost Monitoring Guide](../cost-monitoring-README.md)

---

**Story**: 2.1 Amazon Managed Grafana Workspace Provisioning  
**Last Updated**: 2025-11-23  
**Version**: 1.0  
**Maintained By**: Engineering Team
