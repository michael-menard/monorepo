---
generated: "2026-02-20"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1050

## Reality Context

### Baseline Status
- Loaded: no (no baseline reality files exist — `baseline_path: null`)
- Gaps: No formal baseline available. Post-baseline reality is established via direct inspection of story files, proof documents in `wint/UAT/`, and source code on disk. The following post-baseline facts are confirmed:
  - WINT-1011 (Compatibility Shim — Core Functions): UAT, QA PASS 2026-02-17
  - WINT-1012 (Compatibility Shim — Observability + ShimDiagnostics): UAT, QA PASS 2026-02-17
  - WINT-1030 (Populate Story Status from Directories): UAT, QA PASS 2026-02-16
  - WINT-1040 (story-status → DB): elaboration (in-progress dependency — does not block WINT-1050)
  - WINT-1060 (story-move → DB): ready-to-work (sibling story — parallel-workable)
  - `/story-update` command: v2.1.0, active at `.claude/commands/story-update.md`
  - `shimUpdateStoryStatus`: UAT-verified, DB-only write, null return on DB failure, no FS fallback (AC-2 of WINT-1011)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `/story-update` command v2.1.0 | `.claude/commands/story-update.md` | Active | Direct target of this story — primary deliverable is a v3.0.0 update of this file |
| `shimUpdateStoryStatus` | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | UAT PASS (WINT-1011) | The DB write function to be called before YAML frontmatter update |
| `shimGetStoryStatus` | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | UAT PASS (WINT-1011) | Available for story locate step DB-first lookup (ST-1 reads this as baseline) |
| `SWIM_LANE_TO_STATE` | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | Active | Authoritative NEW_STATUS → DB state mapping; 14 story statuses to evaluate |
| `StoryUpdateStatusInput` | `packages/backend/mcp-tools/src/story-management/__types__/index.ts` | Active | Zod schema for shimUpdateStoryStatus call: `{ storyId, newState, reason?, triggeredBy, metadata? }` |
| `StoryUpdateStatusOutput` | `packages/backend/mcp-tools/src/story-management/__types__/index.ts` | Active | Return type — nullable; null signals DB unavailable |
| Worktree cleanup (Step 2) | `.claude/commands/story-update.md` (Step 2) | Active | WINT-1150 integration — must execute BEFORE DB write per AC-5 |
| `worktree_get_by_story` MCP tool | `packages/backend/mcp-tools/src/worktree-management/` | Active (WINT-1130 UAT) | Called in existing Step 2 worktree cleanup |
| `worktree_mark_complete` MCP tool | `packages/backend/mcp-tools/src/worktree-management/` | Active (WINT-1130 UAT) | Called in existing Step 2 worktree cleanup |
| `core.stories` table | `packages/backend/database-schema/src/schema/unified-wint.ts` | Active (WINT-1030 UAT) | Target of DB writes via shimUpdateStoryStatus |
| Status transition rules | `.claude/commands/story-update.md` (Status Transition Rules section) | Active | Transition validation applies BEFORE DB write per AC-6 |
| `stories.index.md` | `wint/stories.index.md` | Active (WINT-1070 pending) | Step 4 (index update) still operates; --no-index flag only affects Step 4 per AC-7 |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-1040 (story-status → DB) | elaboration | Sibling read-only command; different file; no overlap |
| WINT-1060 (story-move → DB) | ready-to-work | Sibling write command; coordinates on `--update-status` flag path (WINT-1060 defers DB write to /story-update when flag provided) — WINT-1050's DB write implementation is what WINT-1060 delegates to |
| WINT-1070 (Deprecate stories.index.md) | failed-code-review | Risk Note from index: "may land in-progress; non-blocking (index update retained)" — Step 4 index update stays in WINT-1050 regardless |
| WINT-1120 (Validate Foundation Phase) | pending | Downstream gate — AC-6 of WINT-1120 explicitly validates db_updated: true in /story-update result YAML |
| WINT-9020 (doc-sync LangGraph Node) | needs-code-review | Different area; no overlap |

### Constraints to Respect

