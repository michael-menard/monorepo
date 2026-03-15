---
name: roadmap
description: Show the active roadmap — current and future plans only (excludes implemented, superseded, archived). Quick view of what's in flight and coming next.
---

# /roadmap - Active Roadmap View

## Usage

```
/roadmap                         # All active plans sorted by priority
/roadmap --type=workflow         # Filter by domain prefix (matches workflow:*)
/roadmap --type=workflow:migration  # Filter by exact compound type
/roadmap --type=lego             # Filter by domain prefix (matches lego:*)
/roadmap --priority=P1           # Show only P1 items
/roadmap --prefix=APIP           # Filter by story prefix
```

Multiple filters can be combined: `/roadmap --priority=P1 --type=workflow`

## Plan Type Schema

Plan types use a **compound `domain:subtype` key**. Known values:

| Domain     | Subtypes                                                  | Meaning                      |
| ---------- | --------------------------------------------------------- | ---------------------------- |
| `workflow` | `migration`, `feature`, `tooling`, `langgraph`, `testing` | Workflow/platform plans      |
| `lego`     | `feature`, `refactor`                                     | LEGO app (product) plans     |
| `monorepo` | `tooling`, `refactor`                                     | Monorepo-wide infrastructure |
| `tooling`  | `workflow`                                                | Tooling for workflow agents  |

When filtering with `--type=X`:

- If `X` contains `:` → exact match on full compound type (e.g. `--type=workflow:migration`)
- If `X` has no `:` → prefix match on domain (e.g. `--type=workflow` matches `workflow:migration`, `workflow:feature`, etc.)

## Execution

### Step 1 — Parse Arguments

Parse the user's input for optional filters:

| Argument       | Maps To               | Behavior                                                    |
| -------------- | --------------------- | ----------------------------------------------------------- |
| `--type=X`     | `plan_type` filter    | Exact if `X` contains `:`, prefix-match on domain otherwise |
| `--priority=X` | `priority` filter     | P1, P2, P3, P4, P5                                          |
| `--prefix=X`   | `story_prefix` filter | e.g., APIP, WINT, CDBN                                      |
| _(no args)_    | no extra filters      | all active plans                                            |

### Step 2 — Query KB

**Preferred:** Call `kb_list_plans` for each active status: `in-progress`, `stories-created`, `draft`, `active`, `accepted`. Make the five calls **in parallel**.

- Pass `priority` and `story_prefix` filters directly to each call if provided.
- Pass `plan_type` only if `--type=X` contains `:` (exact match). If `X` has no `:`, fetch unfiltered and apply prefix match client-side after merging.
- Use `limit: 50` for each call.

**Fallback (if MCP tools unavailable):** Query the database directly:

```javascript
const { Client } = require('./apps/api/knowledge-base/node_modules/pg')
const c = new Client({
  connectionString: 'postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase',
})
```

SQL to fetch plans:

```sql
SELECT plan_slug, title, LEFT(COALESCE(summary,''), 100) AS summary,
       plan_type, status, feature_dir, story_prefix, estimated_stories, priority, updated_at
FROM workflow.plans
WHERE status IN ('in-progress','stories-created','draft','active','accepted')
  AND deleted_at IS NULL
  [AND priority = $1]              -- if --priority filter
  [AND (plan_type = $2             -- if --type=X with ':'
        OR plan_type LIKE $2||':%')]  -- if --type=X without ':'
  [AND story_prefix = $3]          -- if --prefix filter
ORDER BY
  CASE status WHEN 'in-progress' THEN 1 WHEN 'stories-created' THEN 2 WHEN 'draft' THEN 3 END,
  priority,
  plan_slug;
```

Merge all results into a single list and sort by:

1. Priority (P1 first)
2. Status order: in-progress > stories-created > draft
3. Plan slug alphabetically

### Step 3 — Format Output

Display results as a markdown table:

```
| Priority | Type | Status | Plan Slug | Description | Prefix | Stories | Updated |
```

**Column formatting:**

- **Priority**: P1-P5
- **Type**: full compound type value (e.g. `workflow:migration`, `lego:feature`)
- **Status**: as-is
- **Plan Slug**: backtick-wrapped slug
- **Description**: use `summary` field, truncate to 80 chars if needed (append "...")
- **Prefix**: story_prefix or `--`
- **Stories**: For in-progress and stories-created plans that have a `featureDir`:
  - Use `basename(featureDir)` as the `feature` filter for `kb_list_stories` (e.g. `"plans/future/platform/wint"` → `"wint"`)
  - Or query the DB: `SELECT COUNT(*), COUNT(*) FILTER (WHERE state='completed') FROM public.stories WHERE feature=$1 AND deleted_at IS NULL`
  - Display as `completed/total` (e.g. `3/20`)
  - For draft plans or plans with no stories in DB, show `estimated_stories` or `--`
- **Updated**: relative date (e.g. "2h ago", "3d ago", "today")

### Step 4 — Summary Line

After the table, output a one-line summary:

```
Roadmap: N active plans — X draft, Y accepted, Z stories-created, W in-progress
```

Count each status from the returned results.
