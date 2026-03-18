---
created: 2026-03-15
updated: 2026-03-15
version: 1.0.0
name: plan-stories
description: 'List all stories linked to a specific plan slug from the KB. Shows story ID, title, state, priority, phase, and epic in a table.'
kb_tools:
  - kb_list_stories
  - kb_get_plan
---

# /plan-stories — List Stories for a Plan

Query the KB for all stories linked to a given plan slug.

## Usage

```
/plan-stories <plan-slug>
/plan-stories consolidate-db-enhancements
/plan-stories consolidate-db-enhancements --state=in_progress
/plan-stories consolidate-db-enhancements --all
```

## Arguments

| Argument    | Required | Description                                                  |
| ----------- | -------- | ------------------------------------------------------------ |
| `plan-slug` | yes      | The plan slug to query (e.g., `consolidate-db-enhancements`) |
| `--state=X` | no       | Filter by a single workflow state                            |
| `--all`     | no       | Include completed and cancelled stories (default: exclude)   |

---

## Execution Steps

### Step 1: Parse Arguments

Extract:

- `plan_slug` — first positional argument (required)
- `--state=X` — optional single state filter
- `--all` — if present, include `completed` and `cancelled` stories

If no plan slug provided: `ERROR: plan slug is required. Usage: /plan-stories <plan-slug>`

### Step 2: Fetch Plan Metadata (optional enrichment)

Call `kb_get_plan({ plan_slug })` to get the plan title and status for the header.
If the plan is not found, emit a warning but continue — stories may still exist via `plan_story_links`.

**Fallback (if MCP tool unavailable):** Query the KB DB directly (port 5433):

```javascript
const { Client } = require('./apps/api/knowledge-base/node_modules/pg')
const c = new Client({
  connectionString: 'postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase',
})
```

```sql
SELECT plan_slug, title, status, priority, estimated_stories, feature_dir
FROM workflow.plans
WHERE plan_slug = $1 AND deleted_at IS NULL;
```

### Step 3: Query Stories

Call `kb_list_stories` with `plan_slug` and `limit: 100`:

```javascript
kb_list_stories({
  plan_slug: '<plan-slug>',
  state: '--state value', // omit if not provided
  limit: 100,
})
```

If `--all` is NOT provided, filter out stories where `state` is `completed` or `cancelled` from the results client-side (or pass an explicit `states` array excluding them if `--state` was not specified).

If result count equals 100, paginate: call again with `offset: 100` until results < 100.

**Fallback (if MCP tool unavailable):** Query the KB DB directly:

```sql
SELECT s.story_id, s.title, s.state, s.priority, s.phase, s.epic, s.feature,
       s.updated_at, s.blocked
FROM workflow.stories s
JOIN workflow.plan_story_links psl ON psl.story_id = s.story_id
JOIN workflow.plans p ON p.id = psl.plan_id
WHERE p.plan_slug = $1
  AND s.deleted_at IS NULL
  [AND s.state = $2]          -- if --state filter provided
ORDER BY s.state, s.priority, s.story_id;
```

If `--all` is NOT provided, append: `AND s.state NOT IN ('completed', 'cancelled')`

### Step 4: Format Output

Print a header block:

```
Plan: <plan_slug>
Title: <plan title from kb_get_plan, or "(not found in KB)">
Status: <plan status>
Stories: <count shown> of <total found>
```

Then render a markdown table:

```
| Story ID | Title | State | Priority | Phase | Epic | Updated |
```

**Column formatting:**

- **Story ID**: as-is (e.g., `CDBN-3020`)
- **Title**: truncate to 60 chars
- **State**: map to display label (see table below)
- **Priority**: as-is (`critical`, `high`, `medium`, `low`) or `—`
- **Phase**: as-is or `—`
- **Epic**: as-is or `—`
- **Updated**: relative date (e.g., "2h ago", "3d ago", "today")

**State display labels:**

| DB State             | Display        |
| -------------------- | -------------- |
| `backlog`            | backlog        |
| `ready`              | ready          |
| `in_progress`        | in-progress    |
| `ready_for_review`   | needs-review   |
| `in_review`          | in-review      |
| `ready_for_qa`       | ready-for-qa   |
| `in_qa`              | in-qa          |
| `completed`          | ✅ completed   |
| `cancelled`          | cancelled      |
| `failed_code_review` | ❌ review-fail |
| `failed_qa`          | ⚠️ qa-fail     |
| `deferred`           | deferred       |

Sort order: state (in-progress first, completed last), then priority (critical first), then story ID.

### Step 5: Summary Line

After the table:

```
<N> stories for plan <plan-slug>: X in-progress, Y ready, Z completed, W other
```

If no stories found:

```
No stories found for plan "<plan-slug>".
Confirm the slug is correct with /plans or check if stories have been linked.
```

---

## Error Handling

| Error                    | Action                                                      |
| ------------------------ | ----------------------------------------------------------- |
| No plan slug provided    | `ERROR: plan slug is required`                              |
| KB MCP tools unavailable | Fall back to direct DB query (port 5433, `workflow` schema) |
| DB connection failed     | `ERROR: KB unavailable — cannot fetch stories`              |
| Plan not found in KB     | Warn, continue with story query                             |
| No stories found         | Show "No stories found" message with hint                   |

## DB Notes

- KB DB runs on **port 5433** (`knowledgebase` or `lego_kb` database)
- Plans and stories live in the **`workflow` schema**: `workflow.plans`, `workflow.stories`, `workflow.plan_story_links`
- The `public` schema holds knowledge entries, embeddings, and ADRs — **not** stories or plans

## Signal

- `PLAN-STORIES COMPLETE` — results displayed
- `PLAN-STORIES EMPTY` — no stories linked to this plan
- `PLAN-STORIES ERROR: <reason>` — could not query KB
