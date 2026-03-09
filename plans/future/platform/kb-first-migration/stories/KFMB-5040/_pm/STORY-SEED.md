---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KFMB-5040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline does not describe the `_pm/` filesystem artifact pattern in detail — the four output files (`STORY-SEED.md`, `test-plan.yaml`, `dev-feasibility.yaml`, `uiux-notes.yaml`) and how `pm-story-generation-leader` embeds them as `pm_artifacts` in `story.yaml` were inferred from agent file inspection. The baseline records the Orchestrator YAML Artifacts pattern as existing, which is accurate and relevant. No KFMB stories are in-progress in the baseline snapshot (plan was created 2026-02-26).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `storyArtifacts` jump table + detail tables | `apps/api/knowledge-base/src/db/schema.ts` | The KB storage backend. KFMB-1030 adds `artifact_test_plans`, `artifact_dev_feasibility`, `artifact_uiux_notes`, `artifact_story_seeds` detail tables — the four PM artifact types this story will write to |
| `kb_write_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | The target write API replacing filesystem writes in all 4 PM worker agents |
| `kb_read_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2408) | Used by `pm-story-generation-leader` to read PM artifacts after workers write them; downstream KFMB-5050 reader migration depends on these writes |
| `_pm/` filesystem outputs | `{OUTPUT_DIR}/_pm/{STORY-SEED.md,test-plan.yaml,dev-feasibility.yaml,uiux-notes.yaml}` | Currently the sole output channel for 4 PM worker agents. These files are then read by `pm-story-generation-leader` to assemble `story.yaml`. After this story, workers write to KB via `kb_write_artifact` instead |
| `pm-story-generation-leader` | `.claude/agents/pm-story-generation-leader.agent.md` | Leader that spawns all 4 worker agents and reads their `_pm/` outputs to compose the story. After KFMB-2040, this leader will be updated to read via `kb_read_artifact` instead — but that is KFMB-5050's scope, not this story's |
| `pm-story-seed-agent` | `.claude/agents/pm-story-seed-agent.agent.md` | Currently writes `STORY-SEED.md` to `{output_dir}/_pm/STORY-SEED.md` using Write tool. Needs migration to `kb_write_artifact({ artifact_type: "story_seed" })` |
| `pm-draft-test-plan` | `.claude/agents/pm-draft-test-plan.agent.md` | Currently writes `test-plan.yaml` to `{FEATURE_DIR}/backlog/{STORY_ID}/_pm/test-plan.yaml` using Write tool. Needs migration to `kb_write_artifact({ artifact_type: "test_plan" })` |
| `pm-dev-feasibility-review` | `.claude/agents/pm-dev-feasibility-review.agent.md` | Currently writes `dev-feasibility.yaml` to `{FEATURE_DIR}/backlog/{STORY_ID}/_pm/dev-feasibility.yaml` using Write tool. Needs migration to `kb_write_artifact({ artifact_type: "dev_feasibility" })` |
| `pm-uiux-recommendations` | `.claude/agents/pm-uiux-recommendations.agent.md` | Currently writes `uiux-notes.yaml` to `{FEATURE_DIR}/backlog/{STORY_ID}/_pm/uiux-notes.yaml` using Write tool. Needs migration to `kb_write_artifact({ artifact_type: "uiux_notes" })`. Has a `skipped: true` short-circuit path when story has no UI. |
| `knowledge-context-loader.agent.md` | `.claude/agents/knowledge-context-loader.agent.md` | Reference implementation of a fully KB-native writer agent — the target pattern for all 4 PM workers |
| KFMB-1030 (PM Artifact Types and Detail Tables) | `plans/future/platform/kb-first-migration/ready-to-work/KFMB-1030/` | Hard dependency: adds `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed` artifact types and their detail tables to the KB. KFMB-5040 cannot write to these tables until KFMB-1030 is complete |
| KFMB-2040 (KB-Native Story Generation Pipeline) | `plans/future/platform/kb-first-migration/elaboration/KFMB-2040/` | Hard dependency: establishes the KB-native pattern for the story generation workflow and validates the `kb_write_artifact` call approach. KFMB-5040 applies the same pattern to the PM worker agents |
| Orchestrator artifact Zod schemas | `packages/backend/orchestrator/src/artifacts/` | Defines validated `content` payload shapes for implementation artifacts. PM artifact content shapes are defined in the YAML output schemas described in each agent's `## Output` section |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|--------------|
| KFMB-1030 | PM Artifact Types and Detail Tables | Hard dependency: must reach `completed` before KFMB-5040 implementation begins; adds the `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed` artifact types that KFMB-5040 writes to |
| KFMB-2040 | KB-Native Story Generation Pipeline | Hard dependency: must reach `completed` before KFMB-5040 implementation begins; establishes the end-to-end KB-native generation pattern |
| KFMB-5010 | Migrate _implementation/ Writer Agents to kb_write_artifact | Parallel story in Phase 4: same migration pattern applied to `_implementation/` artifacts instead of `_pm/` artifacts. No file overlap — distinct agent sets. Can be worked concurrently. |
| KFMB-5050 | Migrate _pm/ Reader Agents and Remove pm_artifacts Embedding | Direct downstream: depends on KFMB-5040 completing first; the `pm-story-generation-leader` reader update cannot proceed until all 4 PM workers write reliably to KB |