- `shimUpdateStoryStatus` AC-2 constraint (WINT-1011): **no filesystem fallback on DB write failure**. If shimUpdateStoryStatus returns null, log WARNING and proceed with FS frontmatter update only — do NOT attempt a compensating FS write to "simulate" the DB write.
- The worktree cleanup (Step 2) order must be preserved: Step 2 BEFORE DB write BEFORE frontmatter update. AC-5 is explicit.
- Transition validation must occur BEFORE DB write (AC-6). Invalid transitions must abort without writing to DB.
- The `--no-index` flag only suppresses Step 4 (index update). DB write in the new Step 3a must still execute even when `--no-index` is present (AC-7).
- Story locate step (Step 1) must continue to work via directory scan — the command is `docs-only` permission and cannot add TypeScript; calls go through MCP tools.
- `stories.index.md` index update (Step 4) is preserved for Phase 1 backward compatibility even though WINT-1070 will eventually deprecate it.
- Version bump to v3.0.0 is **mandatory** (AC-8) — this is a major version because DB integration is a breaking behavioral change for agents consuming command output.
- The 14 story statuses in the command's valid status table must each receive an explicit mapping decision (DB-mapped or skip-with-reason) per AC-2 and AC-10.

---

## Retrieved Context

### Related Endpoints

None — `/story-update` is a Claude Code command (markdown document), not an HTTP endpoint.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| story-update command | `.claude/commands/story-update.md` | Primary deliverable — v2.1.0 → v3.0.0 |
| shimUpdateStoryStatus | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | DB write function to be called in new Step 3a |
| shimGetStoryStatus | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Available for ST-1 baseline read; same module |
| SWIM_LANE_TO_STATE | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | Authoritative directory-status → DB-state mapping; used to derive NEW_STATUS → DB state table in AC-2 |
| StoryUpdateStatusInput/Output | `packages/backend/mcp-tools/src/story-management/__types__/index.ts` | Input schema: `{ storyId, newState, reason?, triggeredBy, metadata? }`; Output: nullable record |
| story-move command | `.claude/commands/story-move.md` | Sibling command (WINT-1060); its `--update-status` flag delegates to /story-update — this story is what makes that delegation DB-aware |
| mcp-tools index exports | `packages/backend/mcp-tools/src/index.ts` | shimUpdateStoryStatus is exported (AC-8 of WINT-1011); callable by executing agent |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `shimUpdateStoryStatus` | Call with `{ storyId: STORY_ID, newState: MAPPED_DB_STATE, triggeredBy: 'story-update-command' }` in new Step 3a |
| `SWIM_LANE_TO_STATE` | Derive the 14-status mapping table inline in the command; this is the authoritative source for mapped statuses |
| Worktree cleanup pattern (Step 2) | Already in v2.1.0 — preserve as-is; new Step 3a inserts after Step 2 |
| Transition validation table | Already in v2.1.0 — preserve as-is; validation fires before new Step 3a |
| Result YAML block (Step 5) | Extend existing YAML structure with `db_updated: true | false` field |
| WINT-1060 DB write step pattern | `.claude/commands/story-move.md` Step 2.5 (WINT-1060) uses the same shimUpdateStoryStatus + SWIM_LANE_TO_STATE inline table pattern; WINT-1050 follows the same approach |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| DB write hook in existing command | `.claude/commands/story-update.md` | The file being modified — understand existing Step 2 (worktree cleanup) structure before adding Step 3a (DB write) |
| shimUpdateStoryStatus implementation | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Exact behavioral contract: DB-only, null on failure, no FS fallback; shows input/output types |
| SWIM_LANE_TO_STATE (authoritative mapping) | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | The 6 mapped DB states; the remaining 8 statuses from the command's 14-status table must be explicitly handled as unmapped |
| StoryUpdateStatusInput schema | `packages/backend/mcp-tools/src/story-management/__types__/index.ts` | `storyId`, `newState`, optional `reason`, `triggeredBy` default `'agent'`, optional `metadata` |
| Sibling command DB integration (parallel reference) | `.claude/commands/story-move.md` (v2.1.0 → 2.1.0, WINT-1060 in-progress) | Same pattern: inline SWIM_LANE_TO_STATE table, shimUpdateStoryStatus call, null → warning + FS-only, db_updated in result YAML |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1011]** `shimUpdateStoryStatus` is DB-only: returns null on DB unavailability, never falls back to filesystem. The command must treat null as "DB unavailable" and log a WARNING before proceeding with FS-only path. (category: constraint)
- **[WINT-1011]** The shim exports are available from `packages/backend/mcp-tools/src/index.ts` as named exports. The executing agent invokes shimUpdateStoryStatus via MCP tool call, not direct TypeScript import (command file is docs-only). (category: pattern)
- **[WINT-1030]** DB state enum values use underscore format (`ready_to_work`, `in_progress`, `ready_for_qa`, `in_qa`) not hyphen format. The mapping table must convert explicitly. (category: blocker-to-avoid)
- **[WINT-1040]** `SWIM_LANE_TO_STATE` maps exactly 6 directory statuses to DB states. The remaining 8 command statuses have no DB state equivalent and must receive explicit skip decisions. (category: constraint)
- **[WINT-1150]** The ordering constraint: Step 1 (locate) → Step 2 (worktree cleanup) → Step 3a (DB write) → Step 3b (frontmatter update) → Step 4 (index update). (category: pattern)
- **[WINT-1060]** WINT-1060 uses an inline SWIM_LANE_TO_STATE lookup table in the command markdown. WINT-1050 should follow the same pattern for the NEW_STATUS → newState table (AC-2). (category: pattern)

