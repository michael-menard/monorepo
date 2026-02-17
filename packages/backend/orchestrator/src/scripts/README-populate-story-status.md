# Story Status Population Script

Populates the `wint.stories` database table with story status from filesystem.

**Story:** WINT-1030
**Purpose:** Initialize database-driven workflow by populating story state after WINT-1020 directory flattening

---

## Overview

After WINT-1020 flattens story directories and adds `status:` to frontmatter, the database needs to be initialized with current story state to enable database-driven workflows (story commands, LangGraph workflows).

This script:
- Scans all epic directories under `plans/future/platform/`
- Reads story frontmatter using `StoryFileAdapter`
- Infers status from frontmatter (priority) or directory location (fallback)
- Handles duplicates using lifecycle priority ranking
- Inserts stories into `wint.stories` table
- Provides dry-run, execute, and verify modes

---

## Usage

### Prerequisites

1. **Database connection:** Set environment variables:
   ```bash
   export POSTGRES_HOST=localhost
   export POSTGRES_PORT=5432
   export POSTGRES_DATABASE=postgres
   export POSTGRES_USER=postgres
   export POSTGRES_PASSWORD=postgres
   ```

2. **wint.stories table exists:** Created by migration `0015_messy_sugar_man.sql` (WINT-0010)

3. **Stories have been flattened (optional):** WINT-1020 adds `status:` to frontmatter

### Commands

#### 1. Dry-Run (Required First Step)

Generates population plan without database writes:

```bash
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --dry-run
```

**Output:** `dry-run-plan.json`
**Contains:**
- Discovered stories count
- Planned insertions (story_id, title, inferred state, inference method)
- Skipped stories (with reasons)
- Duplicates resolved
- State distribution
- Epic distribution

#### 2. Execute Population

Populates database with stories:

```bash
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --execute
```

**Output:** `migration-log.json`
**Contains:**
- Inserted count (successful)
- Skipped count (malformed YAML, missing fields)
- Failed count (database errors)
- Full audit trail (all operations, timestamps, errors)

**Safety:**
- Idempotent: `ON CONFLICT (story_id) DO NOTHING` prevents duplicates
- Fail-soft: Skips malformed stories, continues processing
- Single pool: All insertions use one database connection

#### 3. Verify Population

Validates database state after execution:

```bash
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --verify
```

**Output:** `verification-report.json`
**Contains:**
- Total stories in database
- State distribution (count per state)
- Validation checks:
  - No NULL states
  - No duplicate story_ids
  - State distribution calculated
- Pass/fail status

**Exit code:** 1 if verification fails, 0 if passes

#### 4. Verbose Mode

Add `--verbose` to any command for detailed logging:

```bash
npx tsx packages/backend/orchestrator/src/scripts/populate-story-status.ts --dry-run --verbose
```

---

## Status Inference Rules

### Priority Hierarchy

1. **Frontmatter `status:` field** (explicit, post-WINT-1020)
   - Example: `status: in-progress` → `in_progress` (hyphen → underscore)
   - Direct mapping to database enum

2. **Lifecycle directory location** (implicit, pre-WINT-1020)
   - `backlog/` → `backlog`
   - `elaboration/` → `backlog` (not started)
   - `ready-to-work/` → `ready_to_work`
   - `in-progress/` → `in_progress`
   - `ready-for-qa/` → `ready_for_qa`
   - `UAT/` → `in_qa`

3. **Default fallback:** `backlog` if neither available

### Enum Mapping

Database uses underscored enum values (`story_state`):
```
draft, backlog, ready_to_work, in_progress, ready_for_qa, in_qa, blocked, done, cancelled
```

Frontmatter may use hyphens:
```
'ready-to-work' → 'ready_to_work' (automatic conversion)
'in-progress' → 'in_progress'
```

---

## Duplicate Resolution

If same story ID appears in multiple locations (e.g., `WINT-0010` in both `backlog/` and `in-progress/`):

**Resolution:** Use lifecycle priority ranking (higher = more advanced):

| Lifecycle | Priority |
|-----------|----------|
| UAT | 6 |
| ready-for-qa | 5 |
| in-progress | 4 |
| ready-to-work | 3 |
| elaboration | 2 |
| backlog | 1 |

**Example:**
- `wint/backlog/WINT-0010/` (priority 1)
- `wint/in-progress/WINT-0010/` (priority 4)
- **Resolved:** `in-progress` location (more advanced)

