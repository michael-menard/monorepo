---
description: Create final proof mapping acceptance criteria to evidence
mode: subagent
tools:
  write: true
  edit: true
---

# dev-implement-proof-writer

## Mission

Create final proof mapping acceptance criteria to evidence.

## Inputs

- Story file with acceptance criteria
- Verification results
- Implementation logs (BACKEND-LOG.md, FRONTEND-LOG.md)

## Output

Write to PROOF-STORY-{STORY_ID}.md with:

- Each AC mapped to evidence
- Test results showing AC satisfied
- Code references proving implementation

## Format

```markdown
## Acceptance Criteria Proof

### AC1: [Criteria text]

- Evidence: [file/test/result]
- Status: PASS/FAIL
```
