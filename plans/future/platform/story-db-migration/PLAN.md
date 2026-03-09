# Story DB Migration — Full Lifecycle in Postgres

**Plan Slug:** `story-db-migration`
**Prefix:** `SDBM`
**Type:** migration
**Priority:** P1
**Estimated Stories:** 16
**Status:** accepted
**Tags:** kb, stories, migration, postgres, schema, agents, artifacts
**Depends On:** `kb-single-source-of-truth`, `plan-db-migration`

## Problem Statement

Story content currently lives as markdown files and YAML artifacts on the filesystem. While the KB database has `stories`, `story_details`, `story_artifacts`, and type-specific artifact tables, the **actual story content is authored and read from disk**. This is the same drift problem solved by KSOT (for status) and PDBM (for plans), now applied to story content and artifacts.

### What Lives on Disk Today

| File/Dir | Content | DB Table (exists but underused) |
|---|---|---|
| `WINT-XXXX.md` | Full story prose, ACs, subtasks, YAML frontmatter | `stories` (metadata only), `story_details` (mostly empty) |
| `_pm/STORY-SEED.md` | Original story seed / requirements | No dedicated column |
| `_pm/dev-feasibility.yaml` | Dev feasibility assessment | `story_artifacts` → `artifact_analyses` |
| `_pm/test-plan.yaml` | QA test plan | `story_artifacts` → (no specific table) |
| `_pm/uiux-notes.yaml` | UX review notes | `story_artifacts` → (no specific table) |
| `_implementation/ELAB.yaml` | Elaboration results | `story_artifacts` → `artifact_elaborations` |
| `_implementation/SCOPE.yaml` | Scope analysis | `story_artifacts` → `artifact_scopes` |
| `_implementation/PLAN.yaml` | Implementation plan | `story_artifacts` → `artifact_plans` |
| `_implementation/EVIDENCE.yaml` | AC evidence | `story_artifacts` → `artifact_evidence` |
| `_implementation/CHECKPOINT.yaml` | Phase checkpoint | `story_artifacts` → `artifact_checkpoints` |
| `_implementation/REVIEW.yaml` | Code review results | `story_artifacts` → `artifact_reviews` |
| `_implementation/VERIFICATION.yaml` | QA verification | `story_artifacts` → `artifact_verifications` |
| `DEFERRED-KB-WRITES.yaml` | Failed KB write queue | Should not exist if KB is reliable |
| `stories.index.md` | Story index / status table | Fully derivable from `stories` table |

### Problems

1. **Story content not queryable** — Can't search across stories, find patterns, or aggregate insights
2. **Artifact tables mostly empty** — The type-specific tables exist but agents write YAML files instead
3. **No story revision history** — Story edits overwrite in place, no audit trail of content changes
4. **No semantic search across stories** — Can't ask "find stories related to authentication"
5. **Directory-based status is being eliminated by KSOT** — but content still requires filesystem access
6. **Duplicate data paths** — PM artifacts stored in both frontmatter (`pm_artifacts:`) and `_pm/` files
7. **No story summary view** — Agents must join multiple tables to get a complete picture

---

## Phase 0: Schema Improvements (5 stories)

**Goal:** Upgrade the story schema before ingesting content. Mirror the improvements from PDBM.

### SDBM-0010: Add Story Revision History Table

**What:** Create `story_revision_history` — append-only table tracking every change to story content.

**Schema:**
```sql
CREATE TABLE story_revision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  raw_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  sections JSONB,
  change_reason TEXT,
  changed_by TEXT,          -- agent name or 'human'
  revision_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_revisions_story_id ON story_revision_history(story_id);
CREATE INDEX idx_story_revisions_created ON story_revision_history(created_at);
```

**Trigger:** Auto-insert a revision row whenever `story_details.raw_content` changes (requires adding `raw_content` to `story_details` — see SDBM-0030).

---

### SDBM-0020: Add Story Execution Log Table

**What:** Create `story_execution_log` — structured, queryable log of everything that happens to a story during its lifecycle.

