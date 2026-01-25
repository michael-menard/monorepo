---
story_id: KNOW-016-A
title: PostgreSQL Monitoring - Foundation
status: backlog
split_from: KNOW-016
split_part: 1 of 2
epic: knowledgebase-mcp
created: 2026-01-25
updated: 2026-01-25
depends_on: [KNOW-001]
blocks: [KNOW-016-B]
assignee: null
priority: P1
story_points: 2-3
tags: [infrastructure, monitoring, cloudwatch, observability, split-story]
source: Split from KNOW-016 (Epic Elaboration - Platform Finding PLAT-004)
---

# KNOW-016-A: PostgreSQL Monitoring - Foundation

## Split Context

This story is part of a split from KNOW-016 (PostgreSQL Monitoring).

- **Original Story:** KNOW-016
- **Split Reason:** Story exceeded sizing guidelines with 13 acceptance criteria spanning multiple independent concerns (infrastructure creation, production validation, documentation, multi-environment support). Split improves clarity, testability, and parallelizability.
- **This Part:** 1 of 2 (Foundation)
- **Dependency:** Depends on KNOW-001 (Package Infrastructure Setup)
- **Blocks:** KNOW-016-B (Production Readiness)

**KNOW-016-A (Foundation)** creates all AWS resources (dashboard, alarms, SNS topics), implements Infrastructure-as-Code for reproducible deployment, validates infrastructure creation works, and documents IAM permissions and error handling.

**KNOW-016-B (Production Readiness)** focuses on operational readiness including runbooks, documentation, end-to-end testing in staging, threshold tuning procedures, cost estimation, and multi-environment configuration.

## Context

Production deployment of the Knowledge Base MCP server requires comprehensive observability to enable proactive incident management. Without monitoring, issues like connection exhaustion, high CPU utilization, or disk space problems can go unnoticed until service degradation or outages occur.

This story (Foundation split) establishes the core monitoring infrastructure: CloudWatch dashboards and alerting infrastructure for PostgreSQL metrics. It builds on the PostgreSQL infrastructure from KNOW-001 and focuses on creating the AWS resources and IaC needed for operational readiness.

This is a **Platform finding** (PLAT-004) from epic elaboration, identified as essential for proactive incident management in production.

## Goal

Implement core monitoring infrastructure setup with:
- CloudWatch dashboards with key PostgreSQL metrics visualization
- CloudWatch alarms for critical thresholds (connections, CPU, memory, latency)
- SNS topics for alert notifications
- Infrastructure-as-Code for reproducible deployment
- IAM permissions documentation
- Error handling for infrastructure failures

## Non-Goals

- **Alert testing and notification delivery** - Deferred to KNOW-016-B (Production Readiness)
- **Threshold documentation with rationale** - Deferred to KNOW-016-B
- **Runbook documentation** - Deferred to KNOW-016-B
- **Staging environment validation** - Deferred to KNOW-016-B
- **Cost estimation** - Deferred to KNOW-016-B
- **Multi-environment support** - Deferred to KNOW-016-B
- **Custom application metrics** - pgvector-specific metrics deferred to KNOW-012 (performance benchmarking)
- **Application performance monitoring (APM)** - Distributed tracing deferred
- **Log aggregation** - CloudWatch Logs integration is separate concern
- **Grafana/Prometheus** - Use CloudWatch native tools only
- **Anomaly detection** - CloudWatch Insights ML features deferred to advanced monitoring story
- **Local development monitoring** - Docker Compose databases don't emit CloudWatch metrics

## Scope

### Packages Affected

**New infrastructure:**
- CloudWatch dashboards (AWS resource)
- CloudWatch alarms (AWS resource)
- SNS topics (AWS resource)
- IAM policies for CloudWatch access (AWS resource)

**Potentially modified:**
- `apps/api/knowledge-base/README.md` - Add monitoring section (basic setup only)
- Infrastructure-as-Code files (Terraform/CDK/CloudFormation):
  - New: `infra/monitoring/cloudwatch-dashboards.tf` (or equivalent)
  - New: `infra/monitoring/cloudwatch-alarms.tf`
  - New: `infra/monitoring/sns-topics.tf`

