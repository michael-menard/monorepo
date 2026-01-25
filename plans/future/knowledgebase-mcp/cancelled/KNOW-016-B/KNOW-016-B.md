---
story_id: KNOW-016-B
title: PostgreSQL Monitoring - Production Readiness
status: backlog
split_from: KNOW-016
split_part: 2 of 2
epic: knowledgebase-mcp
created: 2026-01-25
updated: 2026-01-25
depends_on: [KNOW-016-A]
blocks: []
assignee: null
priority: P1
story_points: 2-3
tags: [infrastructure, monitoring, cloudwatch, observability, production-readiness, split-story]
source: Split from KNOW-016 (Epic Elaboration - Platform Finding PLAT-004)
---

# KNOW-016-B: PostgreSQL Monitoring - Production Readiness

## Split Context

This story is part of a split from KNOW-016 (PostgreSQL Monitoring).

- **Original Story:** KNOW-016
- **Split Reason:** Story exceeded sizing guidelines with 13 acceptance criteria spanning multiple independent concerns (infrastructure creation, production validation, documentation, multi-environment support). Split improves clarity, testability, and parallelizability.
- **This Part:** 2 of 2 (Production Readiness)
- **Dependency:** Depends on KNOW-016-A (Foundation)

**KNOW-016-A (Foundation)** creates all AWS resources (dashboard, alarms, SNS topics), implements Infrastructure-as-Code for reproducible deployment, validates infrastructure creation works, and documents IAM permissions and error handling.

**KNOW-016-B (Production Readiness)** focuses on operational readiness including runbooks, documentation, end-to-end testing in staging, threshold tuning procedures, cost estimation, and multi-environment configuration.

## Context

With the foundational monitoring infrastructure established in KNOW-016-A, this story focuses on making the monitoring operationally ready for production deployment. This includes comprehensive documentation, runbooks for alert response, end-to-end validation in staging, threshold documentation with tuning procedures, cost estimation, and multi-environment support.

This is a **Platform finding** (PLAT-004) from epic elaboration, identified as essential for proactive incident management in production.

## Goal

Implement production validation, testing, documentation, and operational readiness for PostgreSQL monitoring:
- Alert testing and notification delivery validation
- Threshold documentation with rationale and tuning procedures
- Runbook documentation for alert response
- Staging environment validation
- Cost estimation and monitoring
- Multi-environment support (staging/production)

## Non-Goals

- **Infrastructure creation** - Completed in KNOW-016-A (Foundation)
- **CloudWatch dashboard creation** - Completed in KNOW-016-A
- **CloudWatch alarms configuration** - Completed in KNOW-016-A
- **SNS topics setup** - Completed in KNOW-016-A
- **IaC implementation** - Completed in KNOW-016-A
- **IAM permissions documentation** - Completed in KNOW-016-A
- **Custom application metrics** - pgvector-specific metrics deferred to KNOW-012
- **Application performance monitoring (APM)** - Distributed tracing deferred
- **Log aggregation** - CloudWatch Logs integration is separate concern
- **Grafana/Prometheus** - Use CloudWatch native tools only
- **Anomaly detection** - CloudWatch Insights ML features deferred

## Scope

### Packages Affected

**Modified:**
- `apps/api/knowledge-base/README.md` - Add comprehensive monitoring documentation:
  - Alert response runbooks for each alarm type
  - Threshold documentation with rationale
  - Troubleshooting procedures
  - Cost estimation and tracking
  - Multi-environment configuration guide
  - Escalation procedures

**No infrastructure changes:**
- All infrastructure created in KNOW-016-A
- No new AWS resources
- No IaC changes (except environment-specific variable tuning)

### Endpoints

**None** - This is operational readiness; no application endpoints exposed.

### Infrastructure

**No new infrastructure:**
- All infrastructure created in KNOW-016-A (Foundation)
- This story focuses on validation, documentation, and operational readiness

## Acceptance Criteria

