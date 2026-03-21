---
name: arbiter-outcome-tracker
description: Track arbiter ruling accuracy over time. After fixes, record whether upheld findings needed fixes and dismissed findings were correctly dismissed.
model: sonnet
---

See .claude/skills/arbiter-outcome-tracker/SKILL.md for full specification.

## Quick Usage

```bash
# Track outcome for a ruling
/arbiter-outcome-tracker --session-id "{uuid}" --finding-id "LG-001"

# After fix sprint - track all
/arbiter-outcome-tracker --session-id "{uuid}" --track-all

# View accuracy stats
/arbiter-outcome-tracker --stats
```

## What It Tracks

| Outcome           | Meaning                            |
| ----------------- | ---------------------------------- |
| `fixed`           | Upheld finding, fix resolved issue |
| `partially_fixed` | Upheld finding, partial resolution |
| `not_fixed`       | Upheld finding, fix didn't work    |
| `wont_fix`        | Upheld finding, decided not to fix |

## Accuracy Dashboard

Shows:

- Upheld ruling accuracy (was it actually an issue?)
- Dismissed ruling accuracy (was it correctly dismissed?)
- Severity accuracy (was the level appropriate?)
- Breakdown by category
