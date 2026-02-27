---
name: roadmap
description: Show the active roadmap — current and future plans only (excludes implemented, superseded, archived). Quick view of what's in flight and coming next.
---

# /roadmap - Active Roadmap View

## Usage

```
/roadmap                   # All active plans sorted by priority
/roadmap --type=feature    # Filter by plan type
/roadmap --priority=P1     # Show only P1 items
/roadmap --prefix=APIP     # Filter by story prefix
```

## Execution

### Step 1 — Parse Arguments

Parse the user's input for optional filters:

| Argument | Maps To | Values |
|----------|---------|--------|
| `--type=X` | `plan_type` filter | feature, refactor, migration, infra, tooling, workflow, audit, spike |
| `--priority=X` | `priority` filter | P1, P2, P3, P4, P5 |
| `--prefix=X` | `story_prefix` filter | e.g., APIP, SKCR, DASH |
| *(no args)* | no extra filters | all active plans |

### Step 2 — Query KB

Call `kb_get_roadmap` with the parsed filters and `limit: 50`.

This tool automatically excludes `implemented`, `superseded`, and `archived` plans. Only `draft`, `accepted`, `stories-created`, and `in-progress` plans are returned.

Results are pre-sorted by priority (P1 first), then status, then slug.

### Step 3 — Format Output

Display results as a markdown table:

```
| Priority | Status | Plan Slug | Title | Type | Prefix | Stories | Updated |
```

**Column formatting:**
- **Priority**: P1-P5
- **Status**: as-is
- **Plan Slug**: backtick-wrapped slug
- **Title**: truncate to 50 chars if needed
- **Type**: as-is or `--`
- **Prefix**: story_prefix or `--`
- **Stories**: estimated_stories or `--`
- **Updated**: relative date (e.g., "2h ago", "3d ago")

### Step 4 — Summary Line

After the table, output a one-line summary:

```
Roadmap: N active plans — X draft, Y accepted, Z stories-created, W in-progress
```

Count each status from the returned results.
