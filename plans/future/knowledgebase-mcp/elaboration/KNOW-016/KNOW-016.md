---
story_id: KNOW-016
title: PostgreSQL Monitoring
status: needs-split
epic: knowledgebase-mcp
created: 2026-01-25
updated: 2026-01-25
depends_on: [KNOW-001]
blocks: []
assignee: null
priority: P1
story_points: 3
tags: [infrastructure, monitoring, cloudwatch, observability, production-readiness]
source: Epic Elaboration - Platform Finding (PLAT-004)
---

# KNOW-016: PostgreSQL Monitoring

## Context

Production deployment of the Knowledge Base MCP server requires comprehensive observability to enable proactive incident management. Without monitoring, issues like connection exhaustion, high CPU utilization, or disk space problems can go unnoticed until service degradation or outages occur.

This story establishes CloudWatch dashboards and alerting infrastructure for PostgreSQL metrics, providing visibility into database health and performance. It builds on the PostgreSQL infrastructure from KNOW-001 but is focused on operational readiness for production deployment.

This is a **Platform finding** (PLAT-004) from epic elaboration, identified as essential for proactive incident management in production.

## Goal

Implement comprehensive PostgreSQL monitoring and alerting infrastructure to enable proactive incident management through observability, including:
- CloudWatch dashboards with key PostgreSQL metrics visualization
- CloudWatch alarms for critical thresholds (connections, CPU, memory, latency)
- SNS topics for alert notifications
- Runbook documentation for responding to alerts
- Infrastructure-as-Code for reproducible deployment

## Non-Goals

- **Custom application metrics** - pgvector-specific metrics deferred to KNOW-012 (performance benchmarking)
- **Application performance monitoring (APM)** - Distributed tracing, custom instrumentation deferred
- **Log aggregation** - CloudWatch Logs integration is separate concern
- **Grafana/Prometheus** - Use CloudWatch native tools only in this story
- **Anomaly detection** - CloudWatch Insights ML features deferred to advanced monitoring story
- **Local development monitoring** - Docker Compose databases don't emit CloudWatch metrics; focus is production
- **Multi-region monitoring** - Assume single-region deployment initially
- **Custom metric instrumentation** - Application-level metrics deferred to KNOW-019 (query analytics)

## Scope

### Packages Affected

**New infrastructure:**
- CloudWatch dashboards (AWS resource)
- CloudWatch alarms (AWS resource)
- SNS topics (AWS resource)
- IAM policies for CloudWatch access (AWS resource)

**Potentially modified:**
- `apps/api/knowledge-base/README.md` - Add monitoring section
- Infrastructure-as-Code files (Terraform/CDK/CloudFormation):
  - New: `infra/monitoring/cloudwatch-dashboards.tf` (or equivalent)
  - New: `infra/monitoring/cloudwatch-alarms.tf`
  - New: `infra/monitoring/sns-topics.tf`
- `docs/` - Add runbook for alert response procedures

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

### AC5: Alert Testing
- [ ] Manual alarm trigger test completed: `aws cloudwatch set-alarm-state --state-value ALARM`
- [ ] Notification received at configured endpoint within 5 minutes
- [ ] Alarm history shows state transition (OK → ALARM)
- [ ] Notification includes actionable information: metric name, threshold, current value, timestamp
- [ ] Alarm returns to OK state when condition clears

### AC6: Infrastructure-as-Code
- [ ] IaC choice documented (Terraform/CDK/CloudFormation/CLI)
- [ ] Dashboard, alarms, and SNS topics defined in IaC files
- [ ] `terraform plan` (or equivalent) shows resources to be created
- [ ] `terraform apply` creates all resources without errors
- [ ] IaC files committed to repo under `infra/monitoring/`
- [ ] IaC includes variables for environment-specific configuration (staging vs production thresholds)

### AC7: Threshold Documentation
- [ ] README documents all alert thresholds with rationale
- [ ] Thresholds defined for:
  - Connection count: 80 (assumes max_connections=100)
  - CPU utilization: 80% average over 5 minutes
  - Freeable memory: <10% free for 5 minutes
  - Read/Write latency: >100ms average for 5 minutes
- [ ] Evaluation periods documented (2 consecutive periods for most alarms)
- [ ] Plan for threshold review after baseline data collected (2-4 weeks)

