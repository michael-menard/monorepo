# AWS Cost Monitoring and Budgets

**Story 5.7**: Configure AWS Cost Monitoring and Budgets

Comprehensive cost monitoring infrastructure for the LEGO API serverless migration, including budgets, alerts, anomaly detection, and cost optimization tooling.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Infrastructure Components](#infrastructure-components)
- [Cost Reporting Scripts](#cost-reporting-scripts)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## Overview

This cost monitoring solution provides:

- **AWS Budgets** with multi-threshold alerts (50%, 75%, 90%, 100%)
- **Cost Anomaly Detection** with daily monitoring
- **Slack Notifications** for budget alerts and anomalies
- **Cost Explorer Integration** for detailed cost analysis
- **Reserved Instance Analysis** for optimization recommendations
- **S3 Lifecycle Policies** for storage cost reduction
- **Monthly Cost Review Process** with standardized template

---

## Features

### ✅ Implemented Acceptance Criteria

1. ✅ AWS Budget created for monthly threshold: $800
2. ✅ Budget alerts at 50%, 75%, 90%, and 100% of threshold
3. ✅ SNS topic for budget alerts with email subscription
4. ✅ Cost allocation tags applied to all SST resources
5. ✅ Cost Explorer enabled with custom reports
6. ✅ Daily cost anomaly detection enabled
7. ✅ Slack notifications for budget alerts and cost anomalies
8. ✅ Monthly cost optimization review checklist template
9. ✅ Reserved Instance analysis for RDS, ElastiCache, OpenSearch
10. ✅ S3 lifecycle policies to reduce storage costs

---

## Prerequisites

- **Node.js**: 20.x or higher
- **AWS CLI**: Configured with appropriate credentials
- **AWS IAM Permissions**:
  - `budgets:*` (for AWS Budgets)
  - `ce:*` (for Cost Explorer and Anomaly Detection)
  - `sns:*` (for SNS topics and subscriptions)
  - `s3:PutLifecycleConfiguration` (for S3 lifecycle policies)
  - `cloudwatch:*` (for CloudWatch metrics)
- **Environment Variables**:
  - `AWS_REGION` - AWS region (default: us-east-1)
  - `AWS_ACCOUNT_ID` - AWS account ID
  - `SLACK_WEBHOOK_URL` - (Optional) Slack webhook for notifications

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Deploy Cost Monitoring Infrastructure

The cost monitoring infrastructure is integrated into the main SST deployment:

```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:production
```

### 4. Generate Cost Reports

```bash
# Generate 30-day cost report
pnpm cost:report

# Analyze Reserved Instance recommendations
pnpm cost:ri-analysis
```

### 5. Set Up Monthly Review Process

Copy the monthly cost review template and schedule the first review:

```bash
cp templates/monthly-cost-review.md reports/cost/2025-01-review.md
```

---

## Infrastructure Components

### AWS Budget

**File**: `src/infrastructure/monitoring/cost-budgets.ts`

Creates AWS Budget with:
- Monthly limit: $800
- Multi-threshold alerts: 50%, 75%, 90%, 100%, forecasted
- SNS topic integration
- Email and Slack notifications

**Key Functions**:
- `createBudget(config)` - Creates budget with all alert thresholds
- `createSlackForwarder()` - Lambda function for Slack integration

### Cost Anomaly Detection

**File**: `src/infrastructure/monitoring/cost-anomaly-detection.ts`

Creates Cost Anomaly Monitor with:
- Dimensional monitoring by AWS service
- Daily anomaly detection frequency
- $20 minimum anomaly threshold
- SNS topic integration

**Key Functions**:
- `createAnomalyDetection(config)` - Creates monitor and subscription

### S3 Lifecycle Policies

**File**: `src/infrastructure/monitoring/s3-lifecycle-policies.ts`

Applies lifecycle rules for:
- MOC files: Intelligent-Tiering after 30 days
- Gallery images: Glacier Deep Archive after 90 days
- Temporary uploads: Delete after 7 days
- Old versions: Glacier after 30 days, delete after 90 days

**Key Functions**:
- `applyS3LifecyclePolicies(config)` - Applies all lifecycle rules
- `estimateLifecycleSavings(totalGB)` - Calculates estimated savings

**Estimated Savings**:
- For 1TB of data: $13-18/month (57-78% reduction)

### Slack Budget Forwarder

**File**: `src/infrastructure/monitoring/slack-budget-forwarder.js`

Lambda function that:
- Receives SNS notifications from AWS Budgets
- Parses budget alert messages
- Formats Slack attachments with color-coded severity
- Posts to Slack webhook

**Message Format**:
- 💰 Green for 50% threshold
- ⚠️ Warning for 75% threshold
- 🚨 Danger for 90%+ threshold

---

## Cost Reporting Scripts

### Generate Cost Report

**File**: `scripts/cost-monitoring/generate-cost-report.ts`

Generates comprehensive cost reports using AWS Cost Explorer API.

**Usage**:
```bash
# Default: 30-day report
pnpm cost:report

# Custom: 90-day report
pnpm cost:report 90

# Custom output directory
pnpm cost:report 30 reports/custom-dir
```

**Output Files**:
- `cost-report.json` - Structured JSON report
- `cost-summary.txt` - Human-readable summary

**Report Includes**:
- Total monthly cost
- Cost breakdown by service (sorted by cost)
- Daily cost trend (last 7 days)
- Service cost percentages

### Analyze Reserved Instances

**File**: `scripts/cost-monitoring/analyze-reserved-instances.ts`

Analyzes RI recommendations for RDS, ElastiCache, and OpenSearch.

**Usage**:
```bash
# Default output
pnpm cost:ri-analysis

# Custom output directory
pnpm cost:ri-analysis reports/ri-custom
```

**Output Files**:
- `ri-analysis.json` - Structured JSON analysis
- `ri-summary.txt` - Human-readable summary

**Analysis Includes**:
- Monthly and annual savings estimates
- Recommended instance types and quantities
- Upfront and recurring costs
- Cost-effectiveness recommendation (threshold: $20/month)

---

## Usage Guide

### Monitoring Budget Alerts

#### Email Notifications

1. Confirm SNS email subscription (check inbox after deployment)
2. Budget alerts will be sent to subscribed email address
3. Email includes threshold, current spend, and budget limit

#### Slack Notifications

1. Create Slack incoming webhook in your workspace
2. Set `SLACK_WEBHOOK_URL` environment variable
3. Deploy infrastructure
4. Alerts will be posted to configured Slack channel

### Reviewing Cost Anomalies

Cost anomaly detection runs daily and alerts on:
- Cost spikes >$20 (absolute impact)
- Unusual service-level cost patterns

**To investigate anomalies**:
1. Check CloudWatch Cost Anomaly Detection console
2. Review Cost Explorer for affected services
3. Analyze CloudWatch metrics for resource utilization
4. Check for unexpected traffic spikes or misconfigurations

### Running Monthly Cost Review

1. **Week 1 of each month**: Generate cost reports

```bash
pnpm cost:report
pnpm cost:ri-analysis
```

2. **Fill out review template**:

```bash
cp templates/monthly-cost-review.md reports/cost/$(date +%Y-%m)-review.md
```

3. **Complete checklist** in template:
   - Review budget alerts
   - Analyze cost trends
   - Check optimization opportunities
   - Evaluate RI recommendations

4. **Submit for approval**:
   - DevOps Lead
   - Engineering Manager
   - Finance/Accounting

### Optimizing S3 Costs

S3 lifecycle policies are automatically applied during deployment. To verify:

```bash
aws s3api get-bucket-lifecycle-configuration --bucket lego-api-files-production
```

**Monitor lifecycle transitions**:
- Check S3 Storage Class Analysis in AWS Console
- Review S3 storage metrics in Cost Explorer
- Expected savings: 57-78% reduction after 90 days

---

## AWS Tagging Schema Compliance

All cost monitoring infrastructure resources comply with the organization's [AWS Tagging Schema](../../../docs/aws-tagging-schema.md).

### Required Tags (Applied to ALL Resources)

| Tag Key | Value | Purpose |
|---------|-------|---------|
| `Project` | `lego-api` | Group resources by project |
| `Environment` | `dev`, `staging`, `prod` | Separate by deployment environment |
| `ManagedBy` | `SST` | Identify infrastructure-as-code tool |
| `CostCenter` | `Engineering` | Budget allocation and chargeback |
| `Owner` | `engineering@bricklink.com` | Point of contact for resource |

### Functional Tags (Resource-Specific)

**Observability Resources** (SNS, Budget, Anomaly Monitor):
- `Component: Observability`
- `Function: Monitoring`

**Lambda Functions** (Slack Forwarder):
- `Component: Observability`
- `Function: Compute`
- `ServiceType: Lambda`
- `Runtime: nodejs20.x`
- `Endpoint: BudgetSlackForwarder`

**IAM Roles**:
- `Component: IAM`
- `Function: AccessControl`
- `Purpose: LambdaExecution`
- `AccessLevel: ReadWrite`

### Cost Allocation Tags

- `BudgetAlert: $800` - Monthly budget threshold
- `CostOptimization: Review` - Flagged for regular cost review

---

## Configuration

### Budget Configuration

Edit budget parameters in `src/infrastructure/monitoring/cost-budgets.ts`:

```typescript
export interface BudgetConfig {
  monthlyLimit: number          // Budget limit in USD
  emailAddress: string          // Email for notifications
  slackWebhookUrl?: string      // Optional Slack webhook
  accountId: string             // AWS account ID
  stage: string                 // Environment (staging/production)
}
```

### Anomaly Detection Configuration

Edit anomaly detection parameters in `src/infrastructure/monitoring/cost-anomaly-detection.ts`:

```typescript
export interface AnomalyDetectionConfig {
  snsTopicArn: string          // SNS topic for alerts
  thresholdAmount: number      // Minimum anomaly threshold ($)
  stage: string                // Environment
}
```

### S3 Lifecycle Policies

Edit lifecycle rules in `src/infrastructure/monitoring/s3-lifecycle-policies.ts`:

```typescript
// Example: Change Glacier transition from 90 days to 60 days
transitions: [
  {
    days: 60,  // Changed from 90
    storageClass: 'DEEP_ARCHIVE',
  },
]
```

---

## Troubleshooting

### Budget Alerts Not Received

**Symptoms**: No email/Slack notifications for budget thresholds

**Solutions**:
1. **Check SNS subscription status**:
   ```bash
   aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:REGION:ACCOUNT:lego-api-budget-alerts
   ```
2. **Confirm email subscription** (check spam folder)
3. **Verify Slack Lambda logs**:
   ```bash
   aws logs tail /aws/lambda/lego-api-budget-slack-forwarder --follow
   ```
4. **Check budget configuration**:
   ```bash
   aws budgets describe-budget --account-id ACCOUNT_ID --budget-name lego-api-monthly-budget
   ```

### Cost Anomaly Detection Not Working

**Symptoms**: No anomaly alerts despite cost spikes

**Solutions**:
1. **Verify anomaly monitor is active**:
   ```bash
   aws ce get-anomaly-monitors
   ```
2. **Check threshold configuration** (must be >$20)
3. **Wait 24-48 hours** for ML model to establish baseline
4. **Review CloudWatch Logs** for anomaly subscription

### Cost Reports Fail to Generate

**Symptoms**: Script errors when running `pnpm cost:report`

**Solutions**:
1. **Check AWS credentials**:
   ```bash
   aws sts get-caller-identity
   ```
2. **Verify IAM permissions** (need `ce:GetCostAndUsage`)
3. **Check Cost Explorer is enabled** in AWS Console
4. **Wait 24 hours** after Cost Explorer activation

### S3 Lifecycle Policies Not Applied

**Symptoms**: Objects not transitioning to cheaper storage classes

**Solutions**:
1. **Verify lifecycle configuration**:
   ```bash
   aws s3api get-bucket-lifecycle-configuration --bucket BUCKET_NAME
   ```
2. **Check object age** (transitions occur after specified days)
3. **Review S3 Storage Class Analysis** for recommendations
4. **Wait 24-48 hours** for policy application

---

## Best Practices

### Budget Management

1. **Set budget to 10-15% above projected costs** for buffer
2. **Review forecasted alerts monthly** to adjust budget
3. **Investigate 75% threshold alerts immediately**
4. **Implement cost controls at 90% threshold**

### Cost Optimization

1. **Run RI analysis quarterly** to identify new opportunities
2. **Review Lambda memory configurations monthly**
3. **Analyze RDS/ElastiCache utilization** for right-sizing
4. **Apply S3 lifecycle policies to all buckets**
5. **Use CloudWatch Cost Anomaly Detection** as early warning system

### Monthly Review Process

1. **Schedule review for first week of month**
2. **Include stakeholders** from DevOps, Engineering, Finance
3. **Document all optimization actions** in review template
4. **Track savings month-over-month**
5. **Set next month's focus areas**

### Reserved Instances

1. **Only purchase if savings >$20/month**
2. **Use no-upfront payment option** for flexibility
3. **Start with 1-year terms** before committing to 3-year
4. **Re-evaluate quarterly** as usage grows

---

## FAQ

### Q: What is the monthly budget threshold?
**A**: $800/month, providing 14% buffer above projected $700/month cost.

### Q: When do budget alerts trigger?
**A**: At 50%, 75%, 90%, 100% of budget, plus forecasted overage alert.

### Q: How often does cost anomaly detection run?
**A**: Daily, with alerts sent within 24 hours of detection.

### Q: What is the minimum anomaly threshold?
**A**: $20 absolute impact. Anomalies below $20 will not trigger alerts.

### Q: How long before S3 lifecycle policies take effect?
**A**: 24-48 hours after deployment. Transitions occur daily.

### Q: How much can I save with S3 lifecycle policies?
**A**: Estimated 57-78% reduction in storage costs (for 1TB: $13-18/month savings).

### Q: Should I purchase Reserved Instances?
**A**: Only if estimated savings are ≥$20/month. Run `pnpm cost:ri-analysis` for recommendations.

### Q: How do I integrate Slack notifications?
**A**: Set `SLACK_WEBHOOK_URL` environment variable and redeploy. See [Slack Notifications](#slack-notifications) section.

### Q: What AWS permissions are required?
**A**: See [Prerequisites](#prerequisites) section for complete list.

### Q: How do I generate a cost report for a custom date range?
**A**: Use `pnpm cost:report <days>` where `<days>` is the lookback period (e.g., `pnpm cost:report 90`).

---

## Related Documentation

- [Story 5.6: Performance and Cost Validation](../stories/complete/5.6-performance-cost-validation.md)
- [Story 5.8: ECS Decommissioning](../stories/5.8-ecs-decommission.md)
- [AWS Budgets Documentation](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)

---

## Support

For questions or issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review AWS Cost Explorer console for detailed cost breakdown
3. Check CloudWatch Logs for Lambda/automation errors
4. Contact DevOps team

---

**Last Updated**: January 2025
**Story**: 5.7 - Configure AWS Cost Monitoring and Budgets
**Status**: ✅ Implemented
