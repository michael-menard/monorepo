---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: CDBE-3010

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for this repo. Context derived exclusively from codebase scanning, KB search, and story.yaml data. All findings are codebase-grounded.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| `workflow.story_state_history` table | Deployed (baseline + migration 1010) | Has `id`, `story_id`, `event_type`, `from_state`, `to_state`, `metadata`, `created_at`, `exited_at` (added by 1010), `duration_seconds` (added by 1010). Open row = `exited_at IS NULL`. |
| `workflow.stories` table | Deployed (baseline) | Has `story_id`, `feature`, `state`, `title`, `priority`, `description`, `created_at`, `updated_at`. The `state` column is the current state on the stories row itself. |
| `workflow.story_details` view | Deployed (migration 1000) | Aggregated view joining stories + outcomes + work_state + content_sections + state_history (last 20) + linked_plans + dependencies. Has an INSTEAD OF UPDATE trigger. This is a wide aggregation view — distinct from the narrow "current state" view CDBE-3010 targets. |
| `workflow.v_plan_churn_summary` view | Deployed (migration 999_add_plan_churn_tracking) | Demonstrates the `CREATE OR REPLACE VIEW` + CTE pattern in the workflow schema. |
| `idx_story_state_history_open_rows` partial index | Deployed (migration 1010) | `ON workflow.story_state_history (story_id, created_at DESC) WHERE exited_at IS NULL` — exactly the index required for the LATERAL join in `stories_current`. |
| pgtap harness | Operational | Pattern: `BEGIN; SELECT plan(N); ... SELECT * FROM finish(); ROLLBACK;` |
| `enforce_story_state_history_transition` trigger | Deployed (migration 1010) | BEFORE INSERT trigger ensuring all history rows are validated before insert. |

### Active In-Progress Work

No active in-progress CDBE stories detected from codebase state. The most recent completed CDBE migrations are 1010 (CDBE-1010), 1011 (CDBE-4020), 1012 (CDBE-4030), 1020 (CDBE-1030), and 1050 (CDBE-1050). Migration slots 1013–1019, 1021–1049, and 1051+ are available.

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| CDBE-1010 | Completed | Provides `exited_at` column and `idx_story_state_history_open_rows` — direct dependency for CDBE-3010 |
| CDBE-1060 | Backlog (cascade triggers) | Touches `workflow.story_assignments` and `workflow.story_blockers` — no overlap with `stories_current` view |
| CDBE-2005 | Backlog (allowed_agents) | Touches `workflow.allowed_agents` — no overlap |

### Constraints to Respect

- CDBE-3010 depends on CDBE-1010 (story.yaml `depends_on: [CDBE-1010]`). CDBE-1010 is deployed. Dependency is satisfied.
- The `idx_story_state_history_open_rows` partial index (added by migration 1010) must exist before the view is created — it is the performance foundation for the LATERAL join.
- Migration must be idempotent: `CREATE OR REPLACE VIEW` is the standard DDL form.
- Migration safety preamble required: verify `current_database() = 'knowledgebase'` before executing (established lesson from CDBN-1050).
- RLS is active on `workflow.story_state_history` (migration 1005). The view will run with caller privileges (SECURITY INVOKER semantics are implicit for views). Confirm querying roles (`agent_role`, `lambda_role`, `reporting_role`) have SELECT on `story_state_history` before merging.
- No API endpoints, TypeScript service layer changes, or UI components are in scope for this story.

---

## Retrieved Context

### Related Endpoints

None. This is a pure database migration story (DDL only). No API routes or MCP tool handlers read `stories_current` yet — that is downstream work.

### Related Components