**Schema:**
```sql
CREATE TABLE story_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(story_id),
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'phase_started', 'phase_completed', 'status_changed', 'artifact_created',
    'artifact_updated', 'review_submitted', 'qa_started', 'qa_completed',
    'blocked', 'unblocked', 'iteration_started', 'decision', 'note', 'error',
    'worktree_created', 'worktree_removed', 'pr_created', 'pr_merged'
  )),
  phase TEXT,               -- which phase this entry relates to
  iteration INTEGER,        -- which iteration (for fix cycles)
  message TEXT NOT NULL,
  metadata JSONB,           -- flexible payload (agent name, context, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_exec_log_story_id ON story_execution_log(story_id);
CREATE INDEX idx_story_exec_log_type ON story_execution_log(entry_type);
CREATE INDEX idx_story_exec_log_created ON story_execution_log(created_at);
```

---

### SDBM-0030: Extend Story Tables — New Columns

**What:** Add missing columns to support full content storage.

**New columns on `story_details`:**
- `raw_content` (TEXT) — full story markdown (the contents of `WINT-XXXX.md`)
- `content_hash` (TEXT) — SHA-256 for drift detection
- `sections` (JSONB) — parsed TOC / section breakdown for partial reads
- `format_version` (TEXT) — tracks source format
- `seed_content` (TEXT) — original STORY-SEED.md content (preserved separately from current content)

**New columns on `stories`:**
- `pre_blocked_state` (TEXT) — stashes previous state when auto-blocked, restored on unblock (mirrors PDBM-0030 pattern)

**Auto-block trigger on `story_dependencies`:**
```sql
-- On INSERT/UPDATE of story_dependencies:
-- 1. If any unsatisfied blocking dependency exists, set state = 'blocked',
--    stash current state in pre_blocked_state
-- 2. If ALL dependencies are satisfied AND state = 'blocked',
--    restore state from pre_blocked_state, clear pre_blocked_state
```

---

### SDBM-0040: Create Story Summary View

**What:** A database view that pre-joins common story queries so agents get everything in one call.

```sql
CREATE VIEW story_summary_view AS
SELECT
  s.story_id,
  s.title,
  s.state,
  s.phase,
  s.iteration,
  s.story_type,
  s.priority,
  s.points,
  s.epic,
  s.feature,
  s.blocked,
  s.created_at,
  s.updated_at,

  -- Detail columns
  sd.story_dir,
  sd.touches_backend,
  sd.touches_frontend,
  sd.touches_database,
  sd.touches_infra,
  sd.started_at,
  sd.completed_at,
  sd.blocked_reason,

  -- Artifact counts
  COUNT(DISTINCT sa.id) AS artifact_count,
  COUNT(DISTINCT sa.id) FILTER (
    WHERE sa.artifact_type = 'evidence'
  ) AS evidence_count,
  COUNT(DISTINCT sa.id) FILTER (
    WHERE sa.artifact_type = 'review'
  ) AS review_count,

  -- Dependency info
  ARRAY_AGG(DISTINCT dep.depends_on_story_id) FILTER (
    WHERE dep.relationship_type = 'depends_on'
  ) AS depends_on,
  ARRAY_AGG(DISTINCT dep.story_id) FILTER (
    WHERE dep2.relationship_type = 'depends_on'
  ) AS blocks,

  -- Plan linkage
  ARRAY_AGG(DISTINCT psl.plan_id) AS linked_plan_ids

FROM stories s
LEFT JOIN story_details sd ON sd.story_id = s.story_id
LEFT JOIN story_artifacts sa ON sa.story_id = s.story_id
LEFT JOIN story_dependencies dep ON dep.story_id = s.story_id
LEFT JOIN story_dependencies dep2 ON dep2.depends_on_story_id = s.story_id
LEFT JOIN plan_story_links psl ON psl.story_id = s.story_id
WHERE s.deleted_at IS NULL
GROUP BY s.story_id, s.title, s.state, s.phase, s.iteration, s.story_type,
         s.priority, s.points, s.epic, s.feature, s.blocked, s.created_at, s.updated_at,
         sd.story_dir, sd.touches_backend, sd.touches_frontend, sd.touches_database,
         sd.touches_infra, sd.started_at, sd.completed_at, sd.blocked_reason;
```

