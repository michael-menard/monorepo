---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KFMB-3010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active in-progress stories noted in baseline for platform epic; KFMB-2030 is "In Elaboration" per the stories index but not reflected in the Feb-13 baseline (baseline predates this plan).

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Separate PostgreSQL instance (port 5433), `knowledgeEntries` table with embeddings |
| KB MCP Tools | `mcp__knowledge-base__*` | `kb_list_stories`, `kb_get_story`, `kb_update_story_status`, `kb_search`, `kb_get_next_story` available |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas for story, checkpoint, scope, plan, evidence, review |
| Agent filesystem | `.claude/agents/` | ~130 agent .md files; ~32 currently reference stories.index.md |

### Active In-Progress Work

| Story | Title | Potential Overlap |
|-------|-------|-------------------|
| KFMB-2030 | Update /pm-bootstrap-workflow Command | In Elaboration — establishes bootstrap KB-native patterns this story builds on |
| KFMB-2010 | KB-Native Bootstrap Generation Leader | Backlog — must complete before KFMB-3010 (dependency) |
| KFMB-2020 | KB-Native Bootstrap Setup Leader | Backlog — must complete before KFMB-3010 (dependency) |

### Constraints to Respect

- Protected: `packages/backend/orchestrator/src/artifacts/` schemas — do NOT modify
- Protected: `apps/api/knowledge-base/` — KB schema and pgvector setup
- Protected: `@repo/db` client package API surface
- All changes are to `.claude/agents/` .md files only — no source code changes
- KFMB-2010 and KFMB-2020 must be complete before this story begins (they define the KB-native patterns to follow)
- KFMB-3020 (Command Updates) and KFMB-3030 (Script Updates) depend on this story completing first

---

## Retrieved Context

### Related Endpoints
- KB PostgreSQL: `postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`
- KB MCP tool namespace: `mcp__knowledge-base__*`

### Related Components

The following agents currently read or write `stories.index.md` and are in scope for this story:

**Primary writers (write new entries or update status):**
| Agent | File | Current stories.index.md Usage |
|-------|------|-------------------------------|
| pm-bootstrap-generation-leader | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Writes `stories.index.md` at bootstrap time; also inserts to KB already |
| pm-bootstrap-setup-leader | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | Checks `stories.index.md` existence for collision detection |
| pm-story-followup-leader | `.claude/agents/pm-story-followup-leader.agent.md` | Scans index for highest ID, writes new entry to index |
| pm-story-split-leader | `.claude/agents/pm-story-split-leader.agent.md` | Scans index for highest ID, removes original, adds splits |
| elab-epic-updates-leader | `.claude/agents/elab-epic-updates-leader.agent.md` | Writes new stories, splits, risk notes to index |
| audit-promote-leader | `.claude/agents/audit-promote-leader.agent.md` | Reads all `plans/future/*/stories.index.md` for dedup; adds promoted stories |
| pm-story-generation-leader | `.claude/agents/pm-story-generation-leader.agent.md` | Claims story in index via `/index-update`; verifies status after generation |

**Readers (read index for context/validation):**
| Agent | File | Current stories.index.md Usage |
|-------|------|-------------------------------|
| pm-story-seed-agent | `.claude/agents/pm-story-seed-agent.agent.md` | Reads index to locate story entry; uses as precondition |
| pm-story-adhoc-leader | `.claude/agents/pm-story-adhoc-leader.agent.md` | Reads index; notes whether follow-up update needed |
| pm-story-bug-leader | `.claude/agents/pm-story-bug-leader.agent.md` | Reads index; notes whether follow-up update needed |
| pm-story-generation-leader | `.claude/agents/pm-story-generation-leader.agent.md` | Reads index entry for story scope |
| pm-draft-test-plan | `.claude/agents/pm-draft-test-plan.agent.md` | Reads relevant story entry from index |
| pm-uiux-recommendations | `.claude/agents/pm-uiux-recommendations.agent.md` | Reads relevant story entry from index |
| pm-dev-feasibility-review | `.claude/agents/pm-dev-feasibility-review.agent.md` | Reads relevant story entry from index |
| elab-analyst | `.claude/agents/elab-analyst.agent.md` | Reads for scope alignment |
| elab-epic-setup-leader | `.claude/agents/elab-epic-setup-leader.agent.md` | Validates index exists; reads story count |
| pm-harness-setup-leader | `.claude/agents/pm-harness-setup-leader.agent.md` | Validates index exists as precondition |
| story-attack-agent | `.claude/agents/story-attack-agent.agent.md` | Reads index for story context |
| story-fanout-pm | `.claude/agents/story-fanout-pm.agent.md` | Reads index for story context |
| story-fanout-qa | `.claude/agents/story-fanout-qa.agent.md` | Reads index for story context |
| story-fanout-ux | `.claude/agents/story-fanout-ux.agent.md` | Reads index for story context |
| gap-analytics-agent | `.claude/agents/gap-analytics-agent.agent.md` | Reads index for story tracking |
| audit-devils-advocate | `.claude/agents/audit-devils-advocate.agent.md` | Reads all `plans/future/*/stories.index.md` for dedup check |
| reality-intake-collector | `.claude/agents/reality-intake-collector.agent.md` | Scans `plans/future/*/stories.index.md` for completed stories |
| pm-story-followup-leader | `.claude/agents/pm-story-followup-leader.agent.md` | Reads index for collision detection |
| pm-story-split-leader | `.claude/agents/pm-story-split-leader.agent.md` | Reads index for collision detection |
| pm.agent.md | `.claude/agents/pm.agent.md` | Passes index path to spawned leaders |
| elab-epic-engineering | `.claude/agents/elab-epic-engineering.agent.md` | References index |
| elab-epic-platform | `.claude/agents/elab-epic-platform.agent.md` | References index |
| elab-epic-product | `.claude/agents/elab-epic-product.agent.md` | References index |
| elab-epic-qa | `.claude/agents/elab-epic-qa.agent.md` | References index |
| elab-epic-security | `.claude/agents/elab-epic-security.agent.md` | References index |
| elab-epic-ux | `.claude/agents/elab-epic-ux.agent.md` | References index |

