# Story lnch-1026: Post-Mortem Template

## Status

Draft

## Story

**As an** incident responder,
**I want** a standardized post-mortem template,
**so that** we can learn from incidents consistently.

## Epic Context

This is **Story 3 of Launch Readiness Epic: Incident Response Workstream**.
Priority: **High** - Required for continuous improvement.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1025: Incident Classification Guide (severity levels)

## Related Stories

- lnch-1024: On-Call Playbook (triggers post-mortem)
- lnch-1025: Incident Classification Guide (severity reference)
- lnch-1027: Communication Templates (resolution comms)

## Acceptance Criteria

1. Template exists at `docs/operations/templates/postmortem-template.md`
2. Includes incident summary section
3. Includes detailed timeline
4. Includes root cause analysis
5. Includes action items with owners
6. Includes lessons learned
7. Blameless by design

## Tasks / Subtasks

- [ ] **Task 1: Create Template Structure** (AC: 1)
  - [ ] Create `docs/operations/templates/` directory
  - [ ] Create `postmortem-template.md`

- [ ] **Task 2: Create Summary Section** (AC: 2)
  - [ ] Incident title and date
  - [ ] Severity and duration
  - [ ] Impact summary
  - [ ] Executive summary

- [ ] **Task 3: Create Timeline Section** (AC: 3)
  - [ ] Detection time
  - [ ] Key events with timestamps
  - [ ] Resolution time
  - [ ] Recovery confirmation

- [ ] **Task 4: Create Root Cause Section** (AC: 4)
  - [ ] 5 Whys analysis
  - [ ] Contributing factors
  - [ ] Trigger vs root cause
  - [ ] Technical details

- [ ] **Task 5: Create Action Items Section** (AC: 5)
  - [ ] Immediate fixes (completed)
  - [ ] Short-term improvements
  - [ ] Long-term prevention
  - [ ] Owner and due date

- [ ] **Task 6: Create Lessons Section** (AC: 6)
  - [ ] What went well
  - [ ] What went poorly
  - [ ] Where we got lucky
  - [ ] Process improvements

- [ ] **Task 7: Ensure Blameless Tone** (AC: 7)
  - [ ] Focus on systems not people
  - [ ] Review for blame language
  - [ ] Guidance for facilitators

## Dev Notes

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

## Summary
- **Date:** YYYY-MM-DD
- **Severity:** SEV1/SEV2/SEV3
- **Duration:** X hours Y minutes
- **Impact:** [Brief description of user impact]
- **Author:** [Name]
- **Reviewers:** [Names]

## Executive Summary
[2-3 sentences describing what happened and the resolution]

## Timeline (All times UTC)
| Time | Event |
|------|-------|
| HH:MM | Alert triggered |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Root Cause Analysis

### What Happened
[Detailed technical description]

### 5 Whys
1. Why did X happen? Because Y
2. Why did Y happen? Because Z
3. ...

### Contributing Factors
- Factor 1
- Factor 2

## Impact
- Users affected: X
- Revenue impact: $X
- Data impact: None / Description

## Action Items
| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| Immediate fix | Name | P0 | Done | ✅ |
| Add monitoring | Name | P1 | Date | 🔄 |
| Improve process | Name | P2 | Date | ⏳ |

## Lessons Learned

### What Went Well
- Item 1
- Item 2

### What Went Poorly
- Item 1
- Item 2

### Where We Got Lucky
- Item 1

## Appendix
- Link to incident Slack thread
- Link to relevant PRs
- Link to dashboards
```

### Blameless Guidelines
- Replace "Person X caused" with "The system allowed"
- Focus on process gaps, not individual mistakes
- Ask "How can we prevent this?" not "Who is at fault?"

## Testing

### Verification
- Template is complete and usable
- Tone is blameless
- Action items have clear ownership

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
