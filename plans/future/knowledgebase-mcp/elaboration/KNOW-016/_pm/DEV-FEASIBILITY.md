# Dev Feasibility Review: KNOW-016 PostgreSQL Monitoring

## Feasibility Summary

- **Feasible:** Yes
- **Confidence:** High
- **Why:** CloudWatch integration for PostgreSQL monitoring is well-documented and straightforward. AWS provides native RDS metrics and CloudWatch dashboard/alarm APIs. Primary challenge is defining appropriate thresholds and dashboard layouts, not technical implementation.

---

## Likely Change Surface

### Areas/Packages Likely Impacted

**New infrastructure:**
- CloudWatch dashboards (AWS resource)
- CloudWatch alarms (AWS resource)
- SNS topics for alert notifications (AWS resource)
- IAM policies for CloudWatch access (AWS resource)

**Potentially modified:**
- `apps/api/knowledge-base/README.md` - Add monitoring section
- Infrastructure-as-Code files (if using Terraform/CDK/CloudFormation)
  - New: `infra/cloudwatch-dashboards.tf` or equivalent
  - New: `infra/cloudwatch-alarms.tf` or equivalent
- `docs/` - Add runbook for responding to alerts

**No code changes expected:**
- Application code remains unchanged
- Database schema unchanged
- No new API endpoints

### Endpoints Likely Impacted

**None** - This story is purely infrastructure setup, no application endpoints affected.

### Migration/Deploy Touchpoints

**Infrastructure deployment:**
- CloudWatch resources must be provisioned via IaC or AWS CLI
- SNS topics must be created before alarms can reference them
- IAM permissions must allow CloudWatch:PutDashboard, PutMetricAlarm, SNS:Publish

**No database migrations** - No schema changes required.

**Deployment order:**
1. Create SNS topics for alert destinations
2. Deploy CloudWatch dashboards
3. Deploy CloudWatch alarms (referencing SNS topics)
4. Verify metrics flowing and alarms configured correctly

---

## Risk Register (Top 5–10)

### Risk 1: Local vs Production Metric Source Mismatch
**Why it's risky:**
- KNOW-001 uses Docker Compose PostgreSQL locally (no RDS metrics)
- Production will use RDS (AWS/RDS namespace metrics)
- Test coverage gap: can't fully test CloudWatch integration locally

**Mitigation PM should bake into AC or testing plan:**
- Explicitly document that monitoring is AWS-only (out of scope for local Docker)
- Require testing in AWS staging environment with RDS instance
- Document metric namespace differences (custom vs AWS/RDS) in architecture notes
- Add AC for verifying metrics in staging before production deployment

---

### Risk 2: Threshold Tuning Without Baseline Data
**Why it's risky:**
- Setting alert thresholds without historical data leads to false positives or missed incidents
- Knowledge base usage patterns unknown until production deployment
- Risk of alert fatigue or missing critical issues

**Mitigation PM should bake into AC or testing plan:**
- Define initial conservative thresholds (high tolerance for first iteration)
- Document threshold review process (revisit after 2-4 weeks of production data)
- Add AC for baseline data collection period before enabling noisy alarms
- Include threshold tuning as explicit follow-up task in story notes

---

### Risk 3: SNS Topic Configuration and Notification Delivery
**Why it's risky:**
- SNS topic must be correctly subscribed to email/webhook/Slack
- Subscription confirmation required (email verification step)
- Dead letter queue needed for failed notifications
- Testing notification delivery requires manual triggering

**Mitigation PM should bake into AC or testing plan:**
- Add AC for SNS topic subscription confirmation
- Require test notification via manual alarm trigger (set-alarm-state)
- Document notification endpoint setup (email, PagerDuty, Slack webhook)
- Add troubleshooting section for "no alerts received" scenario

---