**Total agents in scope: ~32 files**

### Reuse Candidates

- `mcp__knowledge-base__kb_list_stories` — replace scans of index for story existence/collision detection
- `mcp__knowledge-base__kb_get_story` — replace single-story lookups
- `mcp__knowledge-base__kb_update_story_status` — replace index status updates
- `mcp__knowledge-base__kb_get_next_story` — replace "find next eligible story" scans of index
- `mcp__knowledge-base__kb_search` — replace keyword scans over index content
- Pattern from KFMB-2020 (once complete): KB-native collision detection via `kb_list_stories` filtered by prefix
- Pattern from KFMB-2010 (once complete): KB-native story creation replacing filesystem writes

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent with KB tool calls (current best example) | `.claude/agents/elab-epic-setup-leader.agent.md` | Already uses `kb_write_artifact` / `kb_read_artifact`; shows the pattern of replacing filesystem artifacts with KB calls |
| Agent with KB tool calls (reads) | `.claude/agents/elab-epic-updates-leader.agent.md` | Reads context from KB (`kb_read_artifact`) but still writes to `stories.index.md` — exemplifies the before/after pattern for this story |
| Bootstrap generation with dual output | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Already writes to both filesystem AND KB `stories` table — shows the transitional dual-write pattern |
| Agent collision detection (current) | `.claude/agents/pm-story-followup-leader.agent.md` | Phase 3/3.5 shows the full current collision-detection pattern to be replaced with `kb_list_stories` |

---

## Knowledge Context

### Lessons Learned
No KB lessons loaded (KB search unavailable). ADR constraints applied.

### Blockers to Avoid (from past stories)
- **Large blast-radius changes without incremental checkpoints**: With ~32 agents to update, attempting all in one pass is high risk. Incremental grouping with verification checkpoints is required.
- **Incomplete reference updates**: grep-based ID scan patterns (`grep -E "^## {PREFIX}-[0-9]+:"`) exist in multiple agents. All instances must be replaced — missing even one leaves a partial migration.
- **Agent interdependencies**: Some agents are spawned by others and pass `stories.index.md` paths as parameters (e.g., `pm.agent.md` passes `Index file: {FEATURE_DIR}/stories.index.md` to the generation leader). Updating the callee without the caller leaves a broken contract.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — KB test calls must use real KB instance |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev phase |

No API path ADRs apply — this story has no frontend/backend API changes.

### Patterns to Follow
- Use `kb_list_stories` with `feature` filter (e.g., `feature: "wish"`) to replace grep-based ID scanning
- Use `kb_get_story` to validate story existence before operations (replaces index membership checks)
- Use `kb_update_story_status` to transition story state (replaces `/index-update` skill calls)
- Use `kb_get_next_story` with `include_backlog: true` to find next eligible story (replaces manual index parsing)
- When an agent currently passes `index_path` as a parameter to workers, replace with `epic` or `feature` identifier — workers call KB directly
- Maintain backward-compatible signals (`PM COMPLETE`, `SETUP COMPLETE`, etc.) — only the internal mechanics change