### AC5: Alert Testing
- [ ] Manual alarm trigger test completed: `aws cloudwatch set-alarm-state --state-value ALARM`
- [ ] Notification received at configured endpoint within 5 minutes
- [ ] Alarm history shows state transition (OK → ALARM)
- [ ] Notification includes actionable information: metric name, threshold, current value, timestamp
- [ ] Alarm returns to OK state when condition clears
- [ ] Test completed in staging environment with all alarm types

### AC7: Threshold Documentation
- [ ] README documents all alert thresholds with rationale
- [ ] Thresholds defined for:
  - Connection count: 80 (assumes max_connections=100)
  - CPU utilization: 80% average over 5 minutes
  - Freeable memory: <10% free for 5 minutes
  - Read/Write latency: >100ms average for 5 minutes
- [ ] Evaluation periods documented (2 consecutive periods for most alarms)
- [ ] Plan for threshold review after baseline data collected (2-4 weeks)
- [ ] Documentation includes how to adjust thresholds via IaC

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
- [ ] Response time SLAs defined (P0: 15 min, P1: 1 hour, P2: next business day)

### AC10: Staging Environment Validation
- [ ] Dashboard deployed to staging environment with RDS instance
- [ ] All metrics visible in staging dashboard (not "No data")
- [ ] Test alarm triggered successfully in staging
- [ ] Notification delivered to staging alert endpoint
- [ ] Documentation verified against staging environment
- [ ] End-to-end alert flow validated (metric threshold → alarm trigger → SNS notification → email delivery)

### AC11: Cost Estimation
- [ ] README includes estimated monthly cost for CloudWatch resources
- [ ] Cost breakdown:
  - Dashboards: ~$3/month per dashboard
  - Alarms: $0.10/month per alarm (standard resolution)
  - Metrics: Included with RDS (standard AWS/RDS metrics)
  - SNS: $0.50 per million notifications
- [ ] Total estimated cost: <$10/month for initial setup
- [ ] Documentation notes cost increases with metric volume and alarm frequency
- [ ] Cost monitoring recommendations documented (AWS Cost Explorer, budgets)

### AC13: Multi-Environment Support
- [ ] IaC supports both staging and production environments
- [ ] Environment-specific threshold configuration (staging may have looser thresholds)
- [ ] Dashboard names include environment suffix: `kb-postgresql-dashboard-staging`
- [ ] SNS topics separate for staging and production
- [ ] Documentation includes deployment instructions for both environments
- [ ] Environment variable configuration documented for each environment

## Reuse Plan

### Existing Patterns to Follow

**Documentation patterns:**
- Follow existing runbook documentation structure in monorepo
- Align with existing operational playbooks
- Use consistent escalation procedures across services

**Multi-environment patterns:**
- Follow existing environment variable management (staging/prod)
- Align with existing deployment procedures
- Use consistent naming conventions for environment-specific resources

### New Components

**New:**
- Monitoring runbook documentation (new operational docs)
- Alert response procedures for PostgreSQL
- Cost estimation and tracking for CloudWatch resources

## Architecture Notes

### Monitoring Philosophy

**Proactive vs Reactive:**
- Alarms catch issues before user-visible impact (proactive)
- Dashboard enables root cause analysis when issues occur (reactive)
- Runbooks provide clear response procedures

**Alert Severity Tiers:**
- **Critical (P0):** Service degradation likely (high CPU, low memory, connection exhaustion)
  - Response time: 15 minutes
  - Escalation: On-call engineer
- **Warning (P1):** Potential future issues
  - Response time: 1 hour
  - Escalation: Team lead
- **Info (P2):** Informational only
  - Response time: Next business day
  - Escalation: Team discussion

**Operational Readiness:**
- Runbooks provide clear response procedures for each alarm
- Escalation policy defines who responds to alerts
- Threshold review process ensures alarms remain relevant
- Cost monitoring ensures sustainability

## Infrastructure Notes

### Staging Environment Requirements