| Component | File | Relevance |
|-----------|------|-----------|
| `workflow.story_details` view | `apps/api/knowledge-base/src/db/migrations/1000_create_story_details_view.sql` | Existing view in the workflow schema. CDBE-3010 adds a narrower sibling view. The LATERAL join pattern used for "latest outcome" in `story_details` is the canonical pattern for the `stories_current` LATERAL join over `story_state_history`. |
| `workflow.v_plan_churn_summary` view | `apps/api/knowledge-base/src/db/migrations/999_add_plan_churn_tracking.sql` | Example of `CREATE OR REPLACE VIEW workflow.xxx AS ...` pattern with CTEs. |
| pgtap test for migration 1010 | `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` | Template for pgtap tests: `BEGIN; SELECT plan(N); INSERT test story; assertions; SELECT * FROM finish(); ROLLBACK;` |
| `idx_story_state_history_open_rows` | `apps/api/knowledge-base/src/db/migrations/1010_story_state_history_trigger.sql` (line 36–38) | Partial index `ON workflow.story_state_history (story_id, created_at DESC) WHERE exited_at IS NULL` — already deployed and ready to support the LATERAL join. |

### Reuse Candidates

| Asset | Location | How |
|-------|----------|-----|
| LATERAL join pattern | `1000_create_story_details_view.sql` lines 117–123 | Copy the `LEFT JOIN LATERAL (SELECT * FROM ... WHERE story_id = s.story_id ORDER BY ... DESC LIMIT 1) x ON true` idiom for the `stories_current` LATERAL over `story_state_history`. |
| `CREATE OR REPLACE VIEW` idiom | `999_add_plan_churn_tracking.sql` line 65 | Exact DDL form to use. Idempotent by nature. |
| pgtap test structure | `pgtap/1010_story_state_history_trigger_test.sql` | File template including test story INSERT + `ON CONFLICT DO NOTHING`. |
| Safety preamble DO block | Established in CDBN-1050 lesson | `DO $$ BEGIN IF current_database() <> 'knowledgebase' THEN RAISE EXCEPTION '...'; END IF; END $$;` |
| COMMENT ON VIEW convention | `1000_create_story_details_view.sql` | Cite migration number in comment text: `'NNNN: ...'`. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LATERAL join for "latest row per foreign key" | `apps/api/knowledge-base/src/db/migrations/1000_create_story_details_view.sql` | Lines 117–123 show `LEFT JOIN LATERAL (SELECT * FROM workflow.story_outcomes o2 WHERE o2.story_id = s.story_id ORDER BY o2.created_at DESC LIMIT 1) o ON true`. This is the exact pattern for joining `story_state_history` to `stories` to get the current open row. |
| `CREATE OR REPLACE VIEW` with COMMENT in workflow schema | `apps/api/knowledge-base/src/db/migrations/999_add_plan_churn_tracking.sql` | Shows `CREATE OR REPLACE VIEW workflow.v_plan_churn_summary AS ...` with CTE. Demonstrates naming convention (`workflow.v_*` for utility views; story uses `workflow.stories_current` without prefix, consistent with `workflow.story_details`). |
| pgtap test file structure for schema assertions | `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` | Full template: `BEGIN; SELECT plan(N); INSERT test story ON CONFLICT DO NOTHING; has_view(); ok() assertions on query results; SELECT * FROM finish(); ROLLBACK;` |

---

## Knowledge Context

### Lessons Learned

- **[CDBN-1050]** Migration safety preambles prevent wrong-database execution (category: architecture)
  - *Applies because*: All knowledgebase migrations (port 5433) should guard against accidental execution against lego_dev (port 5432). Migration for CDBE-3010 must include `DO $$ BEGIN IF current_database() <> 'knowledgebase' THEN RAISE EXCEPTION ... END IF; END $$;` as the first executable statement.

- **[CDBE-1010 elaboration]** Partial index on `story_state_history (story_id, created_at DESC) WHERE exited_at IS NULL` is the correct performance guard for open-row lookups (category: performance)
  - *Applies because*: The `stories_current` view's LATERAL join uses exactly this predicate. The index was added in migration 1010. Risk note in story.yaml says "confirm index exists" — it does exist (`idx_story_state_history_open_rows`). This is a resolved concern, not a blocker.