### Risk 4: IAM Permission Gaps
**Why it's risky:**
- Deploying user/service account may lack CloudWatch permissions
- RDS must allow CloudWatch metrics export (if enhanced monitoring)
- SNS publish permissions required for alarm actions
- Permission errors often discovered late in deployment

**Mitigation PM should bake into AC or testing plan:**
- Add AC for documenting all required IAM permissions
- Provide sample IAM policy JSON in story or README
- Add error case test for insufficient permissions (AccessDeniedException)
- Include permission verification script in setup instructions

---

### Risk 5: Dashboard JSON Schema Complexity
**Why it's risky:**
- CloudWatch dashboard JSON schema is verbose and error-prone
- Manual JSON editing leads to syntax errors
- Widget configuration has many optional parameters
- Difficult to review/maintain without tooling

**Mitigation PM should bake into AC or testing plan:**
- Use AWS Console to build initial dashboard, then export JSON
- Validate dashboard JSON with `jq` or schema validator before deployment
- Add AC for dashboard JSON validation in CI pipeline
- Store dashboard JSON in version control with clear documentation

---

### Risk 6: Cost Implications (CloudWatch Billing)
**Why it's risky:**
- CloudWatch charges per metric, per alarm, and per dashboard API call
- High-resolution metrics (1-second granularity) 10x more expensive than standard
- Dashboard queries can rack up costs with frequent refreshes
- Unexpected bills without cost monitoring

**Mitigation PM should bake into AC or testing plan:**
- Document estimated monthly cost (based on metric count and alarm count)
- Use standard resolution metrics (1-minute) unless justified
- Add AC for cost estimate documentation in README
- Set up billing alerts for CloudWatch service in AWS account

---

### Risk 7: Alert Fatigue from Low Thresholds
**Why it's risky:**
- Overly sensitive alarms cause frequent notifications
- Team starts ignoring alerts (desensitization)
- Critical alerts missed due to noise

**Mitigation PM should bake into AC or testing plan:**
- Define "critical" vs "warning" alert tiers
- Use multi-period evaluation (alarm only after 2-3 consecutive breaches)
- Document escalation policy (who responds to which alerts)
- Add AC for alert severity classification

---

### Risk 8: pgvector-Specific Metrics Not Available
**Why it's risky:**
- Standard RDS metrics don't include pgvector index performance
- Vector search latency not observable via CloudWatch by default
- Custom metrics require application instrumentation (out of scope for this story)

**Mitigation PM should bake into AC or testing plan:**
- Explicitly document that pgvector metrics are out of scope (deferred to KNOW-012)
- Focus on standard PostgreSQL metrics (connections, CPU, memory, disk)
- Note custom metric instrumentation as follow-up story (KNOW-012 or new story)
- Add architecture note about metric limitations

---

### Risk 9: Dashboard Widget Limit (AWS Quota)
**Why it's risky:**
- CloudWatch dashboards limited to 100 widgets (500 metrics) per dashboard
- Complex dashboards may hit limits
- Requires splitting into multiple dashboards

**Mitigation PM should bake into AC or testing plan:**
- Start with minimal dashboard (5-10 essential metrics)
- Document widget count in acceptance criteria
- Plan for multi-dashboard strategy if metrics grow
- Add edge case test for widget limit

---

### Risk 10: Monitoring Blind Spots During RDS Maintenance
**Why it's risky:**
- RDS maintenance windows may pause metric collection
- Alarms may trigger false positives during planned maintenance
- Team responds to alerts that are expected downtime

**Mitigation PM should bake into AC or testing plan:**
- Document RDS maintenance window schedule in runbook
- Consider suppressing alarms during maintenance (SNS topic filtering or manual)
- Add troubleshooting note about expected gaps in metrics
- Plan for "maintenance mode" flag in future enhancement

---

## Scope Tightening Suggestions (Non-breaking)

### Clarifications to Add to AC

1. **Metric namespace decision:**
   - Explicitly state whether using AWS/RDS (for RDS databases) or custom namespace (for self-hosted)
   - Document that local Docker Compose databases won't emit CloudWatch metrics

