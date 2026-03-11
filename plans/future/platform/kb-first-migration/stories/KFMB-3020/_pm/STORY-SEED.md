---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KFMB-3020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active in-progress stories for the platform epic in the Feb-13 baseline (baseline predates the KFMB plan). KFMB-3020 depends on KFMB-3010, which is currently in Backlog and has not yet begun.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Separate PostgreSQL instance (port 5433); `knowledgeEntries` table with embeddings |
| KB MCP Tools | `mcp__knowledge-base__*` | `kb_list_stories`, `kb_get_story`, `kb_update_story_status`, `kb_search`, `kb_get_next_story` available |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas; these are protected — must not be modified |
| CLI Commands (`.claude/commands/`) | `.claude/commands/` | ~34 command `.md` files; commands in scope: `story-status.md`, `story-update.md`, `pm-story.md`, `code-audit.md`, `elab-epic.md`, `index-update.md` |

### Active In-Progress Work

| Story | Title | Potential Overlap |
|-------|-------|-------------------|
| KFMB-3010 | Eliminate stories.index.md — Agent Updates | Direct predecessor; must complete before KFMB-3020 begins. Establishes the KB-native patterns this story extends to the command layer. |
| KFMB-3030 | Eliminate stories.index.md — Script Updates | Parallel dependent of KFMB-3010; touches shell scripts (not commands). No overlap with KFMB-3020 scope. |
| KFMB-4010 | Stage Directory Elimination — story-move and story-update Commands | Parallel dependent of KFMB-3010; touches `story-move` and `story-update` commands — shares partial overlap with KFMB-3020's `story-update.md` scope. Coordination required. |

### Constraints to Respect

- Protected: `packages/backend/orchestrator/src/artifacts/` schemas — do NOT modify
- Protected: `apps/api/knowledge-base/` — KB schema and pgvector setup
- Protected: `@repo/db` client package API surface
- All changes are to `.claude/commands/` `.md` files only — no source code changes
- KFMB-3010 must be complete before this story begins (it defines the KB-native patterns the commands will use)
- KFMB-4010 is parallel — `story-update.md` may need coordinated edits between KFMB-3020 and KFMB-4010; do not make conflicting changes
- `index-update.md` deprecation must be communicated clearly — it is called by multiple agents and its removal requires those callers (agents) to be updated first (KFMB-3010 scope)

---

## Retrieved Context

### Related Endpoints

- KB PostgreSQL: `postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`
- KB MCP tool namespace: `mcp__knowledge-base__*`
- `shimUpdateStoryStatus` — already called by `story-update.md` for DB writes (Step 3a); this is DB-layer, not index-layer
- `story_get_status` — already called by `story-status.md` for DB-first routing (single-story mode)

### Related Components

The following commands currently read or write `stories.index.md` and are in scope for this story:

**Primary writers or callers of `/index-update`:**

| Command | File | Current stories.index.md / index-update Usage |
|---------|------|------------------------------------------------|
| `story-update` | `.claude/commands/story-update.md` | Step 4 writes directly to `{FEATURE_DIR}/stories.index.md` (update status + progress counts). The `--no-index` flag skips this. DB write (Step 3a) already exists. |
| `pm-story` | `.claude/commands/pm-story.md` | Collision detection (Step Collision Detection) reads `stories.index.md` to check for existing entry. Step 3 (spawn leader context) passes `Index path: {INDEX_PATH}` to leader. Step 5 updates `platform.stories.index.md` directly. |
| `code-audit` | `.claude/commands/code-audit.md` | `/code-audit promote` instructs `audit-promote-leader` to dedup against `stories.index.md`, create stories, and update `stories.index.md`. |
| `elab-epic` | `.claude/commands/elab-epic.md` | Passes `stories_index` path to `elab-epic-setup-leader` via `context-init`. References `stories.index.md` as index path in context object. |
| `index-update` | `.claude/commands/index-update.md` | The command itself reads/writes `stories.index.md` entirely. Candidates for deprecation once callers are updated. |