- **[CDBE-1006 elaboration]** RLS policies on `workflow.story_state_history` are SELECT-scoped only; write protection is GRANT-level (category: architecture)
  - *Applies because*: The view will SELECT from `story_state_history`. Caller roles (`agent_role`, `lambda_role`, `reporting_role`) have SELECT granted (migration 1005). No additional RLS grants are needed for read-only view access.

### Blockers to Avoid (from past stories)

- Do not use `CREATE VIEW` without `OR REPLACE` — migrations must be idempotent.
- Do not rely on `stories.state` column alone for the "current state" in the view — the story's description specifically wants the state from `story_state_history` (i.e., the `to_state` of the latest open row), not `stories.state` directly. These should be consistent but the view's value proposition is exposing the history-backed `current_state` alongside `entered_at`.
- Do not skip the pgtap test file — pattern established across all CDBE migrations. pgtap is the only test type for pure DDL stories.
- Do not add API handler or TypeScript changes to this story's scope.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | Migration safety preamble | All knowledgebase migrations must include `current_database()` guard (established lesson, not formal ADR) |
| N/A | Workflow schema RLS model | RLS on workflow tables is SELECT-scoped (USING clause). No WITH CHECK. Write protection is GRANT-only. Views inherit caller's RLS context (SECURITY INVOKER default). |

ADR-LOG.md does not exist at `plans/stories/ADR-LOG.md`. No formal ADRs loaded.

### Patterns to Follow

- `CREATE OR REPLACE VIEW workflow.stories_current AS ...` (idempotent, no DROP needed)
- `LEFT JOIN LATERAL (...) h ON true` with `WHERE story_id = s.story_id AND exited_at IS NULL ORDER BY created_at DESC LIMIT 1` for the open-row join
- `COMMENT ON VIEW workflow.stories_current IS '3010: ...'` citing the migration number
- `COMMENT ON COLUMN workflow.stories_current.current_state IS '3010: ...'` and similarly for `entered_at`
- Safety preamble DO block as the first statement
- pgtap test file with `has_view()`, `ok(EXISTS(SELECT 1 FROM workflow.stories_current ...))` for stories with and without history rows

### Patterns to Avoid

- Do not add an INSTEAD OF UPDATE trigger to `stories_current` — this is a read-only view; writes should go to underlying tables directly
- Do not add RLS directly to the view — the view inherits caller privileges from the underlying tables
- Do not use `CREATE VIEW` (without `OR REPLACE`) — breaks idempotency
- Do not hardcode state values in the view definition — the view should expose whatever `to_state` value is in the open history row

---

## Conflict Analysis

### Conflict: Potential migration slot collision
- **Severity**: warning (non-blocking)
- **Description**: Migration slots 1013–1019 and 1021–1049 appear open based on file listing. However, there is a dual-1011 naming collision already present in the codebase (`1011_cdbe4020_embedding_columns_knowledge_tables.sql` and `1011_cdbn2024_cleanup_public_stories.sql`). The implementer must select a unique, unoccupied slot number for CDBE-3010's migration. Suggested: `1030_cdbe3010_stories_current_view.sql` (slot 1030 not yet used). Verify with `ls apps/api/knowledge-base/src/db/migrations/` at implementation time.
- **Resolution Hint**: Use slot `1030` as the target. If taken, use `1031`. Do not reuse any existing slot.

---

## Story Seed

### Title

`stories_current` View — Single Query Target for Current Story State

### Description

**Context**: The `workflow.story_state_history` table (migration 1010, CDBE-1010 complete) stores state transitions with `exited_at` tracking. An open row (`exited_at IS NULL`) represents the story's current state. The `idx_story_state_history_open_rows` partial index (`story_id, created_at DESC WHERE exited_at IS NULL`) is already deployed and supports efficient open-row lookup. The existing `workflow.story_details` view joins `story_state_history` as an aggregated JSONB array (last 20 rows) but does not expose a flat `current_state` / `entered_at` scalar. Agents and application code that need only the current state must write their own LATERAL join boilerplate.

