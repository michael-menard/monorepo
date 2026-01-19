# Story lnch-1027: Communication Templates

## Status

Draft

## Story

**As an** incident responder,
**I want** pre-written communication templates,
**so that** I can communicate quickly and consistently during incidents.

## Epic Context

This is **Story 4 of Launch Readiness Epic: Incident Response Workstream**.
Priority: **Medium** - Improves incident communication.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1025: Incident Classification Guide (severity levels)

## Related Stories

- lnch-1024: On-Call Playbook (uses templates)
- lnch-1026: Post-Mortem Template (summary email)

## Acceptance Criteria

1. Templates exist at `docs/operations/templates/incident-comms/`
2. Includes internal Slack templates
3. Includes status page templates
4. Includes stakeholder email templates
5. Templates cover start, update, and resolution
6. Templates are severity-appropriate
7. Templates include variable placeholders

## Tasks / Subtasks

- [ ] **Task 1: Create Template Directory** (AC: 1)
  - [ ] Create `docs/operations/templates/incident-comms/`
  - [ ] Create index file

- [ ] **Task 2: Create Slack Templates** (AC: 2)
  - [ ] Incident start notification
  - [ ] Status update template
  - [ ] Resolution notification
  - [ ] Escalation template

- [ ] **Task 3: Create Status Page Templates** (AC: 3)
  - [ ] Investigating template
  - [ ] Identified template
  - [ ] Monitoring template
  - [ ] Resolved template

- [ ] **Task 4: Create Email Templates** (AC: 4)
  - [ ] Initial stakeholder notification
  - [ ] Update email
  - [ ] Resolution email
  - [ ] Post-mortem summary email

- [ ] **Task 5: Create by Phase** (AC: 5)
  - [ ] Incident declared templates
  - [ ] During incident templates
  - [ ] Resolution templates

- [ ] **Task 6: Severity Variations** (AC: 6)
  - [ ] SEV1 templates (urgent tone)
  - [ ] SEV2/3 templates (standard tone)
  - [ ] SEV4 templates (brief)

- [ ] **Task 7: Add Placeholders** (AC: 7)
  - [ ] {{INCIDENT_TITLE}}
  - [ ] {{SEVERITY}}
  - [ ] {{IMPACT}}
  - [ ] {{ETA}}
  - [ ] {{UPDATE}}

## Dev Notes

### Slack Templates

**Incident Start**
```
🚨 *INCIDENT DECLARED*
*Title:* {{INCIDENT_TITLE}}
*Severity:* {{SEVERITY}}
*Impact:* {{IMPACT}}
*Incident Commander:* {{IC_NAME}}
*Thread:* Reply here for updates

We are investigating. Next update in 30 minutes.
```

**Status Update**
```
📢 *INCIDENT UPDATE* - {{INCIDENT_TITLE}}
*Status:* Investigating / Identified / Monitoring
*Update:* {{UPDATE}}
*Next update in:* {{NEXT_UPDATE_TIME}}
```

**Resolution**
```
✅ *INCIDENT RESOLVED*
*Title:* {{INCIDENT_TITLE}}
*Duration:* {{DURATION}}
*Resolution:* {{RESOLUTION_SUMMARY}}

Post-mortem to follow within 48 hours.
```

### Status Page Templates

**Investigating**
```
We are investigating reports of {{ISSUE_DESCRIPTION}}.

Some users may experience {{USER_IMPACT}}.

We are actively working to resolve this issue.
```

**Identified**
```
We have identified the cause of {{ISSUE_DESCRIPTION}}.

We are implementing a fix and expect resolution within {{ETA}}.

We apologize for the inconvenience.
```

**Resolved**
```
The issue affecting {{ISSUE_DESCRIPTION}} has been resolved.

All services are operating normally.

We apologize for any inconvenience this may have caused.
```

### Email Template (Stakeholders)
```
Subject: [{{SEVERITY}}] {{INCIDENT_TITLE}} - {{STATUS}}

Hi Team,

We are experiencing an incident affecting {{AFFECTED_SERVICES}}.

**Impact:** {{IMPACT_DESCRIPTION}}
**Current Status:** {{STATUS}}
**ETA for Resolution:** {{ETA}}

We will provide updates every {{UPDATE_FREQUENCY}}.

- {{IC_NAME}}, Incident Commander
```

## Testing

### Verification
- Templates cover all scenarios
- Placeholders are clearly marked
- Tone is professional and calm

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
