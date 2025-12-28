# Post-Mortem: [Incident Title]

> **Incident ID:** INC-XXXX
> **Date:** YYYY-MM-DD
> **Duration:** X hours Y minutes
> **Severity:** P1 (Critical) | P2 (High) | P3 (Medium) | P4 (Low)
> **Author:** [Name]
> **Status:** Draft | In Review | Final

## Executive Summary

One paragraph summary of what happened, impact, and key takeaways. Written for stakeholders who won't read the full document.

## Impact

| Metric | Value |
|--------|-------|
| Duration | X hours Y minutes |
| Users Affected | [number or percentage] |
| Revenue Impact | $X or N/A |
| Support Tickets | [number] |
| SLA Breach | Yes / No |

**User-Facing Impact:**
- [Specific feature/service] was unavailable/degraded
- Users experienced [specific symptoms]

## Timeline

All times in UTC (or specify timezone).

| Time | Event |
|------|-------|
| HH:MM | First alert fired / First user report |
| HH:MM | On-call engineer acknowledged |
| HH:MM | Initial investigation began |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |
| HH:MM | Incident declared resolved |

### Detailed Timeline

**HH:MM - Detection**
Description of how the incident was detected. Include alert names, who noticed, etc.

**HH:MM - Response**
Description of initial response actions taken.

**HH:MM - Investigation**
What was checked, hypotheses tested, dead ends encountered.

**HH:MM - Mitigation**
What was done to stop the bleeding (may differ from root cause fix).

**HH:MM - Resolution**
Final fix applied and verified.

## Root Cause Analysis

### What Happened

Technical explanation of what went wrong. Be specific and factual.

```
[Include relevant logs, error messages, or diagrams if helpful]
```

### Why It Happened

Use the "5 Whys" technique to dig deeper:

1. **Why** did [immediate cause] happen?
   - Because [reason]

2. **Why** did [reason] happen?
   - Because [deeper reason]

3. **Why** did [deeper reason] happen?
   - Because [even deeper reason]

4. **Why** did [even deeper reason] happen?
   - Because [systemic issue]

5. **Why** did [systemic issue] exist?
   - Because [root cause]

### Contributing Factors

- **Factor 1:** [Description]
- **Factor 2:** [Description]
- **Factor 3:** [Description]

## What Went Well

- [Positive observation about detection]
- [Positive observation about response]
- [Positive observation about communication]
- [Positive observation about tooling]

## What Could Be Improved

- [Area for improvement in detection]
- [Area for improvement in response]
- [Area for improvement in communication]
- [Area for improvement in tooling]

## Action Items

| ID | Action | Owner | Priority | Due Date | Status |
|----|--------|-------|----------|----------|--------|
| 1 | [Specific action to prevent recurrence] | [Name] | P1 | YYYY-MM-DD | Open |
| 2 | [Specific action to improve detection] | [Name] | P2 | YYYY-MM-DD | Open |
| 3 | [Specific action to improve response] | [Name] | P2 | YYYY-MM-DD | Open |
| 4 | [Documentation/runbook update] | [Name] | P3 | YYYY-MM-DD | Open |

### Action Item Details

**Action 1: [Title]**
- Description: [Detailed description]
- Success criteria: [How we know it's done]
- Ticket: [Link to tracking ticket]

**Action 2: [Title]**
- Description: [Detailed description]
- Success criteria: [How we know it's done]
- Ticket: [Link to tracking ticket]

## Lessons Learned

### Technical Lessons

1. [Technical lesson learned]
2. [Technical lesson learned]

### Process Lessons

1. [Process lesson learned]
2. [Process lesson learned]

### What Would Have Prevented This?

- [Preventive measure that would have avoided this incident]

### What Would Have Reduced Impact?

- [Measure that would have reduced duration or scope]

## Appendix

### Related Incidents

- [Link to similar past incidents]

### Supporting Data

- [Links to dashboards, logs, graphs]
- [Screenshots if relevant]

### References

- [Relevant documentation]
- [Related RFCs or ADRs]

---

## Template Usage Notes

Delete this section when creating an actual post-mortem.

### Blameless Culture

Post-mortems are about **learning, not blaming**. Focus on:
- Systems and processes, not individuals
- "How did the system allow this?" not "Who made this mistake?"
- Preventing recurrence, not assigning fault

### When to Write a Post-Mortem

- All P1 (Critical) incidents - required
- All P2 (High) incidents - required
- P3 incidents with learning value - recommended
- Near-misses that could have been serious - recommended

### Timeline

| Phase | Timeframe |
|-------|-----------|
| Draft started | Within 24-48 hours |
| Draft completed | Within 3-5 business days |
| Review meeting | Within 1 week |
| Action items created | During review meeting |
| Final version published | Within 2 weeks |

### Review Meeting Agenda

1. Read-through of timeline (10 min)
2. Discuss root cause analysis (15 min)
3. Review what went well / could improve (10 min)
4. Assign action items (15 min)
5. Agree on lessons learned (10 min)

### Naming Convention

```
YYYY-MM-DD-incident-brief-description.md
```

Examples:
- `2024-03-15-api-outage-database-connection-exhaustion.md`
- `2024-02-28-payment-failures-stripe-timeout.md`

### Storage Location

Store in: `docs/post-mortems/YYYY/`
