---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KFMB-2030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No in-progress stories recorded in baseline; KB-first migration plan was created after the baseline date (2026-02-26), so no baseline coverage for KFMB stories specifically.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `pm-bootstrap-workflow` command | `.claude/commands/pm-bootstrap-workflow.md` (v5.0.0) | Direct target of this story — the command to be updated |
| `pm-bootstrap-generation-leader` agent | `.claude/agents/pm-bootstrap-generation-leader.agent.md` (v4.0.0) | Currently writes `stories.index.md` and uses raw SQL inserts; KFMB-2010 will rewrite to use `kb_create_story` |
| `pm-bootstrap-setup-leader` agent | `.claude/agents/pm-bootstrap-setup-leader.agent.md` (v4.0.0) | Currently checks for `stories.index.md` collision on disk; KFMB-2020 will rewrite to use `kb_list_stories` |
| `pm-bootstrap-workflow-reference.md` | `.claude/docs/pm-bootstrap-workflow-reference.md` (v1.0.0) | Reference doc listing `stories.index.md` as an artifact — must be updated in this story |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Established Zod-validated artifact pattern; not directly touched here |
| KB MCP tools | `apps/api/knowledge-base/src/mcp-server/` | Infrastructure backing `kb_create_story`, `kb_list_stories`, `kb_get_plan` etc. |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|--------------|
| KFMB-2010 | KB-Native Bootstrap Generation Leader | Direct dependency — delivers `kb_create_story` call in generation agent |
| KFMB-2020 | KB-Native Bootstrap Setup Leader | Direct dependency — delivers `kb_list_stories` collision check in setup agent |
| KFMB-3010 | Eliminate stories.index.md — Agent Updates | Parallel group (Group 4); touches overlapping concerns but scoped to other agents |

No stories are currently in-progress per the baseline. All KFMB stories are in backlog status.

### Constraints to Respect

- KFMB-2030 MUST NOT be started until KFMB-2010 and KFMB-2020 are complete (hard dependency).
- The `pm-bootstrap-workflow` command is a critical orchestrator — changes must not break KB Mode or File Mode (legacy) behavior.
- File Mode (legacy, `--file` flag) should be preserved or clearly deprecated with guidance.
- The Completion Report section in the command currently lists `stories.index.md` as a generated file — this reference must be removed or conditioned on File Mode only.

---

## Retrieved Context

### Related Endpoints
None — this story is documentation/command-only; no API endpoints are touched.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `/pm-bootstrap-workflow` command | `.claude/commands/pm-bootstrap-workflow.md` | Primary target: orchestrator command to update |
| `pm-bootstrap-setup-leader` agent | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | Phase 0 agent updated by KFMB-2020 (dependency) |
| `pm-bootstrap-generation-leader` agent | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Phase 2 agent updated by KFMB-2010 (dependency) |
| Reference doc | `.claude/docs/pm-bootstrap-workflow-reference.md` | Supporting reference — lists `stories.index.md` as artifact |
| Stories index | `plans/future/platform/kb-first-migration/stories.index.md` | Example of a currently-existing filesystem output to be eliminated |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `kb_get_plan` MCP tool | Already used in command Pre-Phase; pattern established |
| `kb_update_plan` MCP tool | Already used in Done section; pattern established |
| `kb_list_stories` | Delivered by KFMB-2020; reuse its query pattern for collision check documentation |
| KB Mode inline context passing | Already designed and documented in command v5.0.0; preserve as-is |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Command orchestrator structure | `.claude/commands/pm-bootstrap-workflow.md` | The file being updated; already has KB Mode / File Mode split |
| Agent instruction structure | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Sister agent updated by KFMB-2010; shows current state and expected post-migration shape |
| MCP tool usage in commands | `.claude/commands/pm-bootstrap-workflow.md` (Pre-Phase section) | Shows `kb_get_plan` / `kb_update_plan` call pattern already in use |

---

## Knowledge Context

### Lessons Learned

No lessons loaded from KB (KB search unavailable in this context). The following are inferred from the codebase state:

- **Consistency between command and agents is critical**: The command's completion report (`### Files Created` section) currently lists `stories.index.md` — if the generation agent (KFMB-2010) stops writing this file, the command's report will be misleading. These must be updated atomically.
- **File Mode must not be broken**: The legacy `--file` path still writes `stories.index.md` and relies on disk-based artifacts. KFMB-2030 must ensure File Mode behavior is preserved while KB Mode is updated. Partial updates are a risk.
- **The collision check is mode-sensitive**: `pm-bootstrap-setup-leader` currently checks for `stories.index.md` on disk (step 4 of KB Mode Steps). After KFMB-2020, this check becomes a `kb_list_stories` call. The command documentation must reflect the updated logic.