**New MCP tool:** `kb_get_story_dashboard` — queries this view with optional filters (state, phase, epic, priority). Returns pre-computed artifact counts, dependency info, and plan linkage.

---

### SDBM-0050: Add Vector Embeddings for Stories

**What:** Enable semantic search across stories.

**Approach:** Add an `embedding` column (vector(1536)) to `stories`, or create a `story_embeddings` table.

**MCP tool:** `kb_search_stories` — takes a natural language query, returns ranked stories by semantic similarity. Complements `kb_search_plans` from PDBM-0050.

**Embedding source:** Concatenation of title + description + acceptance_criteria.

**Refresh strategy:** Re-embed when `story_details.raw_content` changes.

---

## Phase 1: Content Ingestion (3 stories)

**Goal:** Bulk import all existing story files and artifacts into the database.

### SDBM-1010: Build Story Content Ingestion Script

**What:** Migration script that reads every story file from disk and populates the DB.

**Steps:**
1. Glob for `WINT-*.md`, `KSOT-*.md`, etc. across `plans/`
2. Parse each file — extract YAML frontmatter, separate prose body
3. For each story:
   - Update `stories` row with any missing metadata
   - Upsert `story_details` row (raw_content, content_hash, sections, format_version)
   - Read `_pm/STORY-SEED.md` → store in `story_details.seed_content`
   - Populate `plan_story_links` by matching story prefix to plan
4. Generate and store embeddings
5. Report: stories imported, artifacts linked, any conflicts

---

### SDBM-1020: Build Artifact Ingestion Script

**What:** Migration script that reads all `_pm/` and `_implementation/` artifacts and populates the type-specific artifact tables.

**Mapping:**
| Source File | Target Table | Via `story_artifacts` |
|---|---|---|
| `_pm/dev-feasibility.yaml` | `artifact_analyses` | type = 'analysis' |
| `_pm/test-plan.yaml` | (new or JSONB in story_details) | type = 'test_plan' |
| `_pm/uiux-notes.yaml` | (new or JSONB in story_details) | type = 'uiux_review' |
| `_implementation/ELAB.yaml` | `artifact_elaborations` | type = 'elaboration' |
| `_implementation/SCOPE.yaml` | `artifact_scopes` | type = 'scope' |
| `_implementation/PLAN.yaml` | `artifact_plans` | type = 'plan' |
| `_implementation/EVIDENCE.yaml` | `artifact_evidence` | type = 'evidence' |
| `_implementation/CHECKPOINT.yaml` | `artifact_checkpoints` | type = 'checkpoint' |
| `_implementation/REVIEW.yaml` | `artifact_reviews` | type = 'review' |
| `_implementation/VERIFICATION.yaml` | `artifact_verifications` | type = 'verification' |

Parse YAML, extract structured fields into typed columns, store full YAML as a `raw_content` or `metadata` JSONB field for lossless migration.

---

### SDBM-1030: Ingest DEFERRED-KB-WRITES

**What:** Process all existing `DEFERRED-KB-WRITES.yaml` files — apply them to the DB and delete the files.

These are failed KB writes that were queued to disk. Once the DB is reliable and the ingestion is complete, these should be replayed and the pattern eliminated.

---

## Phase 2: DB Becomes Primary Reader (3 stories)

**Goal:** All agents and commands read story content from the KB, not from disk.

### SDBM-2010: Extend Story MCP Tools for Full Content

**What:** Update `kb_get_story` to return full content from `story_details` and linked artifacts from `story_artifacts` + type-specific tables.

- Add `include_content` parameter (default true)
- Add `include_artifacts` parameter (default false) — returns all linked artifact summaries
- Add `kb_get_story_artifacts` tool for fetching specific artifact types

---

### SDBM-2020: Update Agents and Commands to Read from KB

**What:** Audit and update all agents/commands that currently `Read` story files from disk.