### Patterns to Avoid
- Do NOT remove `stories.index.md` file itself in this story — file deletion is out of scope (KFMB-3020/3030 handle commands and scripts)
- Do NOT rewrite agents that are in-scope for KFMB-3020 (commands) or KFMB-3030 (scripts) — stay within agent .md boundary
- Do NOT create new filesystem artifacts to replace the index — KB is the replacement
- Do NOT modify agent orchestration logic or story generation workflows — only replace the index read/write calls

---

## Conflict Analysis

### Conflict: dependency_not_complete
- **Severity**: warning
- **Description**: KFMB-2010 and KFMB-2020 are listed as dependencies and are currently in Backlog state. The KB-native patterns they establish (idiomatic `kb_create_story` usage, KB-based collision detection) need to be available as reference implementations before updating 32 agents. Starting KFMB-3010 without these patterns risks inconsistent replacement patterns across agents.
- **Resolution Hint**: Begin KFMB-3010 only after KFMB-2010 and KFMB-2020 are complete and their updated agent files can serve as canonical examples. The dependency chain is correctly modeled in the stories index.

---

## Story Seed

### Title
Eliminate stories.index.md — Agent Updates

### Description

The current agent ecosystem (~32 `.claude/agents/*.agent.md` files) reads and writes `stories.index.md` as the authoritative source of story state and ID allocation. This is a filesystem artifact that duplicates information now stored in the KB `stories` table. Phase 2 stories (KFMB-2010, KFMB-2020) will establish KB-native bootstrap patterns. This story eliminates all remaining `stories.index.md` reads and writes across agents, replacing them with `kb_list_stories`, `kb_get_story`, `kb_update_story_status`, and related KB MCP tools.

The work touches agents across three categories:
1. **ID allocation agents** (`pm-story-followup-leader`, `pm-story-split-leader`): Replace grep-based highest-ID scans with `kb_list_stories` queries sorted by story_id.
2. **State-mutation agents** (`elab-epic-updates-leader`, `audit-promote-leader`, `pm-story-generation-leader`): Replace direct file writes to `stories.index.md` with `kb_update_story_status` / `kb_create_story` calls.
3. **Read-only consumers** (seed agent, elab workers, fanout agents, gap analytics): Replace index file reads with targeted `kb_get_story` or `kb_list_stories` calls; remove `index_path` input parameters where KB lookup is sufficient.

The goal is that after this story, no agent reads or writes `stories.index.md`. Downstream stories KFMB-3020 and KFMB-3030 will handle the command and script layers.

### Initial Acceptance Criteria

- [ ] AC-1: `pm-story-followup-leader` determines the next available story ID by querying `kb_list_stories({feature, limit: 100})` and computing `MAX(story_id_numeric) + 10`, with no reference to `stories.index.md`.
- [ ] AC-2: `pm-story-split-leader` determines the next available story ID via the same KB query pattern as AC-1, with no reference to `stories.index.md`.
- [ ] AC-3: `elab-epic-updates-leader` writes new stories and splits to the KB via `kb_create_story` (or `kb_update_story_status` for existing), removing its direct `stories.index.md` write step while still writing its filesystem `UPDATES-LOG` KB artifact.
- [ ] AC-4: `audit-promote-leader` deduplicates against existing stories by querying `kb_list_stories` (or `kb_search`) instead of reading `plans/future/*/stories.index.md` files.
- [ ] AC-5: `pm-story-generation-leader` claims a story (Phase 0.6) via `kb_update_story_status({story_id, state: "in_progress"})` and verifies status via `kb_get_story`, with no `/index-update` skill call for stories.index.md.
- [ ] AC-6: `pm-bootstrap-setup-leader` collision detection uses `kb_list_stories({feature: prefix})` to check for existing stories instead of checking `stories.index.md` existence on disk. (Dependent on KFMB-2020 pattern.)
- [ ] AC-7: `pm-bootstrap-generation-leader` does not write `stories.index.md` — all story creation goes through `kb_create_story`. (Dependent on KFMB-2010 pattern.)
- [ ] AC-8: Read-only consumer agents (`pm-story-seed-agent`, `pm-draft-test-plan`, `pm-uiux-recommendations`, `pm-dev-feasibility-review`, `elab-analyst`, story-fanout-*, `gap-analytics-agent`) retrieve story data from `kb_get_story({story_id})` rather than parsing `stories.index.md` entries. The `index_path` input parameter is replaced with `story_id` (already available).
- [ ] AC-9: `elab-epic-setup-leader` and `pm-harness-setup-leader` validate bootstrap completion by querying `kb_list_stories` for stories with the given prefix rather than checking `stories.index.md` existence.
- [ ] AC-10: `reality-intake-collector` scans for completed stories via `kb_list_stories({state: "completed"})` instead of globbing `plans/future/*/stories.index.md`.
- [ ] AC-11: `audit-devils-advocate` deduplication check queries `kb_search` or `kb_list_stories` instead of reading `plans/future/*/stories.index.md`.
- [ ] AC-12: All updated agents preserve their existing completion signals (`PM COMPLETE`, `SETUP COMPLETE`, `GENERATION COMPLETE`, etc.) — only internal mechanics change.
- [ ] AC-13: No agent in `.claude/agents/` contains a reference to `stories.index.md` as a read or write target after this story completes. (Verification via grep.)