**No code changes:**
- Application code unchanged
- Database schema unchanged
- No new API endpoints

### Endpoints

**None** - This is infrastructure setup; no application endpoints exposed.

### Infrastructure

**New:**
- CloudWatch dashboard: `kb-postgresql-dashboard`
- CloudWatch alarms (4-6 alarms for key metrics)
- SNS topic: `kb-postgresql-alerts`
- IAM policies for CloudWatch and SNS access

**Environment variables required:**
- `AWS_REGION` - AWS region for CloudWatch resources (default: `us-west-2`)
- `KB_SNS_TOPIC_ARN` - SNS topic ARN for alert notifications
- `KB_RDS_INSTANCE_ID` - RDS instance identifier for metric queries (production only)

**AWS resources:**
- CloudWatch dashboard with 5-10 metric widgets
- CloudWatch alarms for critical thresholds
- SNS topic with email/webhook subscriptions

## Acceptance Criteria

### AC1: CloudWatch Dashboard Created
- [ ] Dashboard named `kb-postgresql-dashboard` exists in CloudWatch
- [ ] Dashboard includes widgets for key metrics:
  - Database connections (current, max)
  - CPU utilization (percentage)
  - Freeable memory (bytes, percentage)
  - Read latency (milliseconds)
  - Write latency (milliseconds)
- [ ] Dashboard JSON definition committed to repo at `infra/monitoring/dashboard-config.json`
- [ ] Dashboard accessible via shareable URL
- [ ] All widgets render without "No data" errors when database is active
- [ ] Dashboard auto-refreshes every 5 minutes (configurable)

### AC2: Key Metrics Collected
- [ ] PostgreSQL metrics flowing to CloudWatch
- [ ] Metrics namespace is `AWS/RDS` (for RDS instances) or custom namespace (for self-hosted)
- [ ] Metric data points have timestamps within last 15 minutes
- [ ] No gaps in metric collection for active database
- [ ] Metrics available via AWS CLI: `aws cloudwatch get-metric-statistics`
- [ ] README documents metric namespace and available metrics

### AC3: CloudWatch Alarms Configured
- [ ] Alarm: `kb-postgres-high-connections` triggers at 80% of max_connections
- [ ] Alarm: `kb-postgres-high-cpu` triggers at 80% CPU for 5 minutes (2 consecutive periods)
- [ ] Alarm: `kb-postgres-low-memory` triggers at <10% free memory for 5 minutes
- [ ] Alarm: `kb-postgres-high-read-latency` triggers at >100ms average for 5 minutes
- [ ] All alarms reference SNS topic `kb-postgresql-alerts`
- [ ] Alarms are in OK or INSUFFICIENT_DATA state initially (not ALARM)
- [ ] Alarm configurations committed to repo via IaC

### AC4: SNS Topic and Subscriptions
- [ ] SNS topic `kb-postgresql-alerts` exists in correct region
- [ ] SNS topic ARN documented in README and environment variables
- [ ] At least one subscription configured (email or webhook)
- [ ] Email subscriptions confirmed (not pending confirmation)
- [ ] Test notification delivered successfully (manual alarm trigger)
- [ ] SNS topic policy allows CloudWatch alarms to publish

### AC6: Infrastructure-as-Code
- [ ] IaC choice documented (Terraform/CDK/CloudFormation/CLI)
- [ ] Dashboard, alarms, and SNS topics defined in IaC files
- [ ] `terraform plan` (or equivalent) shows resources to be created
- [ ] `terraform apply` creates all resources without errors
- [ ] IaC files committed to repo under `infra/monitoring/`
- [ ] IaC includes variables for environment-specific configuration (staging vs production thresholds)