2. **Alert destination specificity:**
   - Specify exact SNS topic names and subscription endpoints
   - Clarify whether using email, PagerDuty, Slack, or multiple channels

3. **Dashboard scope:**
   - Limit to 5-10 key metrics for initial dashboard (avoid scope creep)
   - Defer advanced visualizations (percentiles, anomaly detection) to follow-up

4. **Threshold documentation:**
   - Require explicit threshold values in acceptance criteria (not "reasonable values")
   - Example: "Connection count alarm triggers at 80% of max_connections (80 out of 100)"

### Constraints to Avoid Rabbit Holes

1. **No custom application instrumentation:**
   - Focus on RDS-provided metrics only
   - Custom pgvector metrics deferred to KNOW-012 or KNOW-019

2. **Standard resolution metrics only:**
   - Do not implement high-resolution (1-second) metrics in this story
   - Defer to cost optimization story if needed

3. **Single dashboard initially:**
   - Avoid creating multiple dashboards for different views
   - Start with one operational dashboard

4. **No custom alert integrations:**
   - Use SNS standard integrations only
   - Defer custom webhooks, Slack bots, etc. to follow-up

### Explicit OUT OF SCOPE Candidates

1. **Application performance monitoring (APM):** Defer to separate observability story
2. **Distributed tracing:** Not applicable for database monitoring
3. **Log aggregation:** CloudWatch Logs integration deferred (separate story)
4. **Grafana/Prometheus:** Use CloudWatch native tools only in this story
5. **Custom pgvector metrics:** Defer to performance benchmarking story (KNOW-012)
6. **Anomaly detection (CloudWatch Insights):** Defer to advanced monitoring story
7. **Multi-region monitoring:** Assume single-region deployment initially

---

## Missing Requirements / Ambiguities

### What's Unclear

1. **Exact metric thresholds:**
   - What connection count is "high"? (Recommend: 80% of max_connections)
   - What CPU utilization triggers alert? (Recommend: 80% for 5 minutes)
   - What memory threshold is critical? (Recommend: <10% free for 5 minutes)

2. **Alert notification endpoints:**
   - Who receives alerts? (Recommend: team email alias or PagerDuty)
   - What's the escalation policy? (Recommend: document in runbook)

3. **Infrastructure-as-Code tooling:**
   - Terraform, CDK, CloudFormation, or AWS CLI? (Recommend: match existing monorepo patterns)

4. **Environment-specific configuration:**
   - Different thresholds for staging vs production? (Recommend: yes, document both)

5. **Maintenance window handling:**
   - How to suppress alerts during planned downtime? (Recommend: manual or SNS filtering)

6. **Dashboard refresh rate:**
   - How often should dashboard auto-refresh? (Recommend: 5 minutes for cost efficiency)

### Recommended Concrete Decision Text PM Should Include

**Metric Thresholds (add to AC or Architecture Notes):**
```markdown
### Alert Thresholds

**Connection Count:**
- Threshold: 80 connections (assumes max_connections=100)
- Evaluation: Average over 5 minutes
- Alarm if: >= 80 for 2 consecutive periods

**CPU Utilization:**
- Threshold: 80%
- Evaluation: Average over 5 minutes
- Alarm if: >= 80% for 2 consecutive periods

**Freeable Memory:**
- Threshold: <10% free
- Evaluation: Minimum over 5 minutes
- Alarm if: <10% for 2 consecutive periods

**Read/Write Latency:**
- Threshold: >100ms average
- Evaluation: Average over 5 minutes
- Alarm if: >100ms for 2 consecutive periods
```

**SNS Topic Configuration (add to Infrastructure Notes):**
```markdown
### Alert Destinations

**SNS Topic:** `kb-postgresql-alerts`
**Region:** us-west-2 (match database region)
**Subscriptions:**
- Email: team-alerts@example.com (requires confirmation)
- Future: PagerDuty endpoint (deferred to separate story)
```