No KFMB stories are currently in-progress per the baseline snapshot.

### Constraints to Respect

- KFMB-5040 MUST NOT begin implementation until KFMB-1030 and KFMB-2040 are both complete.
- The four PM artifact types needed (`test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed`) are added by KFMB-1030 and do NOT exist yet — no workaround is available.
- `pm-uiux-recommendations` has a special `skipped: true` short-circuit when a story has no UI touches. The KB write for this case must also be handled — either write a minimal artifact with `skipped: true` content, or skip the write entirely (to be resolved during elaboration).
- The `pm-story-generation-leader` will continue reading from `_pm/` filesystem during this migration until KFMB-5050 is complete. This creates a transitional period where PM workers must write to BOTH KB (via `kb_write_artifact`) and `_pm/` filesystem (via Write tool) — a dual-write approach — to maintain compatibility with the leader's current reader behavior.
- Protected: All production DB schemas; KB server API surface; existing orchestrator artifact Zod schemas; `pm-story-generation-leader` itself (out of scope — that is KFMB-5050).
- `sizing_warning: false` per story.yaml — 4 agents is within normal sizing range.

---

## Retrieved Context

### Related Endpoints

None — this story touches only agent instruction files (`.claude/agents/`) and the KB MCP tool calls within them. No HTTP API endpoints are modified.

### Related Components

