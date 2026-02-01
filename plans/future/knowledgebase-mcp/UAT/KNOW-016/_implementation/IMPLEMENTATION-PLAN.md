# Implementation Plan - KNOW-016: PostgreSQL Monitoring

## Overview

This plan implements comprehensive PostgreSQL monitoring infrastructure using AWS CloudWatch, SNS, and Terraform. This is an infrastructure-only story with no application code changes.

## Implementation Phases

### Phase 1: Infrastructure Setup (AC1, AC2, AC3, AC4, AC6, AC9, AC13)

#### 1.1 Create Directory Structure

```
infra/
  monitoring/
    main.tf              # Terraform configuration
    variables.tf         # Input variables
    outputs.tf           # Output values
    cloudwatch-dashboard.tf  # Dashboard resources
    cloudwatch-alarms.tf     # Alarm resources
    sns-topics.tf            # SNS resources
    iam.tf                   # IAM policies
    dashboard-config.json    # Dashboard JSON template
    terraform.tfvars.example # Example variables file
```

#### 1.2 SNS Topics (AC4)

Create SNS topics with environment-specific naming:
- `kb-postgresql-alerts-staging`
- `kb-postgresql-alerts-production`

Include:
- Topic policy allowing CloudWatch to publish
- Email subscription configuration (placeholder)
- Output ARNs for alarm configuration

#### 1.3 CloudWatch Dashboard (AC1, AC2)

Create dashboard `kb-postgresql-dashboard-{env}` with widgets:

| Widget | Metric | Namespace | Description |
|--------|--------|-----------|-------------|
| Database Connections | DatabaseConnections | AWS/RDS | Current/max connections |
| CPU Utilization | CPUUtilization | AWS/RDS | CPU percentage |
| Freeable Memory | FreeableMemory | AWS/RDS | Available memory |
| Read Latency | ReadLatency | AWS/RDS | Read latency (ms) |
| Write Latency | WriteLatency | AWS/RDS | Write latency (ms) |
| Free Storage Space | FreeStorageSpace | AWS/RDS | Available disk space |

Dashboard features:
- Auto-refresh every 5 minutes (configurable)
- 2-week default time range
- Metric annotations for alarm thresholds

#### 1.4 CloudWatch Alarms (AC3)

Configure 6 alarms:

| Alarm Name | Metric | Threshold | Period | Datapoints | Action |
|------------|--------|-----------|--------|------------|--------|
| kb-postgres-high-connections | DatabaseConnections | > 80 | 5 min | 2/3 | SNS |
| kb-postgres-high-cpu | CPUUtilization | > 80% | 5 min | 2/3 | SNS |
| kb-postgres-low-memory | FreeableMemory | < 10% | 5 min | 2/3 | SNS |
| kb-postgres-high-read-latency | ReadLatency | > 100ms | 5 min | 2/3 | SNS |
| kb-postgres-low-disk-space | FreeStorageSpace | < 10% | 5 min | 2/3 | SNS |
| kb-postgres-no-data | DatabaseConnections | INSUFFICIENT_DATA | 15 min | 3/3 | SNS |

#### 1.5 IAM Policies (AC9)

Create IAM policy JSON with required permissions:
- `cloudwatch:PutDashboard`
- `cloudwatch:GetDashboard`
- `cloudwatch:PutMetricAlarm`
- `cloudwatch:DescribeAlarms`
- `sns:CreateTopic`
- `sns:Subscribe`
- `sns:Publish`

#### 1.6 Multi-Environment Support (AC13)

Use Terraform variables for:
- Environment name (staging/production)
- Alarm thresholds (looser for staging)
- SNS topic ARNs
- RDS instance identifier

### Phase 2: Validation & Testing (AC5, AC10)

Testing is performed in AWS staging environment:

1. Deploy infrastructure: `terraform apply`
2. Wait 5-15 minutes for metrics to flow
3. Verify dashboard shows metrics (not "No data")
4. Test manual alarm trigger:
   ```bash
   aws cloudwatch set-alarm-state \
     --alarm-name kb-postgres-high-connections-staging \
     --state-value ALARM \
     --state-reason "Manual test"
   ```
5. Verify notification delivery to SNS endpoint
6. Verify alarm returns to OK state

### Phase 3: Documentation (AC7, AC8, AC11, AC12)

Update `apps/api/knowledge-base/README.md` with:

#### 3.1 Monitoring and Alerts Section

- Dashboard access instructions
- Alarm overview table
- SNS topic configuration

#### 3.2 Threshold Documentation (AC7)

Document rationale for each threshold:
- Connection count: 80 (80% of max_connections=100)
- CPU utilization: 80% average over 5 minutes
- Freeable memory: <10% free for 5 minutes
- Read/Write latency: >100ms average for 5 minutes
- Disk space: <10% free (buffer for cleanup/scaling)
- No data: 15+ minutes (RDS stopped, metric collection broken)

#### 3.3 Runbook Documentation (AC8)

Runbook for each alarm:
- **High Connections**: Check connection leaks, consider scaling
- **High CPU**: Analyze slow queries, optimize indexes
- **Low Memory**: Check buffer pool settings, consider instance size
- **High Latency**: Check disk I/O, query performance, network
- **Low Disk Space**: Identify large tables, plan storage increase
- **No Data**: Verify RDS running, check CloudWatch agent

#### 3.4 Escalation Policy (AC8)

| Severity | Description | Response SLA |
|----------|-------------|--------------|
| P0 (Critical) | Database unavailable, critical resources exhausted | 15 minutes |
| P1 (High) | Performance degradation, approaching limits | 1 hour |
| P2 (Medium) | Informational, trending towards issues | Next business day |

#### 3.5 Cost Estimation (AC11)

- Dashboards: ~$3/month per dashboard
- Alarms: $0.10/month per alarm (6 alarms = $0.60/month)
- Metrics: Included with RDS
- SNS: $0.50 per million notifications
- **Total**: <$5/month for initial setup

#### 3.6 Error Handling (AC12)

Troubleshooting section for:
- AccessDeniedException (IAM permissions)
- SNS topic not found (alarm creation fails)
- Invalid dashboard JSON (validation errors)
- No metrics visible (RDS not running, wrong namespace)

## File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `infra/monitoring/main.tf` | Terraform provider and backend configuration |
| `infra/monitoring/variables.tf` | Input variables for environment configuration |
| `infra/monitoring/outputs.tf` | Output values (dashboard URL, SNS ARN) |
| `infra/monitoring/cloudwatch-dashboard.tf` | Dashboard resource definition |
| `infra/monitoring/cloudwatch-alarms.tf` | Alarm resource definitions |
| `infra/monitoring/sns-topics.tf` | SNS topic and subscription resources |
| `infra/monitoring/iam.tf` | IAM policy for CloudWatch access |
| `infra/monitoring/dashboard-config.json` | Dashboard JSON template |
| `infra/monitoring/terraform.tfvars.example` | Example variables file |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/knowledge-base/README.md` | Add Monitoring and Alerts section |

## Verification Checklist

- [ ] Terraform validates without errors: `terraform validate`
- [ ] Terraform plan shows expected resources: `terraform plan`
- [ ] Dashboard JSON is valid: `jq . dashboard-config.json`
- [ ] README documentation complete with runbooks
- [ ] All 13 acceptance criteria addressed

## Estimated Effort

| Task | Time |
|------|------|
| Terraform infrastructure | 2 hours |
| Dashboard configuration | 1 hour |
| Documentation and runbooks | 2 hours |
| Verification | 30 minutes |
| **Total** | **5.5 hours** |