### Blockers to Avoid (from past stories)

- Do not update the command before KFMB-2010 and KFMB-2020 are merged — the command references agent behavior that will have changed.
- Do not remove `stories.index.md` from the completion report under File Mode — the legacy path still generates it.
- Do not assume `kb_create_story` exists until KFMB-1020 is complete (KFMB-2010's dependency).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | If any UAT is added for this story (unlikely, docs-only), it must not mock MCP tools |
| ADR-006 | E2E Tests Required in Dev Phase | E2E skip condition applies: `frontend_impacted: false`, no UI-facing ACs |

ADR-001, ADR-002, ADR-003, ADR-004 are not relevant — this story does not touch API paths, infrastructure, images, or authentication.

### Patterns to Follow

- KB Mode / File Mode dual-path pattern already established in the command — preserve this split throughout updates.
- Inline context passing (YAML blocks labelled `SETUP-CONTEXT`, `ANALYSIS`, `SUMMARY`) — do not change this protocol.
- `kb_get_plan` / `kb_update_plan` MCP call pattern at Pre-Phase and Done sections — follow for any new MCP calls.
- Completion report format — update content but preserve table structure.

### Patterns to Avoid

- Do not collapse KB Mode and File Mode into a single path — they have different artifact strategies.
- Do not reference filesystem paths (e.g., `{feature_dir}/stories.index.md`) in KB Mode documentation.
- Do not add new MCP tool dependencies not delivered by KFMB-2010 or KFMB-2020.

---

## Conflict Analysis

### Conflict: Dependency Risk — KFMB-2010/2020 Not Yet Complete
- **Severity**: warning
- **Description**: KFMB-2030 depends on KFMB-2010 (generation agent rewrite) and KFMB-2020 (setup agent rewrite). Until those stories define the exact new behavior of the agents, this story cannot fully specify what the command needs to say about Phase 0 and Phase 2 behavior in KB Mode. The command documentation must accurately reflect the post-migration agent contracts.
- **Resolution Hint**: Elaborate and implement KFMB-2030 only after KFMB-2010 and KFMB-2020 are complete. Use their EVIDENCE.yaml and final agent files as authoritative inputs for this story's implementation.
- **Source**: baseline + index dependency graph

### Conflict: Overlap with KFMB-3010 (Parallel Group 4)
- **Severity**: warning
- **Description**: KFMB-3010 ("Eliminate stories.index.md — Agent Updates") is in the same parallelization group (Group 4) and also eliminates `stories.index.md` references, but targets a different set of agents (not bootstrap agents). If KFMB-2030 and KFMB-3010 are worked simultaneously, there is a risk of conflicting editorial voice or redundant changes to the reference docs.
- **Resolution Hint**: Coordinate with KFMB-3010 scope — KFMB-2030 owns `pm-bootstrap-workflow` command and reference doc; KFMB-3010 owns other agents. Ensure no double-editing of shared docs.
- **Source**: index parallelization groups

---

## Story Seed

### Title
Update /pm-bootstrap-workflow Command for KB-Native Bootstrap

### Description

The `/pm-bootstrap-workflow` command (v5.0.0) orchestrates a three-phase bootstrap pipeline. Phase 0 (`pm-bootstrap-setup-leader`) currently checks for a `stories.index.md` file on disk as a collision guard in KB Mode, and Phase 2 (`pm-bootstrap-generation-leader`) currently writes a `stories.index.md` file to disk and inserts stories via raw SQL.

KFMB-2010 rewrites the generation leader to call `kb_create_story` (no disk file for the index). KFMB-2020 rewrites the setup leader to use `kb_list_stories` for collision detection (no `stories.index.md` check). Once those stories are complete, the command itself — plus its reference documentation — will contain stale references to filesystem outputs and the old collision logic that must be removed or corrected.

This story updates the command and reference doc to accurately reflect the KB-native bootstrap flow: no `stories.index.md` output in KB Mode, collision detection via `kb_list_stories`, story seeding via `kb_create_story`, and a corrected completion report.

### Initial Acceptance Criteria

- [ ] AC-1: The KB Mode phase prompt for Phase 0 (`pm-bootstrap-setup-leader`) accurately describes that collision detection is performed via `kb_list_stories` (not `stories.index.md` on disk).
- [ ] AC-2: The KB Mode phase prompt for Phase 2 (`pm-bootstrap-generation-leader`) accurately describes that stories are inserted via `kb_create_story` and no `stories.index.md` is written.
- [ ] AC-3: The "Done — KB Mode" section no longer references the `pnpm migrate:stories` fallback as the primary seeding mechanism (it is now a fallback only, or removed if KFMB-2010 eliminates it entirely).
- [ ] AC-4: The Completion Report (`### Files Created`) in KB Mode no longer lists `stories.index.md` as a generated file.
- [ ] AC-5: The `frontmatter` `kb_tools` list in the command is updated to include any new MCP tools used (e.g., `kb_create_story`, `kb_list_stories`) if not already listed.
- [ ] AC-6: File Mode (`--file`) behavior and documentation are preserved unchanged — `stories.index.md` remains a valid output in File Mode.
- [ ] AC-7: `pm-bootstrap-workflow-reference.md` is updated to remove `stories.index.md` from the Artifacts table for KB Mode (or annotate it as File Mode only).
- [ ] AC-8: After the update, running `/pm-bootstrap-workflow {slug}` (KB Mode) with the updated agents from KFMB-2010/2020 produces a correct bootstrap with no references to stale filesystem paths in the output report.

### Non-Goals

- This story does NOT rewrite the agent logic inside `pm-bootstrap-setup-leader` or `pm-bootstrap-generation-leader` — that is KFMB-2010 and KFMB-2020.
- This story does NOT eliminate `stories.index.md` from the repository filesystem broadly — that is KFMB-3020/3030.
- This story does NOT modify any other commands (e.g., `/elab-epic`, `/pm-story`, `/story-status`) — those are separate KFMB stories.
- This story does NOT create or modify any TypeScript/code files — it is documentation-only (`.claude/commands/` and `.claude/docs/` files only).
- This story does NOT add new MCP tools to the KB server — those are delivered by KFMB-1020/1030.
- Stage directories (`backlog/`, `elaboration/`, etc.) in the repo are not touched by this story.

### Reuse Plan

- **Components**: `kb_get_plan`, `kb_update_plan` MCP call patterns already in the command — keep as-is.
- **Patterns**: KB Mode / File Mode dual-path documentation pattern — preserve throughout all edits.
- **Packages**: No TypeScript packages touched — docs-only story.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is documentation-only (command `.md` files and reference docs). No runnable tests exist for command files. The test plan should focus on:
- Manual verification: run `/pm-bootstrap-workflow` in KB Mode after KFMB-2010/2020 are complete and confirm the completion report matches the updated text.
- Diff review: confirm `stories.index.md` is not generated in KB Mode output.
- Reference doc review: confirm Artifacts table in `pm-bootstrap-workflow-reference.md` no longer lists `stories.index.md` unconditionally.
- ADR-006 skip condition applies: `frontend_impacted: false`, no E2E tests required.

### For UI/UX Advisor

No UI/UX concerns — this story modifies only internal command documentation used by AI agents. No user-facing interface changes.

### For Dev Feasibility

- **Scope**: Two files require edits: `.claude/commands/pm-bootstrap-workflow.md` and `.claude/docs/pm-bootstrap-workflow-reference.md`. Both are markdown, no build or type-check required.
- **Key risk**: The command must be updated after KFMB-2010 and KFMB-2020 are merged. Implementing before those stories are complete means the command may describe agent behavior that doesn't yet exist. Recommend gating elaboration of this story until KFMB-2010 and KFMB-2020 have reached `needs-code-review` or later.
- **Effort**: Low — targeted editorial changes to two markdown files. No code, no tests, no infra. Likely 1 dev session.
- **Canonical reference for edits**: Read the final versions of `pm-bootstrap-setup-leader.agent.md` (post-KFMB-2020) and `pm-bootstrap-generation-leader.agent.md` (post-KFMB-2010) before editing the command. Their final agent contracts dictate what the command prompt templates need to say.
- **Frontmatter `kb_tools` update**: Check if `kb_create_story` and `kb_list_stories` need to be added to the command's frontmatter `kb_tools` list after reviewing what KFMB-2010/2020 deliver.