### AC9: IAM Permissions Documented
- [ ] README lists all required IAM permissions:
  - `cloudwatch:PutDashboard`
  - `cloudwatch:GetDashboard`
  - `cloudwatch:PutMetricAlarm`
  - `cloudwatch:DescribeAlarms`
  - `sns:CreateTopic`
  - `sns:Subscribe`
  - `sns:Publish`
- [ ] Sample IAM policy JSON provided in README or `infra/iam/cloudwatch-policy.json`
- [ ] CI/CD pipeline service account has required permissions

### AC12: Error Handling
- [ ] Clear error if IAM permissions insufficient (AccessDeniedException)
- [ ] Clear error if SNS topic not found (alarm creation fails gracefully)
- [ ] Clear error if dashboard JSON invalid (validation before deployment)
- [ ] Troubleshooting section in README covers common errors

## Reuse Plan

### Existing Patterns to Follow

**Infrastructure-as-Code:**
- Use Terraform if existing monorepo infrastructure uses Terraform
- Follow existing patterns for AWS resource naming conventions
- Align with existing environment variable management (staging/prod)

**Monitoring patterns:**
- Reference existing CloudWatch dashboards in monorepo (if any)
- Follow existing SNS topic naming and subscription patterns

### New Components

**New:**
- CloudWatch monitoring for PostgreSQL databases (first use in this monorepo)
- SNS alert integration (may be first use, or may follow existing patterns)

## Architecture Notes

### Ports & Adapters

**Infrastructure Layer:**
- CloudWatch provides observability abstraction over RDS metrics
- SNS provides notification abstraction (decouples alarms from notification channels)
- IaC provides deployment abstraction (reproducible infrastructure)

**Monitoring Flow:**
```
RDS PostgreSQL → CloudWatch Metrics → CloudWatch Dashboard (visualization)
                                    → CloudWatch Alarms → SNS Topic → Email/Webhook
```

**Separation of Concerns:**
- Application code does NOT emit metrics (uses standard RDS metrics only)
- CloudWatch alarms separate from application logic (infrastructure concern)
- Notification routing handled by SNS (not application responsibility)

### Design Decisions

#### Metric Source: AWS/RDS vs Custom
**Decision:** Use AWS/RDS namespace for production RDS instances.

**Rationale:**
- RDS provides comprehensive PostgreSQL metrics out of the box
- No custom instrumentation required (zero application code changes)
- Industry-standard metrics for database monitoring
- Cost-effective (included with RDS)

**Implementation:** Metrics query references `AWS/RDS` namespace with dimension `DBInstanceIdentifier`.

**Limitation:** Local Docker Compose databases (KNOW-001) do not emit CloudWatch metrics. Monitoring is production-only.

#### Infrastructure-as-Code Tooling
**Decision:** Use Terraform for CloudWatch resources (assuming monorepo uses Terraform).

**Rationale:**
- Reproducible infrastructure deployment
- Version-controlled dashboard and alarm configuration
- Environment-specific configuration via variables
- Drift detection (terraform plan)

**Alternative:** If monorepo uses CDK or CloudFormation, use that instead for consistency.

#### Alert Thresholds
**Decision:** Conservative initial thresholds with planned review after baseline data collected (deferred to KNOW-016-B).

**Initial thresholds:**
- Connection count: 80% of max_connections (80/100)
- CPU utilization: 80% average over 5 minutes (2 consecutive periods)
- Freeable memory: <10% free for 5 minutes (2 consecutive periods)
- Read/Write latency: >100ms average for 5 minutes (2 consecutive periods)

**Note:** Threshold rationale and tuning procedures documented in KNOW-016-B (Production Readiness).

#### SNS Topic Configuration
**Decision:** Single SNS topic for all PostgreSQL alerts, separate topics per environment.

