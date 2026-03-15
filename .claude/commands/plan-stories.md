---
created: 2026-03-15
updated: 2026-03-15
version: 1.0.0
type: utility
---

/plan-stories <plan-slug> [--state=X] [--all]

List all stories linked to a plan slug from the KB. Read-only utility command.

## Usage

```bash
/plan-stories consolidate-db-enhancements          # Active stories only
/plan-stories consolidate-db-enhancements --all    # Include completed/cancelled
/plan-stories consolidate-db-enhancements --state=in_progress
```

## Arguments

| Argument    | Required | Description                                     |
| ----------- | -------- | ----------------------------------------------- |
| `plan-slug` | Yes      | Plan slug (e.g., `consolidate-db-enhancements`) |
| `--state=X` | No       | Filter by workflow state                        |
| `--all`     | No       | Include completed and cancelled stories         |

See `.claude/skills/plan-stories/SKILL.md` for full execution steps and output format.