**Readers (read index for state/context):**

| Command | File | Current stories.index.md Usage |
|---------|------|-------------------------------|
| `story-status` | `.claude/commands/story-status.md` | Feature Only and `--depth`/`--deps-order` modes read `stories.index.md`. Single-story mode uses DB-first with fallback to `stories.index.md`. Feature-only DB routing deferred to WINT-1070. |

### Reuse Candidates

- `mcp__knowledge-base__kb_list_stories` — replace `stories.index.md` scans for collision detection and feature-level summaries
- `mcp__knowledge-base__kb_get_story` — replace single-story index fallback reads
- `mcp__knowledge-base__kb_update_story_status` — already available; `story-update.md` currently uses `shimUpdateStoryStatus` (shim) which wraps the same DB; the index write (Step 4) can be removed once DB is authoritative
- `mcp__knowledge-base__kb_search` — replace `audit-promote-leader` dedup check against `stories.index.md`
- Pattern from KFMB-3010 (once complete): KB-native ID collision detection via `kb_list_stories`; KB-native status reads via `kb_get_story`
- Existing `story-update.md` Step 3a — already dual-writes to DB; Step 4 (index update) becomes the only remaining filesystem coupling

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Command with existing DB-first routing (partial migration) | `.claude/commands/story-status.md` | Already routes single-story queries to DB first, falls back to `stories.index.md`. Shows the before/after pattern: DB replaces index for single-story; Feature-level still uses index (deferred). |
| Command with existing DB write alongside index write | `.claude/commands/story-update.md` | Already has Step 3a (DB write via shimUpdateStoryStatus) + Step 4 (index write). The goal is to remove Step 4 entirely once DB is authoritative. |
| Agent collision detection using KB (reference implementation post-KFMB-3010) | `.claude/agents/pm-story-followup-leader.agent.md` | After KFMB-3010 completes this agent will use `kb_list_stories` for collision detection — serves as the canonical pattern for `pm-story.md` to adopt |
| Command with KB artifact reads | `.claude/commands/elab-epic.md` | Already uses `kb_read_artifact` in its Resume and Done sections; shows the pattern of KB-first reads |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (KB search unavailable during seed generation). ADR constraints applied from ADR-LOG.md.

### Blockers to Avoid (from past stories)

- **Removing index writes before DB is authoritative**: `story-update.md`'s Step 4 index write must only be removed after confirming DB is the authoritative source for all consumers. Removing Step 4 prematurely while other commands still read `stories.index.md` leaves stale data.
- **Leaving `--no-index` semantics undefined post-migration**: The `--no-index` flag on `story-update` currently suppresses Step 4. Post-migration, `--no-index` has no functional meaning (there is no index to skip). The flag must be deprecated or preserved as a no-op with a deprecation warning.
- **`/index-update` deprecation without caller communication**: `index-update.md` is called by at least 7 agents (per KFMB-3010 scope: `pm-story-generation-leader`, `elab-completion-leader`, `dev-implement-story`, `dev-code-review`, `qa-verify-completion-leader`, `pm-story-split-leader`, `pm-story-followup-leader`). Deprecating the command before all callers are updated (KFMB-3010) creates broken workflows.
- **Partial `pm-story.md` collision detection update**: `pm-story.md` has TWO collision detection points — the inline `Collision Detection (REQUIRED)` section and the logic embedded in Step 1c/1c-platform. Both must be updated consistently.
- **`platform.stories.index.md` vs `stories.index.md`**: `pm-story.md` Step 5 uses the Edit tool to update `platform.stories.index.md` directly. This is a different file from the per-epic `stories.index.md`. The platform index update (Step 5) is structural navigation metadata, not story state — its migration path is distinct and may require explicit scoping in AC.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — KB tool calls must use real KB instance |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev phase — not applicable here (no frontend impact) |

No API path ADRs apply — this story has no frontend/backend API changes.

### Patterns to Follow

