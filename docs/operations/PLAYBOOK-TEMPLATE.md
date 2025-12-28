# Playbook: [Scenario Name]

> **Status:** Draft | Active | Deprecated
> **Owner:** [Team/Person]
> **Last Reviewed:** YYYY-MM-DD
> **Severity:** P1 (Critical) | P2 (High) | P3 (Medium) | P4 (Low)

## Scenario

Clear description of the situation this playbook addresses.

**Trigger Conditions:**
- When [specific condition] occurs
- When alert "[alert name]" fires
- When [metric] exceeds [threshold]

## Impact Assessment

| Aspect | Impact |
|--------|--------|
| Users Affected | All / Subset / None |
| Revenue Impact | High / Medium / Low / None |
| Data Risk | High / Medium / Low / None |
| SLA Impact | Yes / No |

## Detection

### Alerts
- **Alert Name:** [Description]
- **Dashboard:** [Link]
- **Logs Query:** [Query or link]

### Symptoms
- [ ] Symptom 1
- [ ] Symptom 2
- [ ] Symptom 3

## Response

### Immediate Actions (First 5 Minutes)

1. **Acknowledge** - Claim the incident in [alerting system]
2. **Assess** - Determine scope using [dashboard/query]
3. **Communicate** - Post in #incidents channel

### Triage Decision Tree

```
Is the service completely down?
├── YES → Go to [Critical Response](#critical-response)
└── NO
    ├── Is it affecting >10% of users?
    │   ├── YES → Go to [Major Response](#major-response)
    │   └── NO → Go to [Minor Response](#minor-response)
```

### Critical Response

**Goal:** Restore service within [X] minutes

1. **Mitigate immediately**
   ```bash
   # Emergency mitigation command
   ```

2. **Notify stakeholders**
   - Engineering Lead: [contact]
   - Product: [contact]
   - Support: [contact]

3. **Execute recovery**
   - See [Runbook: Service Recovery](./runbook-service-recovery.md)

### Major Response

**Goal:** Reduce impact within [X] minutes

1. **Isolate the problem**
   ```bash
   # Diagnostic commands
   ```

2. **Apply known fix or workaround**
   - Option A: [Description]
   - Option B: [Description]

3. **Monitor recovery**
   - Watch [metric] return to normal
   - Verify [health check endpoint]

### Minor Response

**Goal:** Investigate and fix within [X] hours

1. **Collect evidence**
   - Logs from [timeframe]
   - Metrics snapshot
   - User reports

2. **Create ticket** if not auto-created
3. **Schedule fix** for next available window

## Investigation Guide

### Key Metrics to Check

| Metric | Normal Range | Where to Find |
|--------|--------------|---------------|
| [Metric 1] | [range] | [dashboard link] |
| [Metric 2] | [range] | [dashboard link] |
| [Metric 3] | [range] | [dashboard link] |

### Log Queries

**Error spike:**
```
# CloudWatch Insights / query
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
```

**Slow requests:**
```
# Query for latency issues
fields @timestamp, duration
| filter duration > 1000
| sort duration desc
| limit 50
```

### Common Root Causes

| Symptom | Likely Cause | Quick Check |
|---------|--------------|-------------|
| High latency | Database overload | Check RDS metrics |
| 5xx errors | Lambda cold starts | Check concurrent executions |
| Timeouts | Downstream service | Check dependency health |

## Communication

### Status Page Updates

**Investigating:**
> We are investigating reports of [brief description]. Updates will follow.

**Identified:**
> We have identified the cause of [issue]. We are working on a fix.

**Monitoring:**
> A fix has been deployed. We are monitoring the situation.

**Resolved:**
> This incident has been resolved. [Brief description of fix].

### Internal Updates

Post updates every [15/30] minutes to:
- [ ] #incidents Slack channel
- [ ] Incident ticket
- [ ] Stakeholder email (for P1/P2)

## Resolution

### Verification Checklist

- [ ] Primary metrics returned to normal
- [ ] No new errors in logs
- [ ] Health checks passing
- [ ] User-facing functionality verified
- [ ] Stakeholders notified of resolution

### Post-Incident

- [ ] Create post-mortem document (P1/P2 required)
- [ ] Schedule post-mortem meeting
- [ ] Update this playbook if needed
- [ ] Create tickets for follow-up items

## Escalation Matrix

| Level | When | Who | How |
|-------|------|-----|-----|
| L1 | Initial response | On-call engineer | PagerDuty |
| L2 | 15 min no progress | Team lead | Slack + phone |
| L3 | 30 min no progress | Engineering manager | Phone |
| L4 | Major outage | VP Engineering | Phone + SMS |

## Related Resources

- **Runbooks:**
  - [Runbook: Deployment](./runbook-deployment.md)
  - [Runbook: Database Recovery](./runbook-database-recovery.md)

- **Architecture:**
  - [System Overview](../architecture/overview.md)
  - [Service Dependencies](../architecture/dependencies.md)

- **External:**
  - [AWS Status](https://status.aws.amazon.com/)
  - [Vendor Status Page]

## Changelog

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | [Name] | Initial version |

---

## Template Usage Notes

Delete this section when creating an actual playbook.

### When to Create a Playbook

- Incident response scenarios
- Security events
- Performance degradation
- Dependency failures
- Capacity issues

### Playbook vs Runbook

| Playbook | Runbook |
|----------|---------|
| Scenario-based | Task-based |
| Decision trees | Step-by-step |
| Multiple paths | Single path |
| Incident response | Routine operations |
| "What do I do when..." | "How do I do..." |

### Best Practices

1. **Start with detection** - How do you know there's a problem?
2. **Prioritize mitigation** - Stop the bleeding first
3. **Include decision points** - Not all incidents are the same
4. **Document communication** - Who needs to know what?
5. **Link to runbooks** - Playbooks orchestrate, runbooks execute
6. **Review after incidents** - Update based on real events

### Naming Convention

```
playbook-[scenario].md
```

Examples:
- `playbook-api-outage.md`
- `playbook-database-failover.md`
- `playbook-security-breach.md`
- `playbook-capacity-limit.md`