| Component | Path | Role in KFMB-5040 |
|-----------|------|-------------------|
| `pm-story-seed-agent` | `.claude/agents/pm-story-seed-agent.agent.md` | Writer of `STORY-SEED.md` → `story_seed` artifact type. Currently uses Write tool to write markdown file. Migration: call `kb_write_artifact({ artifact_type: "story_seed", content: { ... } })` after writing the markdown file |
| `pm-draft-test-plan` | `.claude/agents/pm-draft-test-plan.agent.md` | Writer of `test-plan.yaml` → `test_plan` artifact type. Migration: call `kb_write_artifact({ artifact_type: "test_plan", content: { ... } })` after writing the YAML file |
| `pm-dev-feasibility-review` | `.claude/agents/pm-dev-feasibility-review.agent.md` | Writer of `dev-feasibility.yaml` → `dev_feasibility` artifact type. Migration: call `kb_write_artifact({ artifact_type: "dev_feasibility", content: { ... } })` after writing the YAML file |
| `pm-uiux-recommendations` | `.claude/agents/pm-uiux-recommendations.agent.md` | Writer of `uiux-notes.yaml` → `uiux_notes` artifact type. Has a `skipped: true` branch when story has no UI. Migration: call `kb_write_artifact({ artifact_type: "uiux_notes", content: { skipped: true, ... } })` in the skip branch as well |
| `pm-story-generation-leader` | `.claude/agents/pm-story-generation-leader.agent.md` | Out of scope for this story. Currently reads `_pm/` outputs to assemble `pm_artifacts` in `story.yaml`. Until KFMB-5050, this leader still reads from filesystem — the dual-write constraint follows from this |
| `knowledge-context-loader.agent.md` | `.claude/agents/knowledge-context-loader.agent.md` | Reference implementation of a fully migrated KB writer agent |
| `_shared/kb-integration.md` | `.claude/agents/_shared/kb-integration.md` | Policy document; Artifact Type Reference table (lines 329-345); write/read canonical call patterns (lines 299-327) |
| `kb_write_artifact` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | Target write tool: `story_id`, `artifact_type`, `phase`, `iteration`, `content` parameters |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `knowledge-context-loader.agent.md` | Study as the reference "done state" for a fully migrated PM writer agent — shows how to call `kb_write_artifact` and handle failures gracefully |
| KFMB-5010 migration pattern | Sister story migrating `_implementation/` writer agents — the agent update approach, frontmatter update pattern, and graceful failure template are directly applicable |
| `_shared/kb-integration.md` write pattern | Canonical call template (lines 299-310) for adding `kb_write_artifact` calls to each agent |
| Graceful failure pattern from KFMB-5010 | KB write failure should log a warning and continue — do not block the PM pipeline phase |
| `pm-story-seed-agent` dual-write precedent | The seed agent already has a Write tool call for the markdown file. The KB write is an additional call appended after the file write — this is the dual-write model for all 4 agents during the KFMB-5040 transition period |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Fully migrated writer agent | `.claude/agents/knowledge-context-loader.agent.md` | Uses `kb_write_artifact` natively; shows the target output section pattern for all 4 PM agents |
| `kb_write_artifact` call schema | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | Authoritative input schema: `story_id`, `artifact_type`, `phase`, `iteration`, `content` — required before updating any agent |
| KB integration policy + Artifact Type Reference | `.claude/agents/_shared/kb-integration.md` (lines 293-390) | Canonical write/read patterns and the Artifact Type Reference table; PM artifact types (`story_seed`, `test_plan`, `dev_feasibility`, `uiux_notes`) will appear here after KFMB-1030 adds them |
| Sister story implementation notes | `plans/future/platform/kb-first-migration/elaboration/KFMB-5010/KFMB-5010.md` | Direct structural model: migration pattern per call site, frontmatter update pattern, graceful failure pattern, atomicity requirement, and subtask decomposition approach are all transferable to KFMB-5040 |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0190]** Frontmatter `kb_tools` list must be updated atomically with call-site migration (category: pattern)
  - *Applies because*: All 4 PM worker agents will need their `kb_tools` frontmatter updated to include `kb_write_artifact` alongside any existing tools. Stale frontmatter creates tool access control mismatches.

- **[KBAR-0190]** Minimal tool footprint principle — only list tools with active call sites in frontmatter (category: architecture)
  - *Applies because*: When adding `kb_write_artifact` to each agent's `kb_tools`, verify there are no pre-existing `kb_write_artifact` call sites that would be double-listed. Per the KB lesson: remove unused tool entries, don't just append.

- **[WKFL-010]** Non-code agent stories: PROOF-based QA via direct file spot-checking (category: testing)
  - *Applies because*: This story modifies 4 `.claude/` agent instruction files — no TypeScript code. QA must verify agent files directly rather than relying on unit tests.

- **[KFMB-5010 pattern]** All target agents must be updated in a single atomic batch to maintain a consistent pipeline state (category: architecture)
  - *Applies because*: A partial migration where some PM workers write to KB and others write only to filesystem could leave inconsistent artifact state. However, since all 4 PM workers also retain filesystem writes (dual-write), partial migration is less catastrophically broken than for KFMB-5010 — but the KB writes should still be treated as a complete batch for KFMB-5050 downstream readiness.

### Blockers to Avoid (from past stories)

