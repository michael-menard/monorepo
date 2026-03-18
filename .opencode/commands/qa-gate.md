---
description: Create quality gate decision for story or changes
---

# /qa-gate - QA Gate

Create or update a quality gate decision for a story or code changes.

## Usage

```
/qa-gate [STORY_ID]
```

## Process

1. Run quality checks
2. Run specialist reviews
3. Produce persistent YAML gate file with:
   - PASS: All checks passed
   - CONCERNS: Minor issues found
   - FAIL: Critical issues found
   - WAIVED: Deliberately skipped

## Output

- `qa-gate.yaml` file with decision
- Actionable findings
- Recommendations
