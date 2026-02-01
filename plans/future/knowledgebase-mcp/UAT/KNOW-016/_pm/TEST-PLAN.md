# Test Plan: KNOW-016 PostgreSQL Monitoring

## Scope Summary

- **Endpoints touched:** None (infrastructure story)
- **UI touched:** No
- **Data/storage touched:** Yes (PostgreSQL metrics, CloudWatch integration)

---

## Happy Path Tests

### Test 1: CloudWatch Dashboard Creation
**Setup:**
- AWS account with CloudWatch access
- PostgreSQL database from KNOW-001 running
- AWS credentials configured
- CloudWatch agent or AWS SDK available

**Action:**
```bash
# Create CloudWatch dashboard via Terraform/CDK or AWS CLI
aws cloudwatch put-dashboard --dashboard-name kb-postgresql-dashboard --dashboard-body file://dashboard-config.json
```

**Expected outcome:**
- CloudWatch dashboard created successfully
- Dashboard displays PostgreSQL metrics widgets
- Dashboard accessible via CloudWatch console
- All defined widgets render without errors

**Evidence:**
- AWS CLI output confirms dashboard creation (200 status)
- Dashboard JSON validated against CloudWatch schema
- Console screenshot showing dashboard with metrics
- All metrics appear in dashboard (no "No data" for active database)

---

### Test 2: Key Metrics Collection
**Setup:**
- PostgreSQL database running with active queries
- CloudWatch metrics configured
- Database has some load (sample queries, connections)

**Action:**
```bash
# Query CloudWatch for PostgreSQL metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=kb-postgres \
  --start-time 2026-01-25T00:00:00Z \
  --end-time 2026-01-25T01:00:00Z \
  --period 300 \
  --statistics Average
```

**Expected outcome:**
- Metrics successfully retrieved from CloudWatch
- Connection count, CPU, memory, disk metrics available
- pgvector-specific metrics (if instrumented) visible
- Metric values align with actual database state

**Evidence:**
- CloudWatch API returns metric data points
- Values are reasonable (connections > 0 for active DB)
- Timestamps show continuous metric collection
- No gaps in metric timeline

---

### Test 3: Alert Policy Creation
**Setup:**
- CloudWatch dashboard from Test 1 exists
- Metrics from Test 2 are flowing
- SNS topic for alert notifications configured

**Action:**
```bash
# Create CloudWatch alarm for high connection count
aws cloudwatch put-metric-alarm \
  --alarm-name kb-postgres-high-connections \
  --alarm-description "Triggers when PostgreSQL connections exceed threshold" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:region:account:kb-alerts
```

**Expected outcome:**
- CloudWatch alarm created successfully
- Alarm in OK state initially (assuming normal load)
- Alarm configuration matches defined thresholds
- SNS topic correctly associated

**Evidence:**
- AWS CLI output confirms alarm creation
- Alarm visible in CloudWatch console
- Alarm state shows "OK" or "INSUFFICIENT_DATA" initially
- Test notification (manual trigger) delivers to SNS topic

---

### Test 4: Alert Threshold Triggering (Simulated)
**Setup:**
- CloudWatch alarm from Test 3 created
- PostgreSQL database with controllable load
- SNS topic subscribed to email/webhook for notifications

**Action:**
```bash
# Simulate high connection load to trigger alarm
# (In practice: run load test script to exceed threshold)
for i in {1..100}; do
  psql -h localhost -U kbuser -d knowledgebase -c "SELECT pg_sleep(60);" &
done
```

**Expected outcome:**
- Connection count metric increases in CloudWatch
- Alarm transitions from OK to ALARM state
- SNS notification sent to configured endpoints
- Alert includes actionable information (metric value, threshold, timestamp)

**Evidence:**
- CloudWatch alarm history shows state transition
- Email/webhook receives alert notification
- Notification body includes metric details
- Timestamp of alert matches metric breach time

---

### Test 5: Dashboard Visualization Verification
**Setup:**
- CloudWatch dashboard with multiple metric widgets
- Database running with varied load patterns
- Metrics data available for past 24 hours

**Action:**
```bash
# Access dashboard via AWS Console or CloudWatch API
# Verify all widgets render correctly
```

**Expected outcome:**
- All dashboard widgets display metrics
- Time series charts show historical data
- Metric values update in near real-time (1-5 min delay acceptable)
- Dashboard is shareable via URL