- Do not begin implementation before KFMB-1030 is complete — the `test_plan`, `dev_feasibility`, `uiux_notes`, and `story_seed` artifact types do not exist in the KB until KFMB-1030 adds them.
- Do not begin implementation before KFMB-2040 is complete — the KB-native generation pipeline pattern must be validated first.
- Do not remove filesystem `_pm/` writes from the agents during this story — the `pm-story-generation-leader` still reads from `_pm/` until KFMB-5050. This story adds KB writes alongside existing filesystem writes (dual-write transitional model).
- Do not add `file_path` to `kb_write_artifact` calls — this parameter does not exist in the KB tool.
- Do not assume the `skipped: true` branch of `pm-uiux-recommendations` requires no KB write — decide during elaboration whether to write a minimal `{ skipped: true }` artifact or to suppress the KB write entirely for the skipped case.
- Do not remove graceful failure handling — each agent's failure behavior must be updated to handle `kb_write_artifact` failure gracefully (log warning, do not block PM pipeline).
- Do not update `pm-story-generation-leader` — reading from `_pm/` files and embedding in `pm_artifacts` is unchanged by this story; that is KFMB-5050's scope.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration verification must use the real KB DB (port 5433), not mocked MCP responses |
| ADR-006 | E2E Tests Required in Dev Phase | Skip condition applies: no user-facing UI changes. No Playwright tests required. |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not relevant — this story does not touch HTTP endpoints, infrastructure, images, or authentication.

### Patterns to Follow

- Add `kb_write_artifact({ story_id, artifact_type, phase: "analysis", iteration: 0, content: { ... } })` call at the end of each PM worker's output section, immediately after the existing filesystem Write call.
- Keep the existing filesystem Write call in place (dual-write model) until KFMB-5050 removes filesystem reads from `pm-story-generation-leader`.
- Update frontmatter `kb_tools`: add `kb_write_artifact` to each PM worker agent's `kb_tools` list.
- Preserve graceful failure pattern: if `kb_write_artifact` fails, log a warning and continue — do not block PM pipeline execution.
- Consult `_shared/kb-integration.md` for the canonical call signature; consult KFMB-1030 test plan for the expected `content` shape of each PM artifact type.

### Patterns to Avoid

- Do not add `file_path` to `kb_write_artifact` calls — this parameter does not exist in the KB tool.
- Do not remove existing Write tool calls for `_pm/` files — these must remain until KFMB-5050.
- Do not treat `pm-story-generation-leader` as in scope — only the 4 worker agents are modified.
- Do not use raw filesystem Write tool calls as the sole output; each agent must add the `kb_write_artifact` call alongside.
- Do not assume `story_seed` content should be the full STORY-SEED.md markdown text verbatim — the KB artifact `content` field should be structured YAML/JSON matching the schema defined in KFMB-1030's `artifact_story_seeds` detail table (fields: `conflicts_found`, `blocking_conflicts`, `baseline_loaded` and JSONB `data`).

---

## Conflict Analysis

### Conflict: Hard Dependency — KFMB-1030 Not Yet Complete
- **Severity**: warning (non-blocking for seeding; blocking for implementation)
- **Description**: KFMB-5040 writes `test_plan`, `dev_feasibility`, `uiux_notes`, and `story_seed` artifact types. These types and their detail tables (`artifact_test_plans`, `artifact_dev_feasibility`, `artifact_uiux_notes`, `artifact_story_seeds`) are added by KFMB-1030. Until KFMB-1030 is complete, `kb_write_artifact` calls with these types will fail with a validation error. Unlike KFMB-5010, KFMB-5040 CANNOT proceed with implementation at all — even partially — before KFMB-1030 is done, because the required artifact types literally do not exist yet.
- **Resolution Hint**: Gate implementation on KFMB-1030 reaching `completed` status. Review KFMB-1030's test plan YAML (HP-1 through HP-4) to confirm the `content` shape expected for each of the four PM artifact types — this informs how each agent structures the `content` payload in `kb_write_artifact` calls.
- **Source**: story.yaml `depends_on: ["KFMB-1030"]` + KFMB-1030 story analysis

