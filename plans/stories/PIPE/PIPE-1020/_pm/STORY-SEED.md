---
generated: "2026-03-19"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: PIPE-1020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists at any `plans/baselines/` path. Context derived entirely from KB queries and codebase scanning.

### Relevant Existing Features

| Feature | Description | Relevance |
|---------|-------------|-----------|
| `plan_story_links` table | DB table in `workflow` schema with `plan_slug`, `story_id`, `link_type`, `sort_order` | The exact table PIPE-1020 must populate |
| `kb_create_story` with `plan_slug` | Creates a `spawned_from` link in `plan_story_links` on story upsert | Existing mechanism for linking; PIPE-1020 links retroactively (stories already exist) |
| `migrate-plans-to-kb.ts` script | Bulk-imports plan story links from markdown docs using `link_type = 'mentioned'` | Pattern reference for bulk INSERT with `ON CONFLICT DO NOTHING` |
| PIPE-1030 (ORCH story linking) | Prior chore that linked ORCH stories to `autonomous-pipeline-test-plan` — same KB-only data management pattern | Closest structural pattern for PIPE-1020 |
| PIPE-1010 (APIP bulk import) | Imports 40+ APIP stories from worktree into KB — PIPE-1020 depends on this completing first | Direct dependency |

### Active In-Progress Work

| Story | Title | State | Overlap Risk |
|-------|-------|-------|-------------|
| PIPE-1010 | Bulk Import APIP Stories from Worktree to KB | backlog | **Direct blocker** — APIP stories must exist in KB before PIPE-1020 can link them |
| PIPE-0020 | Ghost State Data Migration | backlog | Upstream of PIPE-1010; no direct overlap with PIPE-1020 |
| PIPE-0030 | Story Constraint Inheritance | backlog | Independent; no overlap |

### Constraints to Respect

- `plan_story_links` has a unique constraint on `(plan_slug, story_id)` — all inserts must use `ON CONFLICT DO NOTHING` for idempotency.
- `link_type` has no check constraint in schema (text field); established values are `'spawned_from'` (used by `kb_create_story`) and `'mentioned'` (used by migrate script). PIPE-1020 should use `'spawned_from'` since APIP stories were generated as part of the autonomous-pipeline plan.
- PIPE-1020 is blocked on PIPE-1010: APIP stories must be imported to KB before they can be linked. If APIP stories don't exist in KB, `INSERT INTO plan_story_links` will fail the `story_id` foreign key constraint.
- Ghost states must not be used in any KB tool calls — canonical states only per PIPE-0010.
- No filesystem story directories should be created. This is a KB-only data chore.

---

## Retrieved Context

### Related Endpoints

None — PIPE-1020 is a KB data management chore with no HTTP endpoints.

### Related Components

None — no UI or React components involved.

### Reuse Candidates