**Prerequisites:**
- RDS PostgreSQL instance in staging (not Docker Compose)
- Monitoring infrastructure deployed (KNOW-016-A completed)
- SNS topic subscriptions confirmed (email verification)

**Validation flow:**
1. Verify dashboard accessible in staging
2. Verify all metrics visible (wait 5-15 minutes after deployment)
3. Test alarm trigger for each alarm type manually
4. Verify notification delivery to staging alert endpoint
5. Verify alarm returns to OK state when condition clears
6. Document any issues or gaps

### Production Deployment

**Prerequisites:**
- Staging validation completed (AC10 passed)
- All runbooks reviewed and approved
- Cost estimates reviewed and approved
- SNS topic subscriptions confirmed (PagerDuty, team email, Slack)

**Deployment checklist:**
1. Review and adjust production threshold configuration
2. Deploy monitoring infrastructure to production (IaC from KNOW-016-A)
3. Confirm all SNS subscriptions (critical: PagerDuty integration)
4. Verify dashboard shows metrics (wait 5-15 minutes)
5. Test alarm trigger (manual set-alarm-state)
6. Verify notification delivery to all channels (PagerDuty, email)
7. Brief on-call team on runbook procedures

**Post-deployment:**
- Monitor alarm frequency for first week
- Adjust thresholds if excessive false positives
- Schedule threshold review after 2-4 weeks of baseline data
- Track costs weekly for first month

## HTTP Contract Plan

**Not applicable** - This story does not expose any HTTP endpoints. Monitoring is infrastructure-only.

## Seed Requirements

**Not applicable** - No database seeding required for operational readiness.

## Test Plan

> Scoped to Production Readiness split ACs only

### Scope Summary

- **Endpoints touched:** None (infrastructure story)
- **UI touched:** No
- **Data/storage touched:** Yes (PostgreSQL metrics validation in staging)

### Happy Path Tests

#### Test 1: Alert Threshold Triggering (AC5)
**Setup:** Alarm created (from KNOW-016-A), controllable database load in staging

**Action:**
```bash
# Simulate high connection load
for i in {1..100}; do psql -h localhost -U kbuser -d knowledgebase -c "SELECT pg_sleep(60);" & done
```

**Expected:**
- Connection count metric increases
- Alarm transitions to ALARM state
- SNS notification sent
- Notification received within 5 minutes
- Alarm returns to OK state when connections drop

**Evidence:**
- Alarm history shows state transition
- Email/webhook receives notification
- Notification includes metric details (name, threshold, current value, timestamp)

#### Test 2: Staging Environment Validation (AC10)
**Setup:** Monitoring infrastructure deployed to staging (KNOW-016-A completed)

**Action:**
```bash
# Verify dashboard accessible
aws cloudwatch get-dashboard --dashboard-name kb-postgresql-dashboard-staging

# Verify metrics visible
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections --dimensions Name=DBInstanceIdentifier,Value=kb-postgres-staging --start-time <1h-ago> --end-time <now> --period 300 --statistics Average

# Test alarm trigger
aws cloudwatch set-alarm-state --alarm-name kb-postgres-high-connections-staging --state-value ALARM --state-reason "Staging validation test"
```

**Expected:**
- Dashboard accessible with all metrics visible
- Metrics show recent data points (no gaps)
- Alarm trigger test delivers notification to staging endpoint
- All alarm types validated

**Evidence:**
- Dashboard screenshot showing all metrics
- Metrics API returns data points
- Notification received for test alarm
- Documentation verified against staging environment

#### Test 3: Multi-Environment Configuration (AC13)
**Setup:** IaC configured for both staging and production

**Action:**
```bash
# Deploy to staging
terraform workspace select staging
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars

# Deploy to production
terraform workspace select production
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars
```

**Expected:**
- Staging resources created with `-staging` suffix
- Production resources created with `-production` suffix
- Environment-specific thresholds applied correctly
- Separate SNS topics for each environment