- Use `kb_get_story({story_id})` to replace `stories.index.md` fallback reads in `story-status.md`'s single-story mode
- Use `kb_list_stories({feature: prefix, limit: N})` to replace `stories.index.md` scans in `pm-story.md` collision detection
- Use `kb_search` to replace `audit-promote-leader`'s dedup scan of `stories.index.md` in `code-audit.md promote`
- When a command currently passes `INDEX_PATH` as context to a spawned leader, replace with `feature` or `epic` identifier — the leader calls KB directly (pattern from KFMB-3010)
- For `story-update.md`: Step 3a already writes to DB; Step 4 (index write) is the migration target — remove it and mark `--no-index` as deprecated
- Maintain existing completion signals (`UPDATE COMPLETE`, `INDEX UPDATE COMPLETE`, etc.) — only internal mechanics change
- `index-update.md` should be deprecated (not deleted in this story) once no command passes it as a dependency

### Patterns to Avoid

- Do NOT delete `index-update.md` or `stories.index.md` itself in this story — deletion is cleanup work for KFMB-6020
- Do NOT update agent `.md` files in `.claude/agents/` — that is KFMB-3010's scope
- Do NOT update shell or Python scripts — that is KFMB-3030's scope
- Do NOT modify `story-move.md` beyond KFMB-4010's planned scope — coordinate to avoid conflicts
- Do NOT change the DB shim layer (`shimUpdateStoryStatus`, `story_get_status`) — those exist in source code, not in command `.md` files
- Do NOT migrate `platform.stories.index.md` Step 5 in `pm-story.md` in this story unless explicitly scoped — the platform index is structural metadata, not story state, and requires separate analysis

---

## Conflict Analysis

### Conflict: dependency_not_complete
- **Severity**: warning
- **Description**: KFMB-3010 (Agent Updates) is listed as a dependency and is currently in Backlog state. The KB-native patterns it establishes (idiomatic `kb_get_story` usage, KB-native collision detection, removal of `index_path` parameters from agent calls) must be available as reference implementations before KFMB-3020 updates the command layer. Starting KFMB-3020 without KFMB-3010's completed agent files risks the command updates referencing agent behaviors that still use the old index pattern.
- **Resolution Hint**: Begin KFMB-3020 only after KFMB-3010 is complete. The dependency chain is correctly modeled in the stories index.

---

## Story Seed

### Title

Eliminate stories.index.md — Command Updates

### Description

The `.claude/commands/` layer currently reads and writes `stories.index.md` as a source of story state and collision detection. Six command files are in scope: `story-status.md`, `story-update.md`, `pm-story.md`, `code-audit.md`, `elab-epic.md`, and `index-update.md`. Additionally, `context-init.md` passes `stories_index` path in its elab-epic context template, creating a soft dependency.

Phase 3 agent updates (KFMB-3010) will have already eliminated `stories.index.md` references from ~32 agent files. This story extends that elimination to the command (`.claude/commands/`) layer.

The work falls into four categories:

1. **Status write commands** (`story-update.md`): Remove Step 4 (index write) since the DB write in Step 3a is already present and authoritative. Deprecate the `--no-index` flag as a no-op with a deprecation warning.

2. **Collision detection commands** (`pm-story.md`): Replace the inline `stories.index.md` index check in Collision Detection with `kb_list_stories` query. Remove `Index path:` from the context passed to leader agents (agents no longer need it after KFMB-3010).

3. **Audit promote commands** (`code-audit.md`): Update the `promote` subcommand description to instruct `audit-promote-leader` to dedup via `kb_search`/`kb_list_stories` rather than reading `stories.index.md`.

4. **Deprecation candidates** (`index-update.md`, `elab-epic.md`): Mark `index-update.md` as deprecated — callers have been updated (KFMB-3010 agents, and KFMB-3020 commands). Update `elab-epic.md`'s `context-init` template to remove the `stories_index` path field.