### Non-Goals
- Do NOT delete or modify the `stories.index.md` file itself — that is out of scope (no story owns this yet, or it may be addressed in KFMB-3020/3030 cleanup).
- Do NOT update commands (`.claude/skills/`) — that is KFMB-3020.
- Do NOT update shell/Python scripts — that is KFMB-3030.
- Do NOT modify `pm-story-generation-leader.agent.md.bak` or other backup files.
- Do NOT change agent orchestration logic, story content structure, or AC formats.
- Do NOT change the `_shared/work-order-claim.md` file — it references stories.index.md for historical context only.
- Do NOT add KB tools to agents that don't currently reference stories.index.md.
- Do NOT change the psql connection string or KB infrastructure — use existing MCP tools only.

### Reuse Plan
- **KB MCP Tools**: `kb_list_stories`, `kb_get_story`, `kb_update_story_status`, `kb_get_next_story`, `kb_search`
- **Patterns**: KB-native collision detection pattern from KFMB-2020; KB-native story creation pattern from KFMB-2010
- **Canonical Examples**: Updated `pm-bootstrap-generation-leader` and `pm-bootstrap-setup-leader` (post-KFMB-2010/2020) serve as reference implementations
- **Grouping**: Process agents in groups by category (ID-allocators → state-mutators → read-only consumers) to reduce risk and allow incremental verification

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Primary verification is a grep audit: `grep -r "stories\.index\.md" .claude/agents/` must return zero results after all changes.
- Each AC maps to a specific agent. Test plan should enumerate all 32 agents and verify each one individually.
- No unit tests required — agent .md files are not executable code. Verification is code review + grep audit.
- KB tool calls in agents cannot be integration-tested in isolation — the test plan should focus on manual validation that KB tool signatures match current MCP tool schemas.
- Consider a dry-run checklist: for each agent, note the before/after change and the KB tool used.

### For UI/UX Advisor
- No UI impact. Skip or mark `skipped: true`.
- The change is entirely internal to agent instruction files.

### For Dev Feasibility
- The work is purely documentation editing (`.md` files in `.claude/agents/`). No TypeScript, no migrations, no infra changes.
- The main risk is blast radius: ~32 files must be edited correctly. A missed reference in any agent leaves a partial migration.
- Recommended decomposition by group:
  - **Subtask 1**: ID-allocation agents (2 files: `pm-story-followup-leader`, `pm-story-split-leader`)
  - **Subtask 2**: State-mutation agents (4 files: `elab-epic-updates-leader`, `audit-promote-leader`, `pm-story-generation-leader`, `pm.agent.md`)
  - **Subtask 3**: Bootstrap agents (2 files: `pm-bootstrap-generation-leader`, `pm-bootstrap-setup-leader`) — requires KFMB-2010/2020 first
  - **Subtask 4**: Setup/validation agents (3 files: `elab-epic-setup-leader`, `pm-harness-setup-leader`, `reality-intake-collector`)
  - **Subtask 5**: Read-only worker consumers (8 files: `pm-story-seed-agent`, `pm-draft-test-plan`, `pm-uiux-recommendations`, `pm-dev-feasibility-review`, `elab-analyst`, `story-fanout-pm`, `story-fanout-qa`, `story-fanout-ux`)
  - **Subtask 6**: Audit/analytics agents (3 files: `audit-promote-leader` already in Subtask 2, `audit-devils-advocate`, `gap-analytics-agent`)
  - **Subtask 7**: Elab epic review agents (6 files: `elab-epic-engineering`, `elab-epic-platform`, `elab-epic-product`, `elab-epic-qa`, `elab-epic-security`, `elab-epic-ux`)
  - **Subtask 8**: Remaining agents (`story-attack-agent`, `pm-story-adhoc-leader`, `pm-story-bug-leader`)
  - **Subtask 9**: Final grep audit across all `.claude/agents/` files
- The `sizing_warning: true` flag in the story bootstrap is justified — this is a large number of files with similar but not identical changes. Careful diffing of each agent's specific usage pattern is required.
- Canonical references: use the post-KFMB-2010/2020 versions of `pm-bootstrap-generation-leader.agent.md` and `pm-bootstrap-setup-leader.agent.md` as the reference implementation for KB tool call syntax.
