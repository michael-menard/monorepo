# Story lnch-1024: On-Call Playbook

## Status

Draft

## Story

**As an** on-call engineer,
**I want** a comprehensive on-call playbook,
**so that** I can respond to incidents effectively.

## Epic Context

This is **Story 1 of Launch Readiness Epic: Incident Response Workstream**.
Priority: **Critical** - Required for production operations.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1009: API Deployment Runbook (linked from playbook)
- lnch-1010: API Rollback Runbook (linked from playbook)

## Related Stories

- lnch-1025: Incident Classification Guide
- lnch-1028: Escalation Procedures
- lnch-1030: Alarm Response Runbooks

## Acceptance Criteria

1. Playbook exists at `docs/operations/oncall-playbook.md`
2. Documents on-call responsibilities
3. Documents alert response procedures
4. Documents escalation paths
5. Includes contact list for escalation
6. Documents shift handoff procedures
7. Includes quick reference troubleshooting guide

## Tasks / Subtasks

- [ ] **Task 1: Create Playbook Structure** (AC: 1)
  - [ ] Create `docs/operations/oncall-playbook.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Responsibilities** (AC: 2)
  - [ ] Response time expectations
  - [ ] Monitoring requirements
  - [ ] Communication obligations
  - [ ] Decision authority

- [ ] **Task 3: Document Alert Response** (AC: 3)
  - [ ] Alert sources (CloudWatch, PagerDuty, etc.)
  - [ ] Severity classification
  - [ ] Initial response steps
  - [ ] Link to specific runbooks

- [ ] **Task 4: Document Escalation** (AC: 4)
  - [ ] When to escalate
  - [ ] Escalation levels (L1, L2, L3)
  - [ ] Escalation timeframes
  - [ ] Management escalation

- [ ] **Task 5: Create Contact List** (AC: 5)
  - [ ] Primary contacts by area
  - [ ] Secondary contacts
  - [ ] External contacts (AWS support)
  - [ ] Communication channels (Slack, phone)

- [ ] **Task 6: Document Handoff** (AC: 6)
  - [ ] Handoff timing
  - [ ] Handoff checklist
  - [ ] Open incident transfer
  - [ ] Knowledge sharing

- [ ] **Task 7: Create Quick Reference** (AC: 7)
  - [ ] Common issues and fixes
  - [ ] Key dashboards
  - [ ] Critical runbook links
  - [ ] Cheat sheet format

## Dev Notes

### Template (Required)

This story produces an **on-call playbook** document:

- **Output**: `docs/operations/oncall-playbook.md`
- **Use template**: `docs/operations/PLAYBOOK-TEMPLATE.md`

The on-call playbook is the master incident response document that links to specific runbooks and playbooks for detailed procedures.

---

### On-Call Tools
- Alerting: CloudWatch Alarms → (SNS → PagerDuty/Slack)
- Monitoring: CloudWatch Dashboard
- Communication: Slack #incidents channel
- Documentation: This playbook + runbooks

### Severity Levels
| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| SEV1 | Complete outage | 15 min | Immediate |
| SEV2 | Major degradation | 30 min | 1 hour |
| SEV3 | Minor impact | 4 hours | Next business day |
| SEV4 | Low priority | Next business day | N/A |

### Quick Reference Links
- [API Deployment Runbook](./runbooks/api-deployment.md)
- [API Rollback Runbook](./runbooks/api-rollback.md)
- [Lambda Troubleshooting](./runbooks/lambda-troubleshooting.md)
- [Database Troubleshooting](./runbooks/database-troubleshooting.md)

### CloudWatch Dashboards
- Main Dashboard: (link)
- API Metrics: (link)
- Database Metrics: (link)

## Testing

### Verification
- Playbook is accessible during incident
- Contact information is current
- Escalation paths are clear
- Links to runbooks work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