### Conflict: Dual-Write Transitional Model — Leader Compatibility
- **Severity**: warning
- **Description**: The `pm-story-generation-leader` currently reads `_pm/` filesystem outputs to assemble `pm_artifacts` in `story.yaml`. After KFMB-5040, the 4 PM workers write to KB but the leader still reads from filesystem — creating a transitional period where workers must maintain dual output (filesystem + KB). If filesystem writes are removed prematurely (before KFMB-5050), `pm-story-generation-leader` will fail to find `_pm/` files and story generation will break.
- **Resolution Hint**: Explicitly document the dual-write model in the story. Agent implementation must: (1) retain existing Write tool call to `_pm/` file, (2) append `kb_write_artifact` call after the file write. Story non-goals must explicitly state: "Do NOT remove `_pm/` filesystem writes — that is KFMB-5050."
- **Source**: `pm-story-generation-leader` agent file Phase 4 read logic + KFMB-5050 dependency chain

---

## Story Seed

### Title

Migrate _pm/ Writer Agents to kb_write_artifact

### Description

The PM story generation pipeline — covering story seed, test plan, dev feasibility, and UI/UX recommendations — currently persists its PM artifact outputs exclusively to the filesystem under `_pm/` directories via direct Write tool calls. The `pm-story-generation-leader` then reads these files to embed them as `pm_artifacts` in `story.yaml`.

The KB-first migration plan (KFMB) designates `_pm/` filesystem artifacts as deprecated. All PM workflow artifact persistence must also be written to the Knowledge Base via direct `kb_write_artifact` calls. KFMB-1030 adds the four required PM artifact types (`test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed`) and their detail tables; KFMB-2040 validates the KB-native pipeline pattern. This story migrates the 4 PM worker agents to call `kb_write_artifact` alongside their existing filesystem writes.

Note: This story implements a dual-write model — PM workers write to both `_pm/` filesystem AND to KB via `kb_write_artifact`. The `pm-story-generation-leader` continues reading from `_pm/` until KFMB-5050 updates it to read from KB instead. The dual-write model maintains backward compatibility while establishing KB as the authoritative store.

The 4 agents to migrate:
1. **`pm-story-seed-agent`** — writes `story_seed` artifact
2. **`pm-draft-test-plan`** — writes `test_plan` artifact
3. **`pm-dev-feasibility-review`** — writes `dev_feasibility` artifact
4. **`pm-uiux-recommendations`** — writes `uiux_notes` artifact (including `skipped: true` branch)

Once complete, all PM pipeline outputs are written as typed story artifacts in the KB, enabling KFMB-5050 to safely migrate the leader's reader logic away from filesystem reads.

### Initial Acceptance Criteria