**Evidence:**
- Dashboard names include environment suffix
- SNS topics separate for staging and production
- Terraform outputs show environment-specific resources

### Error Cases

#### Error 1: Notification Delivery Failure (AC5)
**Setup:** SNS subscription not confirmed

**Expected:** Alarm triggers but notification not delivered; alarm history shows delivery failure

**Evidence:** Alarm action history shows "Failed to publish to SNS" or "Subscription pending confirmation"

#### Error 2: Missing Metrics in Staging (AC10)
**Setup:** Dashboard deployed but RDS instance not emitting metrics

**Expected:** Dashboard widgets show "No data available"; troubleshooting section guides user to verify RDS instance running and CloudWatch agent configured

**Evidence:** CloudWatch API returns empty data points; troubleshooting section followed

#### Error 3: Cost Overruns (AC11)
**Setup:** High alarm frequency causing excessive SNS notifications

**Expected:** AWS Cost Explorer shows SNS costs above estimate; cost monitoring recommendations guide user to adjust alarm thresholds or evaluation periods

**Evidence:** Cost Explorer shows SNS notification costs; documentation guides threshold adjustment

### Required Tooling Evidence

**Alert testing:**
```bash
aws cloudwatch describe-alarm-history --alarm-name kb-postgres-high-connections --max-records 10
aws cloudwatch set-alarm-state --alarm-name kb-postgres-high-connections --state-value ALARM --state-reason "Manual test"
```

**Staging validation:**
```bash
aws cloudwatch get-dashboard --dashboard-name kb-postgresql-dashboard-staging
aws cloudwatch describe-alarms --alarm-name-prefix kb-postgres --state-value ALARM
```

**Cost monitoring:**
```bash
# Use AWS Cost Explorer (web console) to view CloudWatch and SNS costs
# Document expected monthly costs in README
```

**Required assertions:**
- All alarm types tested in staging
- Notifications delivered within 5 minutes
- Documentation verified against staging environment
- Cost estimates accurate (within 20% of actual costs)

### Risks

1. **Staging vs Production Differences:** Staging RDS instance may have different characteristics (size, load) affecting threshold validation
2. **Notification Delivery Delays:** SNS delivery not instantaneous; document 5-minute SLA
3. **Cost Estimation Accuracy:** Actual costs depend on alarm frequency and metric volume
4. **Threshold Tuning:** Initial thresholds may need adjustment after baseline data collected
5. **Runbook Effectiveness:** Runbooks may need updates based on real incident response

## UI/UX Notes

**SKIPPED** - This story does not touch any UI components. Monitoring is performed via AWS CloudWatch Console (out of scope for UI/UX review).

## Dev Feasibility Review

**Feasible:** Yes
**Confidence:** High

### Key Findings

**Likely change surface:**
- Documentation: README (comprehensive monitoring section)
- Runbooks for each alert type
- Threshold documentation with rationale
- Cost estimation and tracking
- Multi-environment configuration guide
- No infrastructure changes (all in KNOW-016-A)

**Top risks:**
1. **Staging Environment Availability** - Requires RDS instance in staging for end-to-end validation
2. **Threshold Tuning Without Baseline Data** - Unknown usage patterns, start conservative and tune
3. **Notification Endpoint Configuration** - Must test with actual endpoints (email, PagerDuty)
4. **Runbook Completeness** - Runbooks may need updates based on real incidents
5. **Cost Accuracy** - Cost estimates depend on actual usage patterns

**Scope focus:**
- Comprehensive runbooks for each alarm type
- Clear escalation procedures and response time SLAs
- End-to-end validation in staging (all alarm types)
- Multi-environment support with environment-specific configuration
- Cost monitoring and tracking recommendations

**Evidence expectations:**
- Staging validation report (all alarm types tested)
- Notification delivery confirmation (email screenshot)
- README with comprehensive monitoring documentation
- Runbooks for each alert type
- Cost estimation with breakdown

## Implementation Notes

### Pre-Implementation Dependencies