The goal is that after this story, no command in `.claude/commands/` reads or writes `stories.index.md` as story state. Downstream stories KFMB-3030 (scripts) and KFMB-4010 (story-move / story-update stage transitions) will handle remaining filesystem coupling.

### Initial Acceptance Criteria

- [ ] AC-1: `story-update.md` Step 4 (index write to `{FEATURE_DIR}/stories.index.md`) is removed. The execution sequence is: locate → worktree cleanup (if `completed`) → DB write (Step 3a) → frontmatter update (Step 3b) → result. No reference to `stories.index.md` remains in the step-by-step execution flow.
- [ ] AC-2: `story-update.md` Result YAML no longer includes `index_updated` field (or marks it as deprecated/removed). `--no-index` flag is marked deprecated with a note that it is accepted as a no-op for backward compatibility.
- [ ] AC-3: `story-update.md` Integration Test Scenario F (--no-index with mapped status) is updated to reflect that `stories.index.md` is no longer updated under any condition (not just when `--no-index` is passed).
- [ ] AC-4: `pm-story.md` Collision Detection section replaces the `stories.index.md` index check with a `kb_list_stories({feature: PREFIX, limit: 100})` query. The directory check (filesystem) is retained; only the index check is removed.
- [ ] AC-5: `pm-story.md` Step 3 (Spawn Leader context) no longer includes `Index path: {INDEX_PATH}` in the leader prompt template. The `feature` or `epic` identifier is passed instead (matching the pattern established by KFMB-3010 agents).
- [ ] AC-6: `pm-story.md` Step 4.5 (Seed Story into KB Database) migration script invocation is verified to remain intact and correctly replaces the former `stories.index.md` entry creation path.
- [ ] AC-7: `code-audit.md` `/code-audit promote` subcommand description is updated to instruct `audit-promote-leader` to dedup against existing stories via `kb_search` or `kb_list_stories` rather than reading `plans/future/*/stories.index.md` files. The description no longer mentions `stories.index.md` in the three-step promote workflow.
- [ ] AC-8: `elab-epic.md` is updated so that the `context-init` context template (shown in the Execution section) no longer includes a `stories_index` field pointing to `stories.index.md`. The command passes only the `feature_dir` to the setup leader, which resolves story context from the KB.
- [ ] AC-9: `index-update.md` is marked deprecated with a header notice: "DEPRECATED as of KFMB-3020. All callers have been migrated to KB tools. This command will be deleted in KFMB-6020." The body is preserved for reference during the deprecation window.
- [ ] AC-10: `story-status.md` Feature Only mode (no `--depth`, no story ID) description is updated to note that this mode uses `kb_list_stories` for story counts rather than `stories.index.md`. The fallback note referencing WINT-1070 is updated to reflect the KFMB migration path.
- [ ] AC-11: `story-status.md` `--depth` and `--deps-order` modes are updated to read story data from `kb_list_stories({feature: PREFIX})` rather than `stories.index.md`. Dependency graph construction uses the `depends_on` field from KB story records.
- [ ] AC-12: No command in `.claude/commands/` contains a reference to `stories.index.md` as a live read or write target after this story completes (references in deprecated notices, version history, or example comments are acceptable). Verification via grep.
- [ ] AC-13: All updated commands preserve their existing completion signals (`UPDATE COMPLETE`, `INDEX UPDATE COMPLETE`, `AUDIT COMPLETE`, etc.) — only internal mechanics change.

### Non-Goals

- Do NOT update agent `.md` files in `.claude/agents/` — that is KFMB-3010's scope.
- Do NOT update shell or Python scripts in `scripts/` — that is KFMB-3030's scope.
- Do NOT delete `index-update.md` or `stories.index.md` files — deletion is KFMB-6020 scope.
- Do NOT migrate `platform.stories.index.md` Step 5 in `pm-story.md` unless explicitly scoped in a follow-up — the platform index is structural metadata, distinct from story state.
- Do NOT modify `story-move.md` — its stage-directory elimination is KFMB-4010's scope.
- Do NOT modify the DB shim layer (`shimUpdateStoryStatus`, `story_get_status`) — those are TypeScript source code, not command `.md` files.
- Do NOT change the psql connection string or KB infrastructure — use existing MCP tools only.
- Do NOT modify other commands not listed in scope (e.g., `dev-implement-story.md`, `qa-verify-story.md`, `elab-story.md`).