- [ ] AC-1: `pm-story-seed-agent` calls `kb_write_artifact` with `artifact_type: "story_seed"` after writing `STORY-SEED.md` to `_pm/`. The existing Write tool call to `_pm/STORY-SEED.md` is retained.
- [ ] AC-2: `pm-draft-test-plan` calls `kb_write_artifact` with `artifact_type: "test_plan"` after writing `test-plan.yaml` to `_pm/`. The existing Write tool call to `_pm/test-plan.yaml` is retained.
- [ ] AC-3: `pm-dev-feasibility-review` calls `kb_write_artifact` with `artifact_type: "dev_feasibility"` after writing `dev-feasibility.yaml` to `_pm/`. The existing Write tool call to `_pm/dev-feasibility.yaml` is retained.
- [ ] AC-4: `pm-uiux-recommendations` calls `kb_write_artifact` with `artifact_type: "uiux_notes"` after writing `uiux-notes.yaml` to `_pm/`, including the `skipped: true` branch. The existing Write tool call to `_pm/uiux-notes.yaml` is retained.
- [ ] AC-5: All 4 agents have `kb_write_artifact` added to their `kb_tools` frontmatter (if not already present).
- [ ] AC-6: Each agent retains graceful failure handling for `kb_write_artifact` failures — a KB write failure logs a warning and allows the PM pipeline phase to continue; it does not block or halt execution.
- [ ] AC-7: The `pm-story-generation-leader` is confirmed unchanged — it still reads `_pm/` filesystem outputs and embeds them as `pm_artifacts` in `story.yaml`.
- [ ] AC-8: `kb_read_artifact({ story_id, artifact_type: "story_seed" })` returns the artifact written by `pm-story-seed-agent` for a test story after agent execution.
- [ ] AC-9: `kb_read_artifact({ story_id, artifact_type: "test_plan" })` returns the artifact written by `pm-draft-test-plan` for a test story after agent execution.
- [ ] AC-10: `kb_read_artifact({ story_id, artifact_type: "dev_feasibility" })` returns the artifact written by `pm-dev-feasibility-review` for a test story after agent execution.
- [ ] AC-11: `kb_read_artifact({ story_id, artifact_type: "uiux_notes" })` returns the artifact written by `pm-uiux-recommendations` for a test story after agent execution.
- [ ] AC-12: `_pm/` filesystem outputs are still created after migration — the dual-write model preserves backward compatibility with `pm-story-generation-leader`.

### Non-Goals

- This story does NOT remove `_pm/` filesystem Write calls from any PM worker agent — dual-write is required for backward compatibility until KFMB-5050.
- This story does NOT update `pm-story-generation-leader` to read from KB — that is KFMB-5050.
- This story does NOT add new artifact types to the KB — those are added by KFMB-1030.
- This story does NOT delete the `_pm/` directory structure or stage directories — those are pre-existing artifacts.
- This story does NOT migrate `_pm/` reader logic in any agent — that is KFMB-5050.
- This story does NOT touch `_implementation/` artifact writers — that is KFMB-5010.
- This story does NOT update `pm-story-risk-predictor` — that agent produces inline YAML embedded directly in story.yaml by the leader, not a separate `_pm/` file.
- This story does NOT update the Artifact Type Reference table in `_shared/kb-integration.md` — that update should occur as part of KFMB-1030 or KFMB-2040 once the PM artifact types are confirmed live.

### Reuse Plan

- **Components**: `kb_write_artifact` (existing MCP tool — new artifact types added by KFMB-1030), `kb_read_artifact` (existing, used for integration verification) — no new tool registration needed.
- **Patterns**: `_shared/kb-integration.md` write pattern (lines 299-310) as the authoritative call template; `knowledge-context-loader.agent.md` as the reference implementation of a fully KB-native writer agent; KFMB-5010 agent update approach as the structural model.
- **Packages**: No TypeScript packages modified — this is a docs-only story targeting 4 `.claude/agents/` files.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is docs-only (4 agent `.md` files, dual-write model). No runnable unit tests apply to agent instruction files. The test plan should focus on:
- **Integration verification (post-prerequisites)**: After KFMB-1030 and KFMB-2040 complete, run a full `/pm-story generate` pipeline against a test story (e.g., TEST-9999) and confirm: (a) `story_seed` artifact appears in KB via `kb_read_artifact` after `pm-story-seed-agent` runs, (b) `test_plan` artifact appears in KB after `pm-draft-test-plan` runs, (c) `dev_feasibility` artifact appears in KB after `pm-dev-feasibility-review` runs, (d) `uiux_notes` artifact appears in KB after `pm-uiux-recommendations` runs.
- **Dual-write regression guard**: Confirm `_pm/` filesystem files are STILL created after migration — `pm-story-generation-leader` must still find them.
- **Graceful failure test**: Simulate KB unavailability during one PM worker phase and verify the worker logs a warning and continues rather than halting, AND that the `_pm/` file is still written.
- **Skip branch test**: Run `pm-uiux-recommendations` against a story with no UI touches; confirm `uiux-notes.yaml` with `skipped: true` is still written to `_pm/`, AND that a `uiux_notes` KB artifact is written (or confirm the KB write is intentionally skipped — this needs an elaboration decision).
- ADR-005 applies: integration verification must use the real KB database (port 5433), not mocked MCP responses.
- ADR-006 skip condition applies: no user-facing UI changes; no Playwright tests required.