**IaC Tooling Decision (add to Architecture Notes):**
```markdown
### Infrastructure-as-Code Choice

**Decision:** Use Terraform for CloudWatch resources
**Rationale:** Consistency with existing monorepo infrastructure patterns
**Files:**
- `infra/monitoring/cloudwatch-dashboards.tf`
- `infra/monitoring/cloudwatch-alarms.tf`
- `infra/monitoring/sns-topics.tf`
```

---

## Evidence Expectations

### What Proof/Dev Should Capture

**Dashboard Creation:**
- Screenshot of CloudWatch dashboard showing all widgets
- Dashboard JSON file committed to repo
- `terraform plan` output showing dashboard resource creation
- Console URL to live dashboard (shareable link)

**Alarm Configuration:**
- List of all alarms created (AWS CLI `describe-alarms` output)
- Screenshot of alarm in OK state
- Test notification received (email screenshot or webhook log)
- Alarm history showing manual test trigger

**Metrics Validation:**
- AWS CLI output showing metric data points for past hour
- Verification that metrics update within expected interval (1-5 minutes)
- No "No data available" errors in dashboard widgets

**Documentation:**
- README section on accessing dashboard and interpreting metrics
- Runbook for responding to each alert type
- Troubleshooting guide for common metric collection issues

### What Might Fail in CI/Deploy

1. **IAM Permission Errors:**
   - CI pipeline service account lacks CloudWatch:PutDashboard permission
   - Fix: Add required permissions to CI role

2. **SNS Topic Not Found:**
   - Alarms reference SNS topics that don't exist or are in wrong region
   - Fix: Create SNS topics before deploying alarms

3. **Invalid Dashboard JSON:**
   - Syntax error in dashboard definition
   - Fix: Validate JSON with `jq` in CI pipeline before deployment

4. **Quota Limits:**
   - Account exceeds CloudWatch alarm limit (default: 5000 per region)
   - Fix: Request quota increase or delete unused alarms

5. **Cross-Region Resource References:**
   - Dashboard in us-east-1 referencing RDS metrics in us-west-2
   - Fix: Deploy dashboard in same region as database

6. **Unconfirmed SNS Subscriptions:**
   - Email subscription not confirmed, no notifications sent
   - Fix: Document manual confirmation step in deployment instructions

---

## Recommendations for Implementation

1. **Start with minimal dashboard** (5 key metrics: connections, CPU, memory, read latency, write latency)
2. **Use Terraform for reproducibility** (match existing infra patterns)
3. **Test in staging first** with real RDS instance (not Docker Compose)
4. **Conservative initial thresholds** (expect to tune after baseline data collected)
5. **Document everything** (runbooks, troubleshooting, threshold rationale)
6. **Manual SNS subscription confirmation** required before alarms are useful
7. **Plan for threshold review** after 2-4 weeks of production data
8. **Defer advanced features** (anomaly detection, custom metrics) to follow-up stories

---

## Implementation Order Suggestion

1. **SNS topic creation** (30 min) - Create and confirm subscriptions
2. **Dashboard creation** (1-2 hours) - Build in console, export JSON, commit to repo
3. **Alarm creation** (1-2 hours) - Define thresholds, create alarms via Terraform/CLI
4. **Testing** (1 hour) - Verify metrics flowing, test manual alarm trigger
5. **Documentation** (1-2 hours) - Write runbook, troubleshooting guide, README section
6. **Staging validation** (1 hour) - Deploy to staging environment, verify end-to-end

**Estimated effort:** 3 story points (6-8 hours of focused work)

---

## Non-Negotiables

- Must test in AWS environment (local Docker Compose cannot emit CloudWatch metrics)
- Must document all alert thresholds with rationale
- Must provide runbook for responding to each alert type
- Must validate dashboard JSON before deployment
- Must confirm SNS subscriptions before declaring story complete
