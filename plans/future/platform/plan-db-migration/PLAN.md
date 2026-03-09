# Plan DB Migration — Full Lifecycle in Postgres

**Plan Slug:** `plan-db-migration`
**Prefix:** `PDBM`
**Type:** migration
**Priority:** P1
**Estimated Stories:** 14
**Status:** accepted
**Tags:** kb, plans, migration, postgres, schema, agents
**Depends On:** `kb-single-source-of-truth`

## Problem Statement

Plan documents currently live as markdown files on the filesystem (`PLAN.md`, `*.plan.meta.md`, `*.plan.exec.md`). While the KB database has `plans` and `plan_details` tables with MCP tools for CRUD, the **actual plan content is authored and read from disk**. This creates the same drift problem that KSOT solved for stories:

- ~33 plan files totaling ~500KB across `plans/`
- Two inconsistent formats (YAML frontmatter vs inline header blocks)
- No revision history — edits overwrite in place
- No semantic search — agents can't discover related plans
- No progress tracking — "how far along is this plan?" requires manual counting
- Blocked plans are invisible — dependencies exist in `plan_dependencies` but nothing surfaces or enforces them
- Agents must join 5+ tables to answer basic questions about plan status
- Execution logs (`*.plan.exec.md`) are unstructured markdown with no queryable history

### Current State of DB Tables

The `plans` and `plan_details` tables exist but are underutilized:
- `plan_details.phases` (JSONB) — column exists, unclear if populated
- `plan_details.raw_content` — column exists, may be stale or empty for most plans
- `plan_story_links` — join table exists, unclear if rows are created during story generation
- `plan_dependencies` — table exists, unclear if the dependency graph is populated

---

## Phase 0: Schema Improvements (4 stories)

**Goal:** Upgrade the plan schema before ingesting content. Get the data model right first.

### PDBM-0010: Add Plan Revision History Table

**What:** Create `plan_revision_history` — append-only table tracking every change to plan content.

**Schema:**
```sql
CREATE TABLE plan_revision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id),
  raw_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  sections JSONB,
  change_reason TEXT,
  changed_by TEXT,          -- agent name or 'human'
  revision_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_revisions_plan_id ON plan_revision_history(plan_id);
CREATE INDEX idx_plan_revisions_created ON plan_revision_history(created_at);
```

**Trigger:** Auto-insert a revision row whenever `plan_details.raw_content` changes.

---

### PDBM-0020: Add Plan Execution Log Table

**What:** Create `plan_execution_log` — replaces `*.plan.exec.md` files with structured, queryable entries.

**Schema:**
```sql
CREATE TABLE plan_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'phase_started', 'phase_completed', 'story_spawned', 'story_completed',
    'blocked', 'unblocked', 'decision', 'note', 'error', 'status_change'
  )),
  phase TEXT,               -- which phase this entry relates to
  story_id TEXT,            -- optional, if entry relates to a specific story
  message TEXT NOT NULL,
  metadata JSONB,           -- flexible payload (agent name, context, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_exec_log_plan_id ON plan_execution_log(plan_id);
CREATE INDEX idx_plan_exec_log_type ON plan_execution_log(entry_type);
CREATE INDEX idx_plan_exec_log_created ON plan_execution_log(created_at);
```

---

### PDBM-0030: Extend Plan Tables — New Columns and Auto-Block

**What:** Add missing columns and the blocked-state automation.

**New columns on `plan_details`:**
- `sections` (JSONB) — parsed table-of-contents / section breakdown for partial reads
- `format_version` (TEXT) — tracks source format (`yaml_frontmatter` | `inline_header` | `native`)

**New columns on `plans`:**
- `superseded_by` (UUID FK → plans) — points to replacement plan when status = superseded
- `pre_blocked_status` (TEXT) — stashes the previous status when auto-blocked, restored on unblock

**Auto-block trigger on `plan_dependencies`:**
```sql
-- On INSERT/UPDATE of plan_dependencies:
-- 1. If any unsatisfied dependency exists for a plan, set status = 'blocked',
--    stash current status in pre_blocked_status
-- 2. If ALL dependencies are now satisfied AND status = 'blocked',
--    restore status from pre_blocked_status, clear pre_blocked_status
```

**Add `blocked` to plan status enum** (if not already present).

---

### PDBM-0040: Create Plan Summary View

**What:** A database view that pre-joins common plan queries so agents get everything in one call.