### For UI/UX Advisor

No UI/UX concerns — this story modifies only internal agent instruction files used by AI agents. No user-facing interface changes. Output `skipped: true`.

### For Dev Feasibility

- **Scope**: 4 agent files require edits — all markdown, no build/type-check required.
  1. `.claude/agents/pm-story-seed-agent.agent.md` (add 1 `kb_write_artifact` call to Output section)
  2. `.claude/agents/pm-draft-test-plan.agent.md` (add 1 `kb_write_artifact` call to Output section)
  3. `.claude/agents/pm-dev-feasibility-review.agent.md` (add 1 `kb_write_artifact` call to Output section)
  4. `.claude/agents/pm-uiux-recommendations.agent.md` (add 1 `kb_write_artifact` call to both output branches — skipped and non-skipped)
- **Dual-write model**: Unlike KFMB-5010, existing Write tool calls are NOT removed. The `kb_write_artifact` call is appended after each existing write. This reduces migration risk significantly — no regressions in `pm-story-generation-leader` are possible from this story.
- **Key open question for elaboration**: Does `pm-uiux-recommendations` write a `uiux_notes` KB artifact in the `skipped: true` branch? Options: (a) write `{ skipped: true }` to KB so downstream agents can check the artifact and find a definitive answer, (b) skip the KB write entirely when `skipped: true`. Option (a) is preferred for consistency — `kb_read_artifact` callers can check `content.skipped` rather than getting a "not found" error.
- **Content shape for each artifact type**: Must be confirmed against KFMB-1030's detail table schemas before implementation. KFMB-1030 test plan HP-1 through HP-4 specifies the expected fields for each type (e.g., `story_seed` expects `conflicts_found`, `blocking_conflicts`, `baseline_loaded`; `test_plan` expects `strategy`; `dev_feasibility` expects `feasible`, `confidence`, `complexity`; `uiux_notes` expects `has_ui_changes`, `component_count`).
- **Migration pattern per agent** (dual-write model):
  ```
  CURRENT (Write tool only):
  Write({ file_path: "{OUTPUT_DIR}/_pm/test-plan.yaml", content: yamlContent })

  AFTER (dual-write: Write + kb_write_artifact):
  Write({ file_path: "{OUTPUT_DIR}/_pm/test-plan.yaml", content: yamlContent })
  kb_write_artifact({
    story_id: "{STORY_ID}",
    artifact_type: "test_plan",
    phase: "analysis",
    iteration: 0,
    content: { strategy, happy_path_tests, error_cases, edge_cases, ... },
  })
  // If kb_write_artifact fails: log warning "KB write failed for test_plan — continuing PM pipeline" and continue
  ```
- **Frontmatter update pattern per agent**:
  ```yaml
  # ADD to existing kb_tools list (do not replace existing entries):
  kb_tools:
    - kb_write_artifact  # add this
    # ... existing entries remain
  ```
- **Canonical references for subtask decomposition**:
  - ST-1: Read all 4 target agent files + `knowledge-context-loader.agent.md` + `_shared/kb-integration.md` to establish current state and confirm write locations
  - ST-2: Migrate `pm-story-seed-agent` — add `kb_write_artifact` call after Write, update frontmatter
  - ST-3: Migrate `pm-draft-test-plan` — add `kb_write_artifact` call after Write, update frontmatter
  - ST-4: Migrate `pm-dev-feasibility-review` — add `kb_write_artifact` call after Write, update frontmatter
  - ST-5: Migrate `pm-uiux-recommendations` — add `kb_write_artifact` calls to both branches, update frontmatter, resolve `skipped: true` decision
  - ST-6: Verify `pm-story-generation-leader` is unchanged; spot-check all 4 agents for correct `kb_tools` frontmatter and retained filesystem Write calls