**Problem**: Every query that needs a story's current state with its `entered_at` timestamp must duplicate the same LATERAL join pattern against `story_state_history`. This is fragile, verbose, and not DRY. When the open-row logic changes, every call site must be updated independently.

**Solution**: Create `workflow.stories_current` as a `CREATE OR REPLACE VIEW` that joins all rows from `workflow.stories` to the single latest open row in `workflow.story_state_history` (via `LEFT JOIN LATERAL ... WHERE exited_at IS NULL ORDER BY created_at DESC LIMIT 1 ON true`). The view exposes all `workflow.stories` columns plus `current_state` (= `h.to_state`) and `entered_at` (= `h.created_at`). Stories with no history row return `NULL` for both new columns. The view is a single query target — no more join boilerplate.

### Initial Acceptance Criteria

- [ ] AC-1: Migration creates `workflow.stories_current` as a SQL view using `CREATE OR REPLACE VIEW workflow.stories_current AS ...` (idempotent; no DROP required).
- [ ] AC-2: The view selects all columns from `workflow.stories` (via `s.*` or explicit column list — explicit preferred to avoid surprises on schema changes).
- [ ] AC-3: The view exposes a `current_state` column sourced from `h.to_state` of the latest open `story_state_history` row (`exited_at IS NULL`), joined via `LEFT JOIN LATERAL (SELECT to_state, created_at FROM workflow.story_state_history WHERE story_id = s.story_id AND exited_at IS NULL ORDER BY created_at DESC LIMIT 1) h ON true`.
- [ ] AC-4: The view exposes an `entered_at` column sourced from `h.created_at` of the same LATERAL subquery, representing when the story entered the current state.
- [ ] AC-5: Stories with no history row in `story_state_history` return `NULL` for both `current_state` and `entered_at` (LEFT JOIN semantics guarantee this).
- [ ] AC-6: `COMMENT ON VIEW workflow.stories_current` is included, citing migration number and describing the view's purpose.
- [ ] AC-7: `COMMENT ON COLUMN workflow.stories_current.current_state` and `COMMENT ON COLUMN workflow.stories_current.entered_at` are included with migration-number-prefixed text.
- [ ] AC-8: Migration includes a safety preamble DO block verifying `current_database() = 'knowledgebase'` and raising an exception if not.
- [ ] AC-9: A pgtap test file is written at `apps/api/knowledge-base/src/db/migrations/pgtap/1030_cdbe3010_stories_current_view_test.sql` (adjust filename to match migration slot) following the `BEGIN; SELECT plan(N); ... SELECT * FROM finish(); ROLLBACK;` pattern, covering:
  - `has_view('workflow', 'stories_current', ...)` — view existence assertion
  - A story with a history row: `current_state` matches `to_state` of the open row, `entered_at` matches `created_at` of that row
  - A story with no history row: `current_state IS NULL` and `entered_at IS NULL`
  - A story with multiple history rows (one closed, one open): only the open row's values are returned
- [ ] AC-10: Migration is idempotent — second run exits 0 with no errors.
- [ ] AC-11: The LATERAL join leverages `idx_story_state_history_open_rows` (partial index on `story_id, created_at DESC WHERE exited_at IS NULL`) — confirmed already deployed by migration 1010. No new index creation required unless profiling indicates need.
- [ ] AC-12: No API routes, MCP tool handlers, TypeScript service files, or UI components are created or modified as part of this story.

### Non-Goals