**Targets:**
- Dev agents (setup-leader, execute-leader, fix-leader) — read story content from KB
- QA agents (qa-verify-setup, qa-verify-completion) — read evidence/verification from KB
- PM agents (story-generation, story-split, story-followup) — read story seeds from KB
- Review agents (dev-code-review) — read review artifacts from KB
- All leader agents reading `WINT-XXXX.md` directly
- `/story-status`, `/story-move`, `/story-update` commands

---

### SDBM-2030: Wire Up Artifact Writing to DB

**What:** All workflow phases that currently write YAML artifacts to `_implementation/` and `_pm/` should write to the DB instead.

- Elaboration phase → `artifact_elaborations` via `story_artifacts`
- Scope phase → `artifact_scopes`
- Planning phase → `artifact_plans`
- Implementation phase → `artifact_evidence`
- Code review → `artifact_reviews`
- QA verification → `artifact_verifications`
- Checkpoints → `artifact_checkpoints`

Each write should also create a `story_execution_log` entry.

---

## Phase 3: Filesystem Becomes Read-Only (2 stories)

**Goal:** Story files on disk are generated from DB. All writes go through KB.

### SDBM-3010: Generate Story Files from DB

**What:** A `story_sync` command that regenerates story files from DB content.

- Generates `WINT-XXXX.md` with consistent format from `stories` + `story_details`
- Generates artifact files from type-specific tables (for human browsing)
- Generated files include header comment: `<!-- Auto-generated from KB. Do not edit directly. -->`
- Runs on-demand for debugging / human review

---

### SDBM-3020: Block Direct File Edits

**What:** Add guardrails to prevent accidental direct edits to story files.

- Agent instructions updated to route through KB tools
- Warning logs when agents read story files from disk instead of KB
- Grace period: warnings only, not hard blocks

---

## Phase 4: Filesystem Removal (3 stories)

**Goal:** Story files are deleted from the repo. The DB is the sole source of truth for all story content.

### SDBM-4010: Flatten Story Directories

**What:** Eliminate the stage-based directory structure (`backlog/`, `in-progress/`, etc.).

- Status lives in `stories.state` — directories no longer encode it
- If any file artifacts remain, use a flat `stories/<STORY-ID>/` structure
- This completes what KSOT-3010 started

---

### SDBM-4020: Remove File-Based Story Code

**What:** Strip all code that reads or writes story files on disk.

- Remove `story_sync` generation command (no longer needed)
- Remove `stories.index.md` generation/reading code
- Remove `DEFERRED-KB-WRITES.yaml` pattern entirely
- Remove file-reading fallbacks from all agents
- Remove `move_story_to()` filesystem operations
- Clean up `implement-stories.sh` file-based discovery (replaced by KB queries)

---

### SDBM-4030: Validation and Cleanup

**What:** Verify the migration is complete and clean.

- Confirm all stories accessible via KB tools with full content
- Confirm all artifacts queryable from type-specific tables
- Confirm `story_summary_view` returns accurate data
- Confirm auto-block/unblock triggers work correctly
- Confirm semantic search returns relevant results
- Confirm no agent or command references story files
- Run comprehensive pipeline test (story generation → implementation → QA → completion) entirely through KB
- Mark this plan as `implemented`

---

## Dependencies

| This Plan | Depends On | Reason |
|---|---|---|
| `story-db-migration` | `kb-single-source-of-truth` | KSOT fixes story status tracking — must be complete before migrating content |
| `story-db-migration` | `plan-db-migration` | PDBM establishes the pattern (revision history, execution log, summary view, embeddings, auto-block). Stories follow the same blueprint. |

## Risks

1. **Volume** — More stories than plans (~100+ vs ~33). Ingestion script must handle scale and be idempotent.
2. **Artifact format inconsistency** — YAML artifacts may have schema drift across stories. Ingestion needs flexible parsing with validation warnings.
3. **Active stories during migration** — Stories in-progress will have agents writing to disk while we switch to DB. Need a transition strategy (dual-write period).
4. **DEFERRED-KB-WRITES backlog** — Must be cleared before filesystem removal or data is lost.
5. **Agent update scope** — More agents read story files than plan files. Phase 2 is the largest effort.
