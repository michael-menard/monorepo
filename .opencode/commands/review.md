---
description: Run comprehensive code review with specialist sub-agents
---

# /review - Code Review

Comprehensive code review with parallel specialist sub-agents.

## Usage

```
/review
```

## Review Areas

- Requirements traceability
- Code quality
- Security
- Performance
- Accessibility
- Test coverage
- Technical debt

## Process

1. Spawn parallel specialist sub-agents:
   - PM review
   - UX review
   - SM review
2. Aggregate findings
3. Call QA gate for final decision

## Produces

- Detailed findings for each area
- PASS, CONCERNS, FAIL, or WAIVED decision
- Actionable items for improvements