- Do not add an INSTEAD OF UPDATE trigger to `stories_current` — the view is read-only.
- Do not add RLS policies directly to the view — caller privileges are inherited from underlying tables.
- Do not modify `workflow.story_details` (migration 1000) — it remains the wide aggregation view; `stories_current` is the narrow scalar view.
- Do not add a `current_state` column to `workflow.stories` itself — the view is the correct abstraction.
- Do not expose `from_state` in the view — `current_state` + `entered_at` is sufficient; the full history is available via `workflow.story_details` or direct query.
- Do not create any MCP tool, API handler, or TypeScript service as part of this story.
- Do not create indexes beyond what already exists — the partial index from migration 1010 is sufficient.

### Reuse Plan

- **Components**: `workflow.story_details` view (LATERAL join pattern at lines 117–123 of `1000_create_story_details_view.sql`)
- **Patterns**: `CREATE OR REPLACE VIEW`, `LEFT JOIN LATERAL ... ON true`, `COMMENT ON VIEW/COLUMN` with migration number prefix, safety preamble DO block, pgtap `BEGIN/plan/finish/ROLLBACK` structure
- **Packages**: None — pure SQL migration story

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a pure DDL story. The only test surface is pgtap SQL — no Vitest, no Playwright, no React Testing Library.
- pgtap test must cover three scenarios: (1) story with one history row → current_state populated, (2) story with no history row → current_state NULL, (3) story with closed + open rows → only the open row's state is returned.
- Test setup must INSERT a test story into `workflow.stories` (ON CONFLICT DO NOTHING) before inserting `story_state_history` rows. The FK constraint `story_state_history_story_id_fkey` references `workflow.stories(story_id)`.
- Tests run as `kbuser` (BYPASSRLS) per established pgtap harness pattern. No RLS complications for test fixtures.
- Idempotency test: verify second migration run exits 0 — `CREATE OR REPLACE VIEW` handles this automatically, but confirm no other DDL in the migration is non-idempotent.

### For UI/UX Advisor

- No UI/UX surface exists for this story. It is a database DDL migration only.
- The view is consumed by agents and application code, not directly by user-facing pages.

### For Dev Feasibility

- **Migration slot**: Verify `ls apps/api/knowledge-base/src/db/migrations/` to confirm slot 1030 is free. If taken, use the next available consecutive slot. Do not use a slot already occupied.
- **View definition skeleton** (for reference, not prescriptive):
  ```sql
  CREATE OR REPLACE VIEW workflow.stories_current AS
  SELECT
    s.story_id,
    s.feature,
    s.state,
    s.title,
    s.priority,
    s.description,
    s.tags,
    s.experiment_variant,
    s.blocked_reason,
    s.blocked_by_story,
    s.started_at,
    s.completed_at,
    s.file_hash,
    s.created_at,
    s.updated_at,
    h.to_state  AS current_state,
    h.created_at AS entered_at
  FROM workflow.stories s
  LEFT JOIN LATERAL (
    SELECT to_state, created_at
    FROM workflow.story_state_history
    WHERE story_id = s.story_id
      AND exited_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) h ON true;
  ```
- **Canonical reference for LATERAL pattern**: `apps/api/knowledge-base/src/db/migrations/1000_create_story_details_view.sql` lines 117–123.
- **Index already exists**: `idx_story_state_history_open_rows` (migration 1010). Confirm with `\d workflow.story_state_history` at implementation time.
- **Column exposure**: The `workflow.stories` table in the baseline has: `story_id`, `feature`, `state`, `title`, `priority`, `description`, `created_at`, `updated_at`. The Drizzle schema may have additional columns from later migrations — use explicit column list in the view rather than `s.*` to avoid surprising consumers if the underlying table grows new columns.
- **Dependency chain**: CDBE-1010 must be deployed (it is). Migration 1010 added `exited_at`, `duration_seconds`, and the partial index. All prerequisites are in place.
- **pgtap canonical reference**: `apps/api/knowledge-base/src/db/migrations/pgtap/1010_story_state_history_trigger_test.sql` — copy file structure verbatim.