**Evidence:**
- Screenshot of dashboard showing all widgets
- No "No data available" errors on widgets
- Time axis shows correct date range
- Metrics align with expected database activity

---

## Error Cases

### Error 1: Missing Metrics (Database Not Instrumented)
**Setup:**
- CloudWatch dashboard configured
- Database exists but metrics not flowing (no CloudWatch agent or RDS metrics disabled)

**Action:**
```bash
# Query CloudWatch for metrics
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections ...
```

**Expected:**
- CloudWatch returns empty data points or "No data" error
- Dashboard widgets show "No data available" message
- Clear error message indicating metrics are not configured
- Documentation references troubleshooting section

**Evidence:**
- CloudWatch API response shows empty Datapoints array
- Dashboard screenshot showing "No data" widgets
- Error logs reference metrics configuration issue

---

### Error 2: Invalid Alarm Threshold Configuration
**Setup:**
- Attempting to create alarm with invalid threshold (negative value, non-numeric)

**Action:**
```bash
aws cloudwatch put-metric-alarm --threshold -10 ...
```

**Expected:**
- AWS CLI returns validation error
- Alarm not created
- Error message clearly states threshold constraint violation

**Evidence:**
- CLI output shows validation error
- No alarm appears in CloudWatch console
- Error message references valid threshold range

---

### Error 3: SNS Topic Not Found (Dead Alert)
**Setup:**
- CloudWatch alarm configured with non-existent SNS topic ARN

**Action:**
```bash
aws cloudwatch put-metric-alarm --alarm-actions arn:aws:sns:region:account:nonexistent-topic ...
```