### Blockers to Avoid

- Do NOT attempt a filesystem compensating write when shimUpdateStoryStatus returns null
- Do NOT place the DB write (Step 3a) BEFORE transition validation
- Do NOT place the DB write (Step 3a) BEFORE worktree cleanup (Step 2)
- Do NOT suppress the DB write when `--no-index` is provided
- Do NOT version bump to v2.2.0 — must be v3.0.0
- Do NOT include DB write for unmapped statuses

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration/UAT verification for WINT-1050 must use real PostgreSQL, not mocked DB. |

---

## Conflict Analysis

### Conflict: WINT-1070 (index deprecation) may land in-progress — Warning Only

- **Severity**: warning (non-blocking per story Risk Notes)
- **Resolution**: Step 4 (index update) is preserved unchanged in WINT-1050. No scope adjustment needed.

---

## Story Seed

### Title

Update `/story-update` Command to Write Status to Database (DB-First with FS Frontmatter Backward Compatibility)

### Description

Augment `/story-update` with a new Step 3a that calls `shimUpdateStoryStatus` before the existing YAML frontmatter write (now Step 3b). The DB becomes the **primary** status write target; the YAML frontmatter write is retained for Phase 1 backward compatibility. Documentation-only change to `.claude/commands/story-update.md` — no TypeScript source files created or modified.

### Non-Goals

- Do NOT remove or replace the YAML frontmatter update (Step 3b)
- Do NOT remove or replace the `stories.index.md` update (Step 4)
- Do NOT modify `packages/backend/mcp-tools/src/story-compatibility/`
- Do NOT add TypeScript source files
- Do NOT implement a DB-only mode
- Do NOT add a `db_updated: skipped` third value
- Do NOT modify worktree MCP tool calls in Step 2
- Do NOT change `permission_level: docs-only`

### Reuse Plan

- **Components**: shimUpdateStoryStatus, SWIM_LANE_TO_STATE, StoryUpdateStatusInput
- **Patterns**: MCP tool call pattern from existing Step 2, inline mapping table from WINT-1060, null-return warn+continue
- **Packages**: No new packages

### Recommendations for Subsequent Phases

#### For Test Plan Writer

- This story modifies a single markdown file. No TypeScript source to unit test directly.
- Test scenarios must cover all 6 integration test scenarios from AC-9 (A through F).
- For Scenario B and C (DB unavailable), confirm WARNING emitted AND frontmatter updated.
- For Scenario D (unmapped status), confirm `db_updated: false` and no shimUpdateStoryStatus call attempted.
- For Scenario E (invalid transition), confirm no file modifications and no DB call.
- For Scenario F (`--no-index`), confirm `db_updated: true` and verify `stories.index.md` NOT modified.
- UAT requires live postgres-knowledgebase per ADR-005: no mock DB in UAT.
- E2E Playwright tests NOT applicable (frontend_impacted: false).
- Key regression: verify existing worktree cleanup (Step 2) fires before DB write (AC-5).
- Key regression: verify transition validation rejects invalid transitions before DB interaction (AC-6).

#### For Dev Feasibility

- Implementation is documentation-only: one `.md` file modified, no TypeScript.
- **Primary change target**: `.claude/commands/story-update.md` (v2.1.0 → v3.0.0)
- **Step ordering in updated file**: Step 1 (locate) → Step 2 (worktree cleanup) → Step 2.5 (transition validation gate, if not already explicit) → Step 3a (DB write) → Step 3b (frontmatter update) → Step 4 (index update) → Step 5 (result)
- Effort estimate: LOW (2-4 hours). Analogous to WINT-1040 and WINT-1060 sibling stories.
- **Canonical subtasks**: ST-1 (read baseline), ST-2 (build mapping table), ST-3 (insert DB write step), ST-4 (result YAML + version bump + integration test scenarios)
- **Split risk**: LOW (0.1).