**Rationale:**
- Simplifies alarm configuration (all alarms reference same topic)
- Allows flexible subscription management (add/remove endpoints without alarm changes)
- Environment isolation (staging alerts don't go to production channels)

**Topic naming:** `kb-postgresql-alerts-staging`, `kb-postgresql-alerts-production`

## Infrastructure Notes

### Local Development

**Not applicable** - CloudWatch monitoring only works with AWS resources. Local Docker Compose databases (KNOW-001) do not emit CloudWatch metrics.

**Alternative for local monitoring:**
- pgAdmin for manual database inspection
- Grafana + Prometheus (deferred to separate story if needed)
- Direct PostgreSQL connection for query analysis

**Documentation must clarify:** Monitoring is production-only. Local development relies on logs and manual inspection.

### Deployment Prerequisites

**Prerequisites:**
- RDS PostgreSQL instance (staging or production)
- AWS credentials with CloudWatch and SNS permissions
- Terraform installed (or equivalent IaC tool)

**Setup flow:**
1. Deploy RDS instance (may already exist from KNOW-001)
2. Deploy IaC for CloudWatch dashboard, alarms, SNS topics
3. Confirm SNS subscriptions (manual email verification step)
4. Verify metrics flowing to dashboard (wait 5-15 minutes)
5. Test manual alarm trigger and notification delivery (basic sanity check)

**Note:** Comprehensive staging validation and production deployment procedures documented in KNOW-016-B.

## HTTP Contract Plan

**Not applicable** - This story does not expose any HTTP endpoints. Monitoring is infrastructure-only.

## Seed Requirements

**Not applicable** - No database seeding required for monitoring infrastructure.

## Test Plan

> Scoped to Foundation split ACs only

### Scope Summary

- **Endpoints touched:** None (infrastructure story)
- **UI touched:** No
- **Data/storage touched:** Yes (PostgreSQL metrics, CloudWatch integration)

### Happy Path Tests

#### Test 1: CloudWatch Dashboard Creation (AC1)
**Setup:** AWS account with CloudWatch access, PostgreSQL running, AWS credentials configured

**Action:**
```bash
aws cloudwatch put-dashboard --dashboard-name kb-postgresql-dashboard --dashboard-body file://dashboard-config.json
```

**Expected:**
- Dashboard created successfully (200 status)
- Dashboard accessible via CloudWatch console
- All widgets render without errors
- Metrics visible (not "No data")

**Evidence:**
- AWS CLI output confirms creation
- Console screenshot showing dashboard
- Dashboard JSON validated

#### Test 2: Key Metrics Collection (AC2)
**Setup:** PostgreSQL with active queries, CloudWatch metrics configured

**Action:**
```bash
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections --dimensions Name=DBInstanceIdentifier,Value=kb-postgres --start-time <1h-ago> --end-time <now> --period 300 --statistics Average
```

**Expected:**
- Metrics successfully retrieved
- Data points show recent activity
- Values align with actual database state

**Evidence:**
- CloudWatch API returns data points
- Timestamps show continuous collection
- No gaps in metric timeline

#### Test 3: Alert Policy Creation (AC3)
**Setup:** Dashboard exists, metrics flowing, SNS topic configured

**Action:**
```bash
aws cloudwatch put-metric-alarm --alarm-name kb-postgres-high-connections --metric-name DatabaseConnections --namespace AWS/RDS --threshold 80 --comparison-operator GreaterThanThreshold --alarm-actions arn:aws:sns:region:account:kb-alerts
```

**Expected:**
- Alarm created successfully
- Alarm in OK state initially
- SNS topic correctly associated

**Evidence:**
- AWS CLI confirms alarm creation
- Alarm visible in console
- State shows "OK" or "INSUFFICIENT_DATA"

#### Test 4: SNS Topic and Subscriptions (AC4)
**Setup:** SNS topic created via IaC

**Action:**
```bash
aws sns create-topic --name kb-postgresql-alerts
aws sns subscribe --topic-arn <topic-arn> --protocol email --notification-endpoint team@example.com
# Confirm subscription via email link
aws cloudwatch set-alarm-state --alarm-name kb-postgres-high-connections --state-value ALARM --state-reason "Manual test"
```

**Expected:**
- Topic created successfully
- Subscription confirmed (not pending)
- Test notification delivered to email

**Evidence:**
- SNS topic exists
- Subscription status: confirmed
- Email received with alarm details

#### Test 5: Infrastructure-as-Code Deployment (AC6)
**Setup:** IaC files committed to repo

**Action:**
```bash
terraform init
terraform plan
terraform apply
```

**Expected:**
- Plan shows resources to be created (dashboard, alarms, SNS topics)
- Apply creates all resources without errors
- Resources visible in AWS Console

**Evidence:**
- Terraform output confirms resource creation
- AWS Console shows all resources
- No errors in terraform output

### Error Cases

#### Error 1: Missing Metrics (Database Not Instrumented) (AC2)
**Setup:** Dashboard configured but metrics not flowing

**Expected:** Dashboard widgets show "No data available", clear error message

**Evidence:** CloudWatch API returns empty data points

#### Error 2: Invalid Alarm Threshold (AC3)
**Setup:** Create alarm with negative threshold

**Expected:** AWS CLI validation error, alarm not created

**Evidence:** CLI shows validation error message

#### Error 3: SNS Topic Not Found (AC4)
**Setup:** Alarm references non-existent SNS topic

**Expected:** Alarm created but notifications fail, CloudWatch alarm history shows delivery failures

**Evidence:** Alarm action history shows "Failed to publish to SNS"

#### Error 4: Insufficient IAM Permissions (AC9, AC12)
**Setup:** User lacks CloudWatch:PutDashboard permission

**Expected:** AccessDeniedException, no dashboard created

**Evidence:** CLI output shows IAM permission error

### Required Tooling Evidence

**Dashboard verification:**
```bash
aws cloudwatch list-dashboards
aws cloudwatch get-dashboard --dashboard-name kb-postgresql-dashboard
```

**Metrics verification:**
```bash
aws cloudwatch list-metrics --namespace AWS/RDS
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections --dimensions Name=DBInstanceIdentifier,Value=kb-postgres --start-time <1h-ago> --end-time <now> --period 300 --statistics Average,Maximum
```

**Alarms verification:**
```bash
aws cloudwatch describe-alarms
aws cloudwatch describe-alarm-history --alarm-name kb-postgres-high-connections --max-records 10
aws cloudwatch set-alarm-state --alarm-name kb-postgres-high-connections --state-value ALARM --state-reason "Manual test"
```

**Required assertions:**
- Dashboard JSON valid CloudWatch schema
- Key metrics present: DatabaseConnections, CPUUtilization, FreeableMemory, ReadLatency, WriteLatency
- Alarm state is OK, ALARM, or INSUFFICIENT_DATA
- SNS topic ARNs valid and subscriptions confirmed

### Risks

1. **RDS vs Local Metrics:** Docker Compose databases don't emit CloudWatch metrics. Test in AWS staging.
2. **Dashboard Drift:** Use IaC only, no manual changes.
3. **SNS Subscription Confirmation:** Manual email verification required.
4. **IAM Permission Gaps:** Document all required permissions, provide sample policy.
5. **Dashboard JSON Complexity:** Build in console, export JSON, validate before deployment.

## UI/UX Notes

**SKIPPED** - This story does not touch any UI components. Monitoring is performed via AWS CloudWatch Console (out of scope for UI/UX review).

## Dev Feasibility Review

**Feasible:** Yes
**Confidence:** High

### Key Findings

**Likely change surface:**
- New infrastructure: CloudWatch dashboards, alarms, SNS topics
- IaC files: `infra/monitoring/*.tf`
- Documentation: README (basic setup only)
- No application code changes

**Top risks:**
1. **Local vs Production Metric Source Mismatch** - Docker Compose doesn't emit CloudWatch metrics, requires AWS staging testing
2. **SNS Topic Configuration** - Subscription confirmation required, test notification delivery
3. **IAM Permission Gaps** - Document all required permissions, provide sample policy
4. **Dashboard JSON Complexity** - Build in console, export JSON, validate before deployment
5. **Terraform State Management** - Ensure proper state backend configuration

**Scope focus:**
- Limit to 5-10 key metrics initially (defer advanced visualizations)
- Standard resolution metrics only (no high-resolution)
- Single dashboard initially (avoid multi-dashboard complexity)
- No custom application instrumentation (use RDS metrics only)

**Evidence expectations:**
- Dashboard screenshot with all widgets
- Dashboard JSON committed to repo
- Alarm list (describe-alarms output)
- Test notification received (email screenshot)
- README with basic setup instructions

## Implementation Notes

### Pre-Implementation Decisions Required

**REQUIRED DECISIONS:**
1. **IaC Tooling:** Terraform vs CDK vs CloudFormation
   - Recommendation: Terraform (assumed monorepo standard)
2. **Alert Notification Endpoints:** Email vs PagerDuty vs Slack
   - Recommendation: Team email for MVP
3. **Environment Strategy:** Separate SNS topics for staging/production
   - Recommendation: Yes, separate topics per environment

### Implementation Order

1. **SNS topic creation** (30 min)
   - Create topics via Terraform/CLI
   - Subscribe email endpoint
   - Confirm subscriptions (manual email verification step)

2. **Dashboard creation** (1-2 hours)
   - Build dashboard in AWS Console with 5-10 key metrics
   - Export dashboard JSON
   - Commit JSON to repo at `infra/monitoring/dashboard-config.json`
   - Validate JSON with `jq` or schema validator

3. **Alarm creation** (1-2 hours)
   - Define thresholds (80% connections, 80% CPU, <10% memory, >100ms latency)
   - Create alarms via Terraform/CLI
   - Reference SNS topics for alarm actions
   - Test manual alarm trigger with `set-alarm-state`

4. **IaC implementation** (1 hour)
   - Commit all resources to Terraform/IaC
   - Test `terraform plan` and `terraform apply`
   - Validate resources created correctly

5. **Documentation** (30 min)
   - Add "Monitoring Setup" section to README
   - Document IAM permissions required
   - Document environment variables
   - Document basic troubleshooting (no metrics, IAM errors)

6. **Basic validation** (30 min)
   - Deploy to AWS staging or production
   - Verify metrics flowing to dashboard (wait 5-15 minutes)
   - Trigger test alarm manually
   - Confirm notification delivery

### Estimated Effort

**Story points:** 2-3 (approximately 4-6 hours of focused work)

**Breakdown:**
- SNS topic setup: 0.5 points
- Dashboard and alarms: 1 point
- IaC implementation: 0.5 points
- Basic documentation: 0.5 points
- Basic validation: 0.5 points

### Success Criteria Summary

A developer or ops engineer with AWS access should be able to:
1. Follow README instructions to deploy monitoring infrastructure
2. Access CloudWatch dashboard and see metrics
3. Understand basic setup (IaC usage, IAM permissions)
4. Trigger test alarm and receive notification
5. Troubleshoot basic issues using README guidance

If any step fails, error messages should reference troubleshooting section.

---

## Related Stories

**Depends on:** KNOW-001 (Package Infrastructure Setup) - Provides PostgreSQL database to monitor
**Blocks:** KNOW-016-B (PostgreSQL Monitoring - Production Readiness)

**Related:**
- KNOW-012: Large-Scale Benchmarking (may identify additional metrics to monitor)
- KNOW-015: Disaster Recovery (monitoring helps detect when recovery needed)
- KNOW-019: Query Analytics (application-level metrics, complements infrastructure monitoring)

---

## Notes

- This is the **Foundation split** - focuses on infrastructure creation and IaC
- Operational readiness (runbooks, documentation, staging validation) deferred to KNOW-016-B
- Focus on getting infrastructure deployed and validated
- SNS subscription confirmation is manual step (email verification required)
- Test in AWS staging or production (local Docker Compose doesn't emit CloudWatch metrics)

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Split Generation | — | — | — |

(To be filled during implementation)