| Candidate | Location | How Used |
|-----------|----------|----------|
| `planStoryLinks` Drizzle table | `apps/api/knowledge-base/src/db/schema/workflow.ts` | Schema reference for understanding the table structure |
| `migrate-plans-to-kb.ts` bulk insert pattern | `apps/api/knowledge-base/src/scripts/migrate-plans-to-kb.ts:419-426` | `INSERT INTO plan_story_links ... ON CONFLICT DO NOTHING` pattern to follow |
| `kb_create_story` with `plan_slug` | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts:972-981` | Shows how `spawned_from` links are created; PIPE-1020 does this retroactively for all APIP stories |
| PIPE-1030 story structure | `plans/stories/PIPE/PIPE-1030/PIPE-1030.md` | Structural template for KB-only data chore stories (verify + link + advance) |

### Similar Stories

| Story | Similarity | Key Difference |
|-------|-----------|----------------|
| PIPE-1030 | Linked ORCH stories to `autonomous-pipeline-test-plan` — same linking pattern | PIPE-1030 also required elaboration of stories; PIPE-1020 only needs linking |
| PIPE-1010 | Bulk import APIP stories to KB | Import vs link — PIPE-1010 creates story rows; PIPE-1020 creates plan link rows |

---

## Canonical References

This story is a KB data-linking chore — no new implementation code is written. References are for context only.

| Pattern | File | Why |
|---------|------|-----|
| `plan_story_links` schema | `apps/api/knowledge-base/src/db/schema/workflow.ts` | Shows table columns: `plan_slug`, `story_id`, `link_type`, `sort_order`, `created_at` |
| Bulk link insert pattern | `apps/api/knowledge-base/src/scripts/migrate-plans-to-kb.ts` | Lines 419-426: `INSERT INTO plan_story_links ON CONFLICT DO NOTHING` — idempotent link creation |
| `spawned_from` link creation | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Lines 972-981: shows how `kb_create_story` creates `spawned_from` links — same link type PIPE-1020 should use |

---

## Knowledge Context

### Lessons Learned

- **[CDBN-0010, elab]** KB-vs-seed drift detection gap. CDTS-3030 anomaly: a story present in KB but absent from the plan's story links. (*Applies because*: PIPE-1020 is the corrective action for exactly this pattern — `autonomous-pipeline` plan has 43 stories in KB but 0 `plan_story_links` rows. The gap is confirmed.)

- **[PIPE-1030 pattern]** Data management stories should verify current state before writing, then advance idempotently. (*Applies because*: PIPE-1020 should verify which APIP stories already have a `plan_story_links` row for `autonomous-pipeline` before inserting — avoids duplicate-insert errors.)

### Blockers to Avoid

- Attempting to insert `plan_story_links` rows before PIPE-1010 completes. The `story_id` foreign key will reject inserts for any APIP story not yet in the `stories` table.
- Using `ON CONFLICT DO UPDATE` instead of `ON CONFLICT DO NOTHING` — the existing `link_type` should not be overwritten if a row already exists.
- Including cancelled stories (APIP-1030) in the link set without deliberate decision — executor should decide whether cancelled stories should still be plan-linked.

### Architecture Decisions (ADRs)

No active ADR-LOG.md found in this repository. No ADR constraints identified that apply to a pure KB data chore.

| Constraint | Source | Note |
|-----------|--------|------|
| KB is the only story source of truth | MEMORY.md + user preference | Do not create filesystem directories or YAML files |
| Canonical state enum only | PIPE-0010 (completed) | No ghost states in any KB tool calls |

### Patterns to Follow

- Read current state from KB before writing (verify which APIP stories exist, which are already linked).
- Insert all links with `ON CONFLICT (plan_slug, story_id) DO NOTHING` for idempotency.
- Use `link_type = 'spawned_from'` since APIP stories were generated as part of the autonomous-pipeline plan's lifecycle.
- Report exact counts: stories found, rows already linked (skipped), rows newly linked.

### Patterns to Avoid

- Creating filesystem artifacts (no story.yaml files, no WORK-ORDER.md, no stories/ directories).
- Setting story state — PIPE-1020 only inserts `plan_story_links` rows; it does NOT change any story's `state`.
- Using `kb_create_story` with `plan_slug` for the bulk link — that tool is for single-story upserts; for 43 stories, direct SQL or a script is more appropriate. The `kb_create_story` approach would require 43 individual MCP calls.

---

## Conflict Analysis

### Conflict: Dependency Not Yet Satisfied
- **Severity**: warning (not blocking seed generation; is blocking execution)
- **Description**: PIPE-1020 depends on PIPE-1010 (Bulk Import APIP Stories). PIPE-1010 is currently in `backlog` state with no artifacts. Until PIPE-1010 completes, the APIP stories may not exist in the `stories` table, making `plan_story_links` foreign key inserts impossible. Additionally, PIPE-1010 itself depends on PIPE-0020 (Ghost State Data Migration), which is also `backlog`.
- **Resolution Hint**: Do not execute PIPE-1020 until PIPE-1010 is `completed` and `kb_list_stories(feature: 'platform', plan_slug: 'autonomous-pipeline')` returns the full expected APIP story set.

---

## Story Seed

### Title

Link APIP Stories to autonomous-pipeline Plan

### Description

**Context**: The `autonomous-pipeline` plan exists in the KB with `status: implemented` and `storyPrefix: APIP`. A `kb_list_stories(plan_slug: 'autonomous-pipeline')` query returns 43 linked stories. However, this data is from `plan_story_links` — the story originally described 0 linked stories, which suggests an earlier state. As of 2026-03-19, 43 APIP stories are confirmed in the KB linked to `autonomous-pipeline`.

**Verification required at execution time**: Run `kb_list_stories(plan_slug: 'autonomous-pipeline', limit: 100)` and compare the returned story IDs against all APIP stories in KB. The count may already reflect a complete linkage, in which case this story is a verification-only pass. If gaps are found (stories present in KB under APIP prefix but absent from `plan_story_links`), insert the missing rows.

**Problem**: If any APIP stories were bulk-imported by PIPE-1010 without a `plan_slug` parameter (which creates a `spawned_from` link automatically), those stories will exist in the KB but have no `plan_story_links` row connecting them to `autonomous-pipeline`. The plan's story count will be artificially low and schedulers that query `kb_list_stories(plan_slug: 'autonomous-pipeline')` will miss those stories.

**Proposed solution**: After PIPE-1010 completes, enumerate all stories in KB with APIP-prefixed IDs, compare against `plan_story_links` for `autonomous-pipeline`, and insert any missing rows with `link_type = 'spawned_from'` and `ON CONFLICT DO NOTHING`.

### Initial Acceptance Criteria

- [ ] **AC-1**: A pre-execution audit runs `kb_list_stories(plan_slug: 'autonomous-pipeline', limit: 100)` and determines: (a) count of APIP stories currently linked, (b) total APIP stories in KB (from `kb_list_stories(feature: 'platform')` + `kb_list_stories(feature: 'autonomous-pipeline')`), (c) gap count.
- [ ] **AC-2**: If gap count > 0: all missing `plan_story_links` rows are inserted with `plan_slug = 'autonomous-pipeline'` and `link_type = 'spawned_from'`, using `ON CONFLICT (plan_slug, story_id) DO NOTHING`.
- [ ] **AC-3**: If gap count = 0: story completes as a verification-only pass with no writes. The seed documents this as an idempotency success path.
- [ ] **AC-4**: Post-execution: `kb_list_stories(plan_slug: 'autonomous-pipeline', limit: 100)` returns the same count as total APIP stories in KB. The plan has no orphaned (unlinked) APIP stories.
- [ ] **AC-5**: No story `state` fields are modified — this chore only inserts `plan_story_links` rows.
- [ ] **AC-6**: No filesystem story directories, story.yaml files, or worktrees are created. All operations are KB-only.
- [ ] **AC-7**: The decision on cancelled stories (APIP-1030 is `cancelled`) is explicitly documented: either include it in the plan link set (it was part of the plan's history) or exclude it with justification. Default recommendation: include it — plan links record participation, not just active stories.
- [ ] **AC-8**: Execution produces a written count report: `apip_stories_in_kb`, `already_linked`, `newly_linked`, `gap_resolved`.

### Non-Goals

- Do NOT change any story's `state` — this is a data linking chore only.
- Do NOT create filesystem artifacts (no story.yaml files, no WORK-ORDER.md, no stories/ directories).
- Do NOT run before PIPE-1010 is `completed` — the APIP stories must exist in KB first.
- Do NOT modify the `autonomous-pipeline` plan's status or metadata — it is already `implemented`.
- Do NOT elaborate or modify any APIP story content — only the `plan_story_links` join table is touched.
- Do NOT create a new migration file — `plan_story_links` inserts are done via KB MCP tools or the existing migration script pattern, not a numbered migration.

### Reuse Plan

- **Components**: None (KB data chore)
- **Patterns**: `ON CONFLICT (plan_slug, story_id) DO NOTHING` idempotency pattern from `migrate-plans-to-kb.ts`; PIPE-1030 structural template for verify-then-link KB chores
- **Packages**: KB MCP tools only (`kb_list_stories`, `kb_create_story` with `plan_slug` for individual links if count is small, or direct SQL via migration script pattern for bulk)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story has no executable code. Verification is purely KB state queries. The test plan should define:
- Pre-condition check: PIPE-1010 completed and APIP story count in KB matches expected.
- Idempotency check: run the linking operation twice; second run produces 0 new rows.
- Gap check: `kb_list_stories(plan_slug: 'autonomous-pipeline')` count equals total APIP story count in KB.
- No pgtap tests needed — KB MCP queries are sufficient.

**Important**: As of 2026-03-19, `kb_list_stories(plan_slug: 'autonomous-pipeline', limit: 100)` already returns 43 stories. The executor should verify whether this count is already complete (all APIP stories linked) or partial. If already complete, AC-3 (idempotency pass) applies and the story may be closeable with verification only.

### For UI/UX Advisor

Not applicable — this story has no UI component.

### For Dev Feasibility

**Key feasibility question**: Is `kb_create_story(story_id, plan_slug)` viable for 43 stories, or should a direct SQL/script approach be used?

- **MCP approach**: 43 individual `kb_create_story` calls each with `plan_slug: 'autonomous-pipeline'` — triggers `spawned_from` link insert per call. Viable but slow; each is a network round-trip to the MCP server.
- **Script approach**: Extend `migrate-plans-to-kb.ts` pattern with a one-off script that bulk-inserts all missing APIP story IDs into `plan_story_links`. More efficient. Use `link_type = 'spawned_from'` to match what `kb_create_story` would produce.
- **Recommendation**: Given 43 stories, the script approach is preferred. The executor should verify current linked count first — if count is already 43, no writes are needed at all.

**Canonical references for subtask decomposition**:
- `apps/api/knowledge-base/src/scripts/migrate-plans-to-kb.ts` lines 419-426: bulk `plan_story_links` insert pattern
- `apps/api/knowledge-base/src/db/schema/workflow.ts`: `planStoryLinks` table definition (columns, constraints)
- PIPE-1030 story structure for KB-only chore subtask pattern (verify → link → report)