**REQUIRED:**
1. **KNOW-016-A completed:** All infrastructure deployed (dashboard, alarms, SNS topics)
2. **Staging RDS instance:** Required for end-to-end validation (not Docker Compose)
3. **SNS subscriptions confirmed:** Email verification completed
4. **Documentation standards:** Follow existing runbook structure in monorepo

### Implementation Order

1. **Alert testing in staging** (1-2 hours)
   - Test each alarm type manually with `set-alarm-state`
   - Verify notification delivery to staging endpoint
   - Document alarm behavior and notification format
   - Verify alarm returns to OK state when condition clears

2. **Threshold documentation** (1 hour)
   - Document all thresholds with rationale (80% connections, 80% CPU, etc.)
   - Document evaluation periods (2 consecutive periods)
   - Document threshold review plan (2-4 weeks after baseline collection)
   - Document how to adjust thresholds via IaC

3. **Runbook documentation** (2-3 hours)
   - Write runbook for each alarm type:
     - High connections: Connection leak detection, scaling recommendations
     - High CPU: Query analysis, index optimization
     - Low memory: Buffer pool tuning, instance sizing
     - High latency: I/O analysis, query performance, network troubleshooting
   - Document escalation procedures (P0: 15 min, P1: 1 hour, P2: next day)
   - Document troubleshooting procedures (no metrics, no alerts)
   - Document dashboard access instructions

4. **Staging environment validation** (1-2 hours)
   - Deploy monitoring infrastructure to staging (IaC from KNOW-016-A)
   - Verify all metrics visible in dashboard (wait 5-15 minutes)
   - Test each alarm type with manual trigger
   - Verify notification delivery to all configured endpoints
   - Document validation results

5. **Cost estimation** (30 min)
   - Document estimated monthly costs:
     - Dashboards: ~$3/month
     - Alarms: ~$0.10/month per alarm (4-6 alarms = $0.40-$0.60)
     - SNS: ~$0.50 per million notifications
     - Total: <$10/month
   - Document cost monitoring recommendations (Cost Explorer, budgets)
   - Document cost increase factors (alarm frequency, metric volume)

6. **Multi-environment configuration** (1 hour)
   - Document environment-specific threshold configuration
   - Document environment-specific SNS topic configuration
   - Document deployment instructions for staging and production
   - Test IaC deployment with environment-specific variables

### Estimated Effort

**Story points:** 2-3 (approximately 6-8 hours of focused work)

**Breakdown:**
- Alert testing: 0.5 points
- Threshold documentation: 0.5 points
- Runbook documentation: 1 point
- Staging validation: 0.5 points
- Cost estimation: 0.25 points
- Multi-environment configuration: 0.25 points

### Success Criteria Summary

A developer or ops engineer should be able to:
1. Respond to any alarm using the runbook procedures
2. Adjust thresholds when needed (via IaC)
3. Validate monitoring in staging environment
4. Deploy monitoring to production with confidence
5. Monitor costs and identify cost optimization opportunities
6. Escalate issues according to documented procedures

If any alarm fires, the on-call engineer should find clear, actionable guidance in the runbooks.

---

## Related Stories

**Depends on:** KNOW-016-A (PostgreSQL Monitoring - Foundation)

**Related:**
- KNOW-012: Large-Scale Benchmarking (may inform threshold tuning)
- KNOW-015: Disaster Recovery (monitoring helps detect when recovery needed)
- KNOW-019: Query Analytics (application-level metrics, complements infrastructure monitoring)

---

## Notes

- This is the **Production Readiness split** - focuses on operational readiness
- All infrastructure created in KNOW-016-A (Foundation)
- Focus on documentation, runbooks, validation, and multi-environment support
- Requires staging RDS instance for end-to-end validation
- Threshold review should be scheduled 2-4 weeks after production deployment
- Runbooks should be living documents (update based on real incident response)

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| PM Split Generation | — | — | — |

(To be filled during implementation)