---

## Error Handling

### Skipped Stories

Stories are skipped (not inserted) if:
- **Frontmatter read fails:** Malformed YAML, file missing
- **Required field missing:** `title` is required
- **Validation error:** Zod schema validation fails

**Action:** Logged in `migration-log.json` with reason, processing continues

### Failed Insertions

Database insert failures (rare):
- Unique constraint violations (duplicate story_id)
- Connection errors
- Invalid enum values

**Action:** Logged in `migration-log.json` with error message, processing continues

### Fail-Soft Behavior

Script does NOT fail-fast:
- Malformed stories are skipped
- Database errors are logged
- Other stories continue processing
- Final summary reports success/failure counts

---

## Output Files

### dry-run-plan.json

```json
{
  "timestamp": "2026-02-16T12:00:00Z",
  "discovered_count": 150,
  "planned_insertions": [
    {
      "story_id": "WINT-0010",
      "title": "Story Management Tables",
      "state": "done",
      "inference_method": "directory",
      "source_file": "/path/to/WINT-0010/WINT-0010.md",
      "epic": "wint"
    }
  ],
  "skipped_stories": [],
  "duplicates_resolved": [],
  "state_distribution": {
    "backlog": 50,
    "in_progress": 30,
    "done": 70
  },
  "epic_distribution": {
    "wint": 100,
    "kbar": 50
  }
}
```

### migration-log.json

```json
{
  "started_at": "2026-02-16T12:00:00Z",
  "completed_at": "2026-02-16T12:01:00Z",
  "discovered_count": 150,
  "inserted_count": 145,
  "skipped_count": 5,
  "failed_count": 0,
  "insertions": [
    {
      "story_id": "WINT-0010",
      "success": true,
      "state": "done",
      "timestamp": "2026-02-16T12:00:05Z"
    }
  ],
  "skipped_stories": [],
  "duplicates_resolved": [],
  "errors": []
}
```

### verification-report.json

```json
{
  "timestamp": "2026-02-16T12:02:00Z",
  "passed": true,
  "total_stories": 145,
  "state_distribution": [
    { "state": "done", "count": 70 },
    { "state": "backlog", "count": 50 },
    { "state": "in_progress", "count": 25 }
  ],
  "checks": [
    {
      "check": "Total stories in database",
      "passed": true,
      "actual": 145
    },
    {
      "check": "No NULL states",
      "passed": true,
      "expected": 0,
      "actual": 0
    }
  ],
  "errors": []
}
```

---

## Performance

**Expected Throughput:**
- ~200ms per story (read + parse + insert)
- 100 stories: ~20 seconds
- 200 stories: ~40 seconds
- Target: <60 seconds for 100+ stories

**Optimization:**
- Batch processing: 50 stories per batch
- Single database pool for all operations
- Frontmatter-only reading (not full markdown)

---

## Troubleshooting

### "Cannot find module '@repo/logger'"

Ensure dependencies are installed:
```bash
pnpm install
```

### "Connection refused" or Database errors

Check environment variables and database connection:
```bash
psql -h localhost -U postgres -d postgres
```

### "No stories discovered"

Verify directory structure:
```bash
ls plans/future/platform/wint/
```

Expected: Epic directories (wint, kbar, etc.) containing story directories

### "Permission denied" on dry-run-plan.json

Check write permissions in current directory:
```bash
ls -la dry-run-plan.json
```

Script writes to `process.cwd()` (usually monorepo root)

---

## Integration with Other Stories

### WINT-1020 (Directory Flattening)
- Must complete before WINT-1030 execution
- Adds `status:` field to frontmatter
- Flattens lifecycle directories

### WINT-1040, WINT-1050, WINT-1060 (Story Commands)
- Require populated database
- Use `wint.stories` table as source of truth

### WINT-1070 (Index Generation)
- Generates `stories.index.md` from database
- Requires populated `wint.stories` table

---

## Related Documentation

- **Schema:** `/packages/backend/database-schema/src/schema/unified-wint.ts`
- **Migration:** `/packages/backend/database-schema/src/migrations/app/0015_messy_sugar_man.sql`
- **Story File Adapter:** `/packages/backend/orchestrator/src/adapters/story-file-adapter.ts`
- **Story Repository:** `/packages/backend/orchestrator/src/db/story-repository.ts`