```sql
CREATE VIEW plan_summary_view AS
SELECT
  p.id,
  p.plan_slug,
  p.title,
  p.status,
  p.priority,
  p.plan_type,
  p.story_prefix,
  p.tags,
  p.estimated_stories,
  p.parent_plan_id,
  parent.plan_slug AS parent_plan_slug,
  p.created_at,
  p.updated_at,

  -- Progress from plan_story_links + stories
  COUNT(DISTINCT psl.story_id) AS stories_total,
  COUNT(DISTINCT psl.story_id) FILTER (
    WHERE s.state = 'completed'
  ) AS stories_completed,
  COUNT(DISTINCT psl.story_id) FILTER (
    WHERE s.state IN ('in_progress', 'ready_for_review', 'in_review', 'in_qa')
  ) AS stories_in_progress,
  COUNT(DISTINCT psl.story_id) FILTER (
    WHERE s.state = 'blocked'
  ) AS stories_blocked,
  CASE
    WHEN COUNT(DISTINCT psl.story_id) = 0 THEN 0
    ELSE ROUND(
      COUNT(DISTINCT psl.story_id) FILTER (WHERE s.state = 'completed')::numeric
      / COUNT(DISTINCT psl.story_id) * 100
    )
  END AS progress_pct,

  -- Blocking info from plan_dependencies
  ARRAY_AGG(DISTINCT pd.depends_on_slug) FILTER (
    WHERE pd.satisfied = false
  ) AS blocking_plans,
  EXISTS (
    SELECT 1 FROM plan_dependencies pd2
    WHERE pd2.plan_slug = p.plan_slug AND pd2.satisfied = false
  ) AS is_blocked,

  -- Supersession
  sup.plan_slug AS superseded_by_slug

FROM plans p
LEFT JOIN plans parent ON p.parent_plan_id = parent.id
LEFT JOIN plan_story_links psl ON psl.plan_id = p.id
LEFT JOIN stories s ON s.story_id = psl.story_id AND s.deleted_at IS NULL
LEFT JOIN plan_dependencies pd ON pd.plan_slug = p.plan_slug
LEFT JOIN plans sup ON p.superseded_by = sup.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, parent.plan_slug, sup.plan_slug;
```

**New MCP tool:** `kb_get_plan_dashboard` — queries this view with optional filters (status, priority, plan_type). Returns the pre-computed progress and blocking info. Replaces complex multi-query patterns agents currently use.

Start as a regular view; materialize later if 60+ concurrent agents cause performance issues.

---

### PDBM-0050: Add Vector Embeddings for Plans

**What:** Enable semantic search across plans so agents can discover related plans.

**Approach:** Add an `embedding` column (vector(1536)) to `plans`, or create a `plan_embeddings` table mirroring the pattern used by `knowledge_entries`.

**MCP tool:** Extend `kb_search` or add `kb_search_plans` — takes a natural language query, returns ranked plans by semantic similarity.

**Embedding source:** Concatenation of title + summary + first N characters of raw_content (or the `sections` JSONB summary).

**Refresh strategy:** Re-embed when `plan_details.raw_content` changes (piggyback on the revision history trigger).

---

## Phase 1: Content Ingestion (2 stories)

**Goal:** Bulk import all existing plan files into the database. After this phase, every plan has its full content in Postgres.

### PDBM-1010: Build Plan Ingestion Script

**What:** A migration script that reads every plan file from disk and upserts into the DB.

**Steps:**
1. Glob for `PLAN.md`, `*.plan.meta.md` across `plans/`
2. Parse each file — detect format (YAML frontmatter vs inline header), extract metadata
3. For each plan:
   - Upsert `plans` row (slug, title, type, status, priority, tags, story_prefix)
   - Upsert `plan_details` row (raw_content, content_hash, sections, format_version, source_file)
   - Populate `plan_story_links` by cross-referencing stories in the DB that match the plan's prefix
   - Populate `plan_dependencies` from parsed dependency lists
4. Generate and store embeddings
5. Report: plans imported, stories linked, dependencies mapped, any conflicts

**Reconciliation:** Handle plans that already exist in the DB (from `/plan` skill usage). Use `content_hash` to detect which is newer.

---

### PDBM-1020: Ingest Execution Logs

**What:** Parse `*.plan.exec.md` files and import into `plan_execution_log`.

