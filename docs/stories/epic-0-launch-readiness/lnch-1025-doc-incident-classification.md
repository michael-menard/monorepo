# Story lnch-1025: Incident Classification Guide

## Status

Draft

## Story

**As an** incident responder,
**I want** clear incident classification guidelines,
**so that** I can appropriately prioritize and respond to issues.

## Epic Context

This is **Story 2 of Launch Readiness Epic: Incident Response Workstream**.
Priority: **High** - Required for consistent incident handling.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1024: On-Call Playbook (uses classification)

## Related Stories

- lnch-1024: On-Call Playbook (parent playbook)
- lnch-1026: Post-Mortem Template (uses severity)
- lnch-1028: Escalation Procedures (triggered by severity)

## Acceptance Criteria

1. Guide exists at `docs/operations/incident-classification.md`
2. Defines severity levels (SEV1-SEV4)
3. Documents impact criteria for each level
4. Documents response expectations
5. Documents communication requirements
6. Includes decision tree for classification
7. Documents reclassification procedures

## Tasks / Subtasks

- [ ] **Task 1: Create Guide Structure** (AC: 1)
  - [ ] Create `docs/operations/incident-classification.md`
  - [ ] Add standard sections

- [ ] **Task 2: Define Severity Levels** (AC: 2)
  - [ ] SEV1: Critical/Complete outage
  - [ ] SEV2: Major degradation
  - [ ] SEV3: Minor impact
  - [ ] SEV4: Low priority/Cosmetic

- [ ] **Task 3: Document Impact Criteria** (AC: 3)
  - [ ] User impact percentage
  - [ ] Revenue impact
  - [ ] Data integrity
  - [ ] Security implications

- [ ] **Task 4: Document Response Expectations** (AC: 4)
  - [ ] Initial response time
  - [ ] Update frequency
  - [ ] Resolution targets
  - [ ] Post-incident requirements

- [ ] **Task 5: Document Communication** (AC: 5)
  - [ ] Who to notify by severity
  - [ ] Communication channels
  - [ ] Status update templates
  - [ ] Customer communication

- [ ] **Task 6: Create Decision Tree** (AC: 6)
  - [ ] Flowchart for classification
  - [ ] Example scenarios
  - [ ] Edge case guidance

- [ ] **Task 7: Document Reclassification** (AC: 7)
  - [ ] When to upgrade/downgrade
  - [ ] Who can reclassify
  - [ ] Documentation requirements

## Dev Notes

### Severity Level Matrix

| Level | User Impact | Response | Update Frequency | Notification |
|-------|-------------|----------|------------------|--------------|
| SEV1 | 100% users down | 15 min | Every 30 min | All stakeholders |
| SEV2 | >25% degraded | 30 min | Every 1 hour | Engineering + PM |
| SEV3 | <25% affected | 4 hours | Every 4 hours | Engineering |
| SEV4 | Minimal/cosmetic | Next BD | As resolved | Ticket owner |

### Example Scenarios

**SEV1 - Critical**
- All users cannot log in
- Database is completely down
- All API endpoints returning 500
- Data breach confirmed

**SEV2 - Major**
- Upload functionality broken for all users
- Significant performance degradation (>5s response)
- Search not returning results
- Authentication working but slow

**SEV3 - Minor**
- Single feature broken for subset
- Minor UI issues
- Slow performance on non-critical paths
- Error messages unclear

**SEV4 - Low**
- Typos in UI
- Minor cosmetic issues
- Feature requests misclassified as bugs
- Documentation errors

### Decision Tree Questions
1. Is the service completely unavailable? → SEV1
2. Are >25% of users affected? → SEV2
3. Is core functionality broken? → SEV2
4. Is it a security issue? → Minimum SEV2
5. Single feature, <25% users? → SEV3
6. Cosmetic only? → SEV4

## Testing

### Verification
- Classification is unambiguous
- Examples cover common scenarios
- Decision tree is easy to follow

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