### Reuse Plan

- **KB MCP Tools**: `kb_list_stories`, `kb_get_story`, `kb_update_story_status`, `kb_search`
- **Patterns**: KB-native collision detection from KFMB-3010 (post-completion agents as reference); `story-status.md`'s existing DB-first routing as a template for Feature-level routing
- **Canonical Examples**: Post-KFMB-3010 `pm-story-generation-leader.agent.md` (no `index_path` param, uses KB directly); `story-update.md` Step 3a (already authoritative DB write pattern)
- **Grouping**: Process commands in order of coupling depth — start with the most isolated changes (`story-update.md` Step 4 removal, `index-update.md` deprecation), then tackle the more complex collision detection changes in `pm-story.md` and routing changes in `story-status.md`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Primary verification is a grep audit: `grep -r "stories\.index\.md" .claude/commands/` must return zero live-reference results after all changes (deprecated notices and version history entries are acceptable exceptions).
- Each AC maps to a specific command file — the test plan should enumerate all 6+ command files and verify each one individually via before/after diff.
- No unit tests required — command `.md` files are not executable code. Verification is code review + grep audit.
- For `story-update.md` AC-1/AC-2/AC-3: integration test scenarios in the command file itself should be updated to match new behavior (no index write under any condition).
- For `story-status.md` AC-10/AC-11: manual validation that `kb_list_stories` call signatures match current MCP tool schemas.
- The `--no-index` deprecation (AC-2) should be tested by confirming that passing `--no-index` to a post-migration `story-update` emits a deprecation warning but still succeeds.
- ADR-005 compliance note: Any test scenarios involving KB tool calls must reference a live `postgres-knowledgebase` MCP server instance.

### For UI/UX Advisor

- No UI impact. Mark `skipped: true`.
- The change is entirely internal to command instruction files — no user-facing UI changes.

### For Dev Feasibility

- The work is purely documentation editing (`.md` files in `.claude/commands/`). No TypeScript, no migrations, no infra changes.
- Blast radius is smaller than KFMB-3010 (~6 command files vs ~32 agent files), but some files (especially `pm-story.md` and `story-status.md`) are complex and require careful diffing.
- Recommended decomposition by risk:
  - **Subtask 1** (lowest risk): `index-update.md` — add deprecation header only; no logic changes
  - **Subtask 2** (low risk): `story-update.md` — remove Step 4, deprecate `--no-index`, update result YAML and integration tests
  - **Subtask 3** (medium risk): `code-audit.md` — update `promote` description to reference KB tools instead of `stories.index.md`
  - **Subtask 4** (medium risk): `elab-epic.md` — remove `stories_index` from context-init template; verify setup leader no longer needs it (post-KFMB-3010)
  - **Subtask 5** (higher risk): `pm-story.md` — update Collision Detection section, remove `Index path` from leader prompt, verify Step 4.5 is intact; be careful not to conflict with KFMB-4010 edits to `story-move.md`
  - **Subtask 6** (higher risk): `story-status.md` — update Feature Only, `--depth`, and `--deps-order` modes to use `kb_list_stories`; retain single-story DB-first routing as-is (already migrated)
  - **Subtask 7**: Final grep audit across all `.claude/commands/` files
- **Key coordination point**: `story-update.md` is also touched by KFMB-4010 (stage directory elimination). Review KFMB-4010's scope before editing to ensure the two stories do not make conflicting changes to the same sections.
- The `--no-index` deprecation in `story-update.md` is a behavioral change with backward compatibility implications — the flag must be accepted silently (no error) while emitting a visible deprecation warning.
- Canonical references: use post-KFMB-3010 agent files as the reference for what "no index reference" looks like in practice.