### AC8: Runbook Documentation
- [ ] README includes "Monitoring and Alerts" section
- [ ] Runbook for each alert type:
  - High connections: Check for connection leaks, consider scaling
  - High CPU: Analyze slow queries, optimize indexes
  - Low memory: Check buffer pool settings, consider instance size increase
  - High latency: Check disk I/O, query performance, network
- [ ] Runbook includes access instructions for CloudWatch dashboard
- [ ] Troubleshooting section for "no metrics" and "no alerts received" scenarios
- [ ] Escalation policy documented (who responds to alerts)

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

### AC10: Staging Environment Validation
- [ ] Dashboard deployed to staging environment with RDS instance
- [ ] All metrics visible in staging dashboard (not "No data")
- [ ] Test alarm triggered successfully in staging
- [ ] Notification delivered to staging alert endpoint
- [ ] Documentation verified against staging environment

### AC11: Cost Estimation
- [ ] README includes estimated monthly cost for CloudWatch resources
- [ ] Cost breakdown:
  - Dashboards: ~$3/month per dashboard
  - Alarms: $0.10/month per alarm (standard resolution)
  - Metrics: Included with RDS (standard AWS/RDS metrics)
  - SNS: $0.50 per million notifications
- [ ] Total estimated cost: <$10/month for initial setup
- [ ] Documentation notes cost increases with metric volume and alarm frequency

### AC12: Error Handling
- [ ] Clear error if IAM permissions insufficient (AccessDeniedException)
- [ ] Clear error if SNS topic not found (alarm creation fails gracefully)
- [ ] Clear error if dashboard JSON invalid (validation before deployment)
- [ ] Troubleshooting section in README covers common errors

### AC13: Multi-Environment Support
- [ ] IaC supports both staging and production environments
- [ ] Environment-specific threshold configuration (staging may have looser thresholds)
- [ ] Dashboard names include environment suffix: `kb-postgresql-dashboard-staging`
- [ ] SNS topics separate for staging and production

## Reuse Plan

### Existing Patterns to Follow

**Infrastructure-as-Code:**
- Use Terraform if existing monorepo infrastructure uses Terraform
- Follow existing patterns for AWS resource naming conventions
- Align with existing environment variable management (staging/prod)

**Monitoring patterns:**
- Reference existing CloudWatch dashboards in monorepo (if any)
- Follow existing SNS topic naming and subscription patterns
- Align with existing runbook documentation structure

### New Components

**New:**
- CloudWatch monitoring for PostgreSQL databases (first use in this monorepo)
- SNS alert integration (may be first use, or may follow existing patterns)
- Monitoring runbook documentation (new operational docs)

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
**Decision:** Conservative initial thresholds with planned review after baseline data collected.

**Rationale:**
- Unknown usage patterns until production deployment
- Better to start with high thresholds (avoid alert fatigue) and tighten over time
- Baseline data collection period: 2-4 weeks
- Threshold review documented as operational task

**Initial thresholds:**
- Connection count: 80% of max_connections (80/100)
- CPU utilization: 80% average over 5 minutes (2 consecutive periods)
- Freeable memory: <10% free for 5 minutes (2 consecutive periods)
- Read/Write latency: >100ms average for 5 minutes (2 consecutive periods)

#### SNS Topic Configuration
**Decision:** Single SNS topic for all PostgreSQL alerts, separate topics per environment.