**Expected:**
- Alarm created but in INSUFFICIENT_DATA state
- When alarm triggers, no notification sent (SNS topic doesn't exist)
- CloudWatch alarm history shows delivery failures
- Clear error in alarm action history

**Evidence:**
- Alarm exists but notification fails
- CloudWatch alarm action history shows "Failed to publish to SNS"
- No email/webhook received despite alarm state change

---

### Error 4: Insufficient Permissions (IAM)
**Setup:**
- AWS user/role lacks CloudWatch PutDashboard or PutMetricAlarm permissions

**Action:**
```bash
aws cloudwatch put-dashboard --dashboard-name test ...
```

**Expected:**
- AWS CLI returns AccessDeniedException
- No dashboard or alarm created
- Error message references missing IAM permission

**Evidence:**
- CLI output shows "User: arn:aws:iam::... is not authorized to perform: cloudwatch:PutDashboard"
- No resource created in CloudWatch

---

## Edge Cases (Reasonable)

### Edge 1: Metric Delay and Alarm Flapping
**Setup:**
- CloudWatch alarm with short evaluation period (1 minute)
- Database load fluctuating around threshold

**Expected:**
- Alarm may flap between OK and ALARM states
- Multiple notifications sent in short time window
- Alarm history shows rapid state transitions

**Evidence:**
- Alarm state history shows multiple transitions
- Multiple SNS notifications received
- Mitigation: use longer evaluation periods (2-3 data points) and higher threshold buffer

---

### Edge 2: Dashboard Widget Limit
**Setup:**
- Attempting to add >50 widgets to a single dashboard (AWS limit)

**Expected:**
- CloudWatch rejects dashboard update with LimitExceededException
- Error message indicates widget limit exceeded
- Suggestion to split into multiple dashboards

**Evidence:**
- CLI output shows LimitExceededException
- Dashboard not updated

---

### Edge 3: Historical Metrics Retention
**Setup:**
- Query CloudWatch for metrics older than 15 months (standard retention)

**Expected:**
- CloudWatch returns no data for metrics beyond retention period
- Dashboard widgets show partial data (only within retention window)
- No error, but documentation notes retention limits

**Evidence:**
- CloudWatch API returns empty data points for old timestamps
- Dashboard time range selector limited to retention period

---

### Edge 4: Cross-Region Dashboard
**Setup:**
- PostgreSQL database in us-west-2, CloudWatch dashboard in us-east-1

**Expected:**
- Dashboard can display metrics from other regions (cross-region support)
- Slight increase in query latency
- Region must be specified in metric queries

**Evidence:**
- Dashboard successfully shows metrics from us-west-2
- Metric namespace includes region identifier
- Query response time slightly higher than same-region

---

## Required Tooling Evidence

### AWS CLI Commands

**Dashboard verification:**
```bash
# List all dashboards
aws cloudwatch list-dashboards

# Get dashboard definition
aws cloudwatch get-dashboard --dashboard-name kb-postgresql-dashboard

# Validate dashboard JSON schema
cat dashboard-config.json | jq .
```

**Metrics verification:**
```bash
# List available metrics for PostgreSQL
aws cloudwatch list-metrics --namespace AWS/RDS

# Get specific metric statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=kb-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average,Maximum
```

**Alarms verification:**
```bash
# List all alarms
aws cloudwatch describe-alarms

# Get alarm history
aws cloudwatch describe-alarm-history --alarm-name kb-postgres-high-connections --max-records 10

# Test alarm manually
aws cloudwatch set-alarm-state \
  --alarm-name kb-postgres-high-connections \
  --state-value ALARM \
  --state-reason "Manual test trigger"
```

### Required Assertions

**Dashboard:**
- Dashboard JSON is valid CloudWatch schema
- All widget types supported (line chart, number, log widget)
- Dashboard ARN follows pattern: `arn:aws:cloudwatch::account:dashboard/kb-postgresql-dashboard`

**Metrics:**
- Key metrics present: `DatabaseConnections`, `CPUUtilization`, `FreeableMemory`, `ReadLatency`, `WriteLatency`
- Metric data points have timestamps within last 15 minutes
- No gaps in metric collection for active database

**Alarms:**
- Alarm state is one of: OK, ALARM, INSUFFICIENT_DATA
- Alarm actions include valid SNS topic ARNs
- Evaluation periods and thresholds are reasonable (documented in story)

### Infrastructure-as-Code (Terraform/CDK)

If using IaC, verify:
- `terraform plan` shows dashboard and alarm resources
- `terraform apply` creates resources without errors
- `terraform state list` includes CloudWatch resources
- `terraform destroy` cleans up all monitoring resources

---

## Risks to Call Out

### Risk 1: RDS vs Self-Hosted Metrics
**Issue:** KNOW-001 uses Docker Compose PostgreSQL locally, but production will use RDS. Metric namespaces differ.
**Mitigation:**
- Document both metric sources (local: custom namespace, prod: AWS/RDS)
- Use conditional logic in IaC for local vs production
- Test with RDS instance in staging before production

### Risk 2: Cost Implications
**Issue:** CloudWatch metrics and alarms have per-metric and per-alarm costs. High-resolution metrics increase cost.
**Mitigation:**
- Use standard resolution (1-minute intervals) unless justified
- Document cost estimates in README
- Start with essential metrics only (connections, CPU, memory)
- Add advanced metrics incrementally

### Risk 3: Alert Fatigue
**Issue:** Too many alerts or low thresholds cause noise, important alerts ignored.
**Mitigation:**
- Define thresholds based on baseline load (document in story)
- Use composite alarms (multiple conditions) to reduce false positives
- Test thresholds in staging before production
- Document alert escalation procedures

### Risk 4: Dashboard Drift (Manual Changes)
**Issue:** Manual changes to dashboard via console not reflected in IaC.
**Mitigation:**
- Document "IaC only" policy for dashboard changes
- Periodic drift detection (terraform plan)
- Export dashboard JSON regularly and commit to repo

### Risk 5: Local Development Gap
**Issue:** CloudWatch monitoring only applicable in AWS, not for local Docker Compose setup.
**Mitigation:**
- Document that monitoring is production-only
- Suggest alternative for local (pgAdmin, Grafana + Prometheus) in README
- Focus testing on AWS staging environment

### Risk 6: Metric Granularity
**Issue:** CloudWatch standard resolution (1 minute) may miss short-lived spikes.
**Mitigation:**
- Document that high-resolution metrics (1 second) are optional for critical scenarios
- Balance granularity with cost
- Use CloudWatch Logs Insights for detailed debugging

---

## Notes

- This is an **infrastructure observability story** - no code changes to application logic
- Focus on operational readiness: clear dashboards, actionable alerts, documented runbooks
- Test plan assumes AWS account access; document AWS credentials setup in README
- Metrics configuration is environment-specific (local, staging, production) - document differences
- Consider using CloudFormation/Terraform/CDK for reproducible infrastructure setup