**Steps:**
1. Glob for `*.plan.exec.md`
2. Parse entries (typically timestamped sections in markdown)
3. Map to `plan_execution_log` rows with appropriate `entry_type`
4. Link to the parent plan via slug matching

---

## Phase 2: DB Becomes Primary Reader (3 stories)

**Goal:** All agents and commands read plan data from the KB, not from disk.

### PDBM-2010: Extend kb_get_plan to Return Full Content

**What:** Currently `kb_get_plan` returns header columns only. Extend it to join `plan_details` and return `raw_content`, `sections`, `phases`, and `dependencies` in a single call.

Add a `include_content` boolean parameter (default true) so lightweight queries can skip the content.

---

### PDBM-2020: Update Agents and Commands to Read from KB

**What:** Audit and update all agents/commands that currently `Read` plan files from disk.

**Targets:**
- `/plan` skill — read from KB, write to KB
- `/roadmap` skill — already uses `kb_get_roadmap`, verify it's complete
- `/pm-story` and story generation agents — read plan context from KB instead of PLAN.md
- `/pm-bootstrap-workflow` — reads plan files to generate stories; switch to KB
- Any agent that does `Read PLAN.md` or `Read *.plan.meta.md`

---

### PDBM-2030: Wire Up Plan Execution Logging

**What:** All workflow events that currently append to `*.plan.exec.md` should write to `plan_execution_log` instead.

- Story generation → `story_spawned` entry
- Status changes → `status_change` entry
- Phase transitions → `phase_started` / `phase_completed` entries
- Agent decisions → `decision` entries

---

## Phase 3: Filesystem Becomes Read-Only (2 stories)

**Goal:** Plan files on disk are generated artifacts from the DB. All writes go through KB. Safety net period before full removal.

### PDBM-3010: Generate Plan Files from DB

**What:** A `plan_sync` command that regenerates `PLAN.md` files from DB content.

- Reads from `plan_summary_view` + `plan_details`
- Generates clean markdown with consistent format (no more format divergence)
- Includes computed progress info in the generated file
- Runs on-demand or as a post-commit hook
- Generated files include a header comment: `<!-- Auto-generated from KB. Do not edit directly. -->`

---

### PDBM-3020: Block Direct File Edits

**What:** Add guardrails to prevent accidental direct edits to plan files.

- Pre-commit hook that warns if `PLAN.md` files are modified directly
- Agent instructions updated to route through KB tools
- Grace period: warnings only, not hard blocks

---

## Phase 4: Filesystem Removal (3 stories)

**Goal:** Plan files are deleted from the repo. The DB is the sole source of truth for plans.

### PDBM-4010: Delete All Plan Files from Repo

**What:** Remove all `PLAN.md`, `*.plan.meta.md`, `*.plan.exec.md` files.

- Single commit removing all plan files
- Update `.gitignore` if needed to prevent accidental recreation
- Plan content preserved in git history for archaeology

---

### PDBM-4020: Remove File-Based Plan Code

**What:** Strip all code that reads or writes plan files on disk.

- Remove `source_file` / file-path logic from plan MCP tools
- Remove file-reading fallbacks from agents
- Remove `plan_sync` generation command (no longer needed)
- Remove pre-commit hook from PDBM-3020
- Clean up any `featureDir` references that exist solely as file paths (repurpose as logical grouping if still useful)

---

### PDBM-4030: Validation and Cleanup

**What:** Verify the migration is complete and clean.

- Confirm all plans accessible via KB tools
- Confirm no agent or command references plan files
- Confirm `plan_summary_view` returns accurate data for all plans
- Confirm auto-block/unblock triggers work correctly
- Confirm semantic search returns relevant results
- Run `/status-audit` equivalent for plans
- Mark this plan as `implemented`

---

## Dependencies

| This Plan | Depends On | Reason |
|---|---|---|
| `plan-db-migration` | `kb-single-source-of-truth` | KSOT establishes the pattern and fixes story-level KB tooling that plans will follow |

## Risks

1. **Stale DB content during transition** — Mitigated by Phase 1 content_hash reconciliation and Phase 3 read-only period
2. **Agent compatibility** — Agents that hard-code file reads will break. Phase 2 catches these systematically.
3. **Large plan files** — Largest is ~65KB. Postgres TEXT handles this trivially; no risk.
4. **Embedding cost** — ~33 plans is negligible embedding volume.
5. **Materialized view staleness** — Start with regular view; only materialize if performance proves insufficient.