**Rationale:**
- Simplifies alarm configuration (all alarms reference same topic)
- Allows flexible subscription management (add/remove endpoints without alarm changes)
- Environment isolation (staging alerts don't go to production channels)

**Topic naming:** `kb-postgresql-alerts-staging`, `kb-postgresql-alerts-production`

### Monitoring Philosophy

**Proactive vs Reactive:**
- Alarms catch issues before user-visible impact (proactive)
- Dashboard enables root cause analysis when issues occur (reactive)

**Alert Severity Tiers:**
- **Critical:** Service degradation likely (high CPU, low memory, connection exhaustion)
- **Warning:** Potential future issues (deferred to follow-up stories)

**Operational Readiness:**
- Runbooks provide clear response procedures
- Escalation policy defines who responds to alerts
- Threshold review process ensures alarms remain relevant

## Infrastructure Notes

### Local Development

**Not applicable** - CloudWatch monitoring only works with AWS resources. Local Docker Compose databases (KNOW-001) do not emit CloudWatch metrics.

**Alternative for local monitoring:**
- pgAdmin for manual database inspection
- Grafana + Prometheus (deferred to separate story if needed)
- Direct PostgreSQL connection for query analysis

**Documentation must clarify:** Monitoring is production-only. Local development relies on logs and manual inspection.

### Staging Environment Requirements

**Prerequisites:**
- RDS PostgreSQL instance in staging (not Docker Compose)
- AWS credentials with CloudWatch and SNS permissions
- SNS topic subscriptions confirmed (email verification)

**Setup flow:**
1. Deploy RDS instance in staging (may already exist)
2. Deploy IaC for CloudWatch dashboard, alarms, SNS topics
3. Confirm SNS subscriptions (email verification step)
4. Verify metrics flowing to dashboard (wait 5-15 minutes)
5. Test manual alarm trigger and notification delivery

### Production Deployment

**Prerequisites:**
- RDS PostgreSQL instance in production
- AWS credentials with CloudWatch and SNS permissions
- SNS topic subscriptions confirmed (PagerDuty, team email, Slack)
- Cost alerts configured for CloudWatch service

**Deployment order:**
1. Create SNS topics (production environment)
2. Confirm all subscriptions (critical: PagerDuty integration)
3. Deploy CloudWatch dashboard
4. Deploy CloudWatch alarms (referencing SNS topics)
5. Verify dashboard shows metrics (wait 5-15 minutes)
6. Test alarm trigger (manual set-alarm-state)
7. Verify notification delivery to all channels

**Post-deployment:**
- Monitor alarm frequency for first week
- Adjust thresholds if excessive false positives
- Schedule threshold review after 2-4 weeks

## HTTP Contract Plan

**Not applicable** - This story does not expose any HTTP endpoints. Monitoring is infrastructure-only.

## Seed Requirements

**Not applicable** - No database seeding required for monitoring infrastructure.

## Test Plan

> Synthesized from `_pm/TEST-PLAN.md`

### Scope Summary

- **Endpoints touched:** None (infrastructure story)
- **UI touched:** No
- **Data/storage touched:** Yes (PostgreSQL metrics, CloudWatch integration)

### Happy Path Tests

#### Test 1: CloudWatch Dashboard Creation
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

#### Test 2: Key Metrics Collection
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

#### Test 3: Alert Policy Creation
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

#### Test 4: Alert Threshold Triggering
**Setup:** Alarm created, controllable database load

**Action:**
```bash
# Simulate high connection load
for i in {1..100}; do psql -h localhost -U kbuser -d knowledgebase -c "SELECT pg_sleep(60);" & done
```

**Expected:**
- Connection count metric increases
- Alarm transitions to ALARM state
- SNS notification sent

**Evidence:**
- Alarm history shows state transition
- Email/webhook receives notification
- Notification includes metric details

### Error Cases

#### Error 1: Missing Metrics (Database Not Instrumented)
**Setup:** Dashboard configured but metrics not flowing

**Expected:** Dashboard widgets show "No data available", clear error message

**Evidence:** CloudWatch API returns empty data points

#### Error 2: Invalid Alarm Threshold
**Setup:** Create alarm with negative threshold

**Expected:** AWS CLI validation error, alarm not created

**Evidence:** CLI shows validation error message

#### Error 3: SNS Topic Not Found
**Setup:** Alarm references non-existent SNS topic

**Expected:** Alarm created but notifications fail, CloudWatch alarm history shows delivery failures

**Evidence:** Alarm action history shows "Failed to publish to SNS"

#### Error 4: Insufficient IAM Permissions
**Setup:** User lacks CloudWatch:PutDashboard permission

**Expected:** AccessDeniedException, no dashboard created

**Evidence:** CLI output shows IAM permission error

### Edge Cases

#### Edge 1: Metric Delay and Alarm Flapping
**Setup:** Short evaluation period, load fluctuating around threshold

**Expected:** Alarm may flap between OK and ALARM states, multiple notifications

**Mitigation:** Use 2-3 period evaluation, higher threshold buffer

#### Edge 2: Dashboard Widget Limit
**Setup:** Adding >100 widgets to dashboard (AWS quota)

**Expected:** LimitExceededException, dashboard not updated

**Evidence:** CLI shows quota limit error

#### Edge 3: Historical Metrics Retention
**Setup:** Query metrics older than 15 months

**Expected:** CloudWatch returns no data beyond retention period

**Evidence:** API returns empty data points for old timestamps

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
2. **Cost Implications:** Document cost estimates, use standard resolution metrics.
3. **Alert Fatigue:** Start with conservative thresholds, plan for tuning.
4. **Dashboard Drift:** Use IaC only, no manual changes.
5. **Local Development Gap:** Monitoring is production-only, document alternatives.

## UI/UX Notes

> Synthesized from `_pm/UIUX-NOTES.md`

**SKIPPED** - This story does not touch any UI components. Monitoring is performed via AWS CloudWatch Console (out of scope for UI/UX review).

## Dev Feasibility Review

> Synthesized from `_pm/DEV-FEASIBILITY.md`

**Feasible:** Yes
**Confidence:** High

### Key Findings

**Likely change surface:**
- New infrastructure: CloudWatch dashboards, alarms, SNS topics
- IaC files: `infra/monitoring/*.tf`
- Documentation: README, runbooks
- No application code changes

**Top risks:**
1. **Local vs Production Metric Source Mismatch** - Docker Compose doesn't emit CloudWatch metrics, requires AWS staging testing
2. **Threshold Tuning Without Baseline Data** - Unknown usage patterns, start conservative and tune
3. **SNS Topic Configuration** - Subscription confirmation required, test notification delivery
4. **IAM Permission Gaps** - Document all required permissions, provide sample policy
5. **Dashboard JSON Complexity** - Build in console, export JSON, validate before deployment

**Scope tightening suggestions:**
- Limit to 5-10 key metrics initially (defer advanced visualizations)
- Standard resolution metrics only (no high-resolution)
- Single dashboard initially (avoid multi-dashboard complexity)
- No custom application instrumentation (use RDS metrics only)

**Missing requirements:**
- Exact metric thresholds (recommend: 80% connections, 80% CPU, <10% memory, >100ms latency)
- Alert notification endpoints (recommend: team email and PagerDuty)
- IaC tooling choice (recommend: Terraform for consistency)
- Environment-specific configuration (staging vs production thresholds)

**Evidence expectations:**
- Dashboard screenshot with all widgets
- Dashboard JSON committed to repo
- Alarm list (describe-alarms output)
- Test notification received (email screenshot)
- README with runbooks and troubleshooting

## Implementation Notes

### Pre-Implementation Decisions Required

**REQUIRED DECISIONS:**
1. **IaC Tooling:** Terraform vs CDK vs CloudFormation
   - Recommendation: Terraform (assumed monorepo standard)
2. **Alert Notification Endpoints:** Email vs PagerDuty vs Slack
   - Recommendation: Team email for MVP, PagerDuty for production
3. **Environment Strategy:** Separate SNS topics for staging/production
   - Recommendation: Yes, separate topics per environment

### Implementation Order

1. **SNS topic creation** (30 min)
   - Create topics via Terraform/CLI
   - Subscribe email/webhook endpoints
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

4. **Testing** (1 hour)
   - Deploy to AWS staging environment
   - Verify metrics flowing to dashboard (wait 5-15 minutes)
   - Trigger test alarm manually
   - Confirm notification delivery to SNS endpoint

5. **Documentation** (1-2 hours)
   - Add "Monitoring and Alerts" section to README
   - Write runbook for each alert type (high connections, high CPU, low memory, high latency)
   - Document troubleshooting (no metrics, no alerts received)
   - Document IAM permissions required
   - Document cost estimates

6. **Staging validation** (1 hour)
   - Deploy full stack to staging
   - Verify end-to-end monitoring
   - Test notification delivery to all channels
   - Document any issues or gaps

### Estimated Effort

**Story points:** 3 (approximately 6-8 hours of focused work)

**Breakdown:**
- SNS topic setup: 0.5 points
- Dashboard and alarms: 1.5 points
- Testing and validation: 0.5 points
- Documentation and runbooks: 0.5 points

### Success Criteria Summary

A developer or ops engineer with AWS access should be able to:
1. Follow README instructions to deploy monitoring infrastructure
2. Access CloudWatch dashboard and see metrics
3. Understand what each alarm monitors and how to respond
4. Trigger test alarm and receive notification
5. Troubleshoot common issues using README guidance

If any step fails, error messages should reference troubleshooting section.

---

## Related Stories

**Depends on:** KNOW-001 (Package Infrastructure Setup) - Provides PostgreSQL database to monitor
**Blocks:** None

**Related:**
- KNOW-012: Large-Scale Benchmarking (may identify additional metrics to monitor)
- KNOW-015: Disaster Recovery (monitoring helps detect when recovery needed)
- KNOW-019: Query Analytics (application-level metrics, complements infrastructure monitoring)

---

## Notes

- This is a **production readiness story** - essential for proactive incident management
- Focus on operational excellence: clear dashboards, actionable alerts, comprehensive runbooks
- Monitoring is AWS-only; local Docker Compose databases don't emit CloudWatch metrics
- Start with conservative thresholds and plan for tuning after baseline data collected
- SNS subscription confirmation is manual step (email verification required)
- Document everything: runbooks are as important as dashboard configuration

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Generation | — | — | — |

(To be filled during implementation)

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No monitoring for monitoring infrastructure | out-of-scope | Dead man's switch monitoring deferred; basic monitoring sufficient for MVP |
| 2 | Alert fatigue mitigation strategy missing | add-as-ac | Document alert tuning SLA (e.g., investigate if >5 false positives/week, adjust thresholds within 48 hours) |
| 3 | No connection pool monitoring | add-as-ac | Add connection pool metrics to dashboard if available in RDS; document connection pool configuration |
| 4 | Missing "no data" alert | add-as-ac | Add alarm that triggers if key metrics have no data points for 15+ minutes |
| 5 | Runbook escalation procedures vague | add-as-ac | Define escalation tiers and response time SLAs (P0: 15 min, P1: 1 hour, P2: next business day) |
| 6 | No disk space monitoring | add-as-ac | Add FreeStorageSpace metric to dashboard; create alarm for <10% free disk space |
| 7 | Alarm action groups not mentioned | out-of-scope | Severity-based SNS topics deferred to future enhancement |
| 8 | Dashboard refresh rate hardcoded | out-of-scope | 5-minute refresh sufficient for MVP; make configurable in future |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | CloudWatch Insights for log analysis | out-of-scope | Not using CloudWatch Logs for MVP; defer to follow-up story |
| 2 | Anomaly detection for baseline-free alerting | add-as-ac | Implement CloudWatch anomaly detection after 2-4 week baseline period |
| 3 | Composite alarms for reduced noise | add-as-ac | Implement composite alarms for database health state (critical = multiple conditions) |
| 4 | Slack integration for faster response | out-of-scope | Email sufficient for MVP; defer Slack integration to post-MVP |
| 5 | Dashboard templates for reusability | add-as-ac | Extract dashboard JSON into reusable template with parameterized variables |
| 6 | Auto-remediation for common issues | add-as-ac | Document as future enhancement; very high effort, defer to post-MVP |
| 7 | Cost attribution tags | add-as-ac | Add resource tags to IaC for cost tracking (project, environment) |
| 8 | Dashboard export for incident reports | add-as-ac | Document how to export dashboard graphs for incident postmortems |

### Follow-up Stories Suggested

- [ ] Create KNOW-016-A (Foundation) with 7 core ACs + selected gap/enhancement ACs
- [ ] Create KNOW-016-B (Production Readiness) with 6 operational ACs + additional gap ACs
- [ ] Plan anomaly detection story after 2-4 week baseline collection period
- [ ] Plan CloudWatch Logs integration as separate story

### Items Marked Out-of-Scope

- **No monitoring for monitoring infrastructure**: Dead man's switch monitoring valuable but adds complexity; defer to future
- **Alarm action groups/severity-based routing**: Multiple SNS topics deferred to future enhancement
- **Dashboard refresh rate**: 5-minute auto-refresh is operational default; make configurable later
- **CloudWatch Insights**: Log aggregation is separate concern; defer to follow-up story
- **Slack integration**: Email notifications sufficient for MVP; integrate post-launch
