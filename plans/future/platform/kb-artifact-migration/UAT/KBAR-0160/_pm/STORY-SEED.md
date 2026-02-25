---
generated: "2026-02-24"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0160

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 4 agent migration work (KBAR-0110 through KBAR-0150) — those stories were added post-baseline. The baseline's "Active Stories" section says "None currently in-progress" but the index shows KBAR-0110 through KBAR-0130 are now actively in-progress or ready-to-work. The baseline still correctly documents the `kb_write_artifact` tool in the knowledge-base server, which is the current mechanism these agents use.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `dev-setup-leader` agent (v5.1.0) | `.claude/agents/dev-setup-leader.agent.md` | **Key finding**: Already uses `kb_write_artifact` for CHECKPOINT and SCOPE writes. Has a "MUST write artifacts to KB via `kb_write_artifact` (not to files)" non-negotiable and "Do NOT create `_implementation/` directories" rule. |
| `dev-plan-leader` agent (v1.2.0) | `.claude/agents/dev-plan-leader.agent.md` | **Key finding**: Already uses `kb_write_artifact` for CHECKPOINT (update) and PLAN writes. Reads via `kb_read_artifact`. All reads/writes are KB-only. |
| `artifact_write` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (pending KBAR-0110) | New dual-write tool being built in KBAR-0110. Writes YAML to filesystem AND indexes in KB. This is the migration target for KBAR-0160. |
| `kb_write_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Current tool used by dev-setup-leader and dev-plan-leader. DB-only write, no file-system write. |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts` | Protected. KB storage backing both `kb_write_artifact` and the upcoming `artifact_write` tool. |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/checkpoint.ts`, `scope.ts`, `plan.ts` | Zod schemas that define the CHECKPOINT, SCOPE, PLAN content structures. Referenced in both agent file frontmatter. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0110 (`artifact_write` tool) | in-progress | **Hard dependency**: KBAR-0160 cannot use `artifact_write` until KBAR-0110 is implemented and merged. KBAR-0160 depends on KBAR-0150, which depends on KBAR-0140, which depends on KBAR-0120/0130, which depend on KBAR-0110. |
| KBAR-0120 (artifact tool unit tests) | in-progress | No direct overlap. Informs test patterns. |
| KBAR-0130 (`artifact_search` tool) | in-progress | No direct overlap with agent files. |
| KBAR-0100 (Story Tools Integration Tests) | ready-to-work | Modifies `mcp-integration.test.ts` and `tool-schemas.ts`. No conflict with agent markdown files. |

### Constraints to Respect

- `storyArtifacts` DB schema is protected — do not alter columns or indexes
- `kb_write_artifact` tool contract must not change — it is used by other agents not in scope for this story
- Agent `.agent.md` files are documentation-only changes (no TypeScript code changes in this story)
- Backward compatibility: during transition, any agent not yet migrated must still work. The `artifact_write` tool must be available before migration happens.
- `dev-setup-leader` and `dev-plan-leader` are high-frequency agents (invoked for every story implementation) — regressions have broad impact
- No barrel files, Zod-first types apply to any TypeScript touched by this story (but this story is agent markdown, not TypeScript)

---

## Retrieved Context

### Related Endpoints

This story touches no HTTP endpoints. It modifies agent markdown files (`.claude/agents/*.agent.md`). The MCP tool `artifact_write` (being delivered by KBAR-0110) is the new target; no new endpoints are introduced by this story.

### Related Components

| File | Role |
|------|------|
| `.claude/agents/dev-setup-leader.agent.md` | Primary target — migrate kb_write_artifact calls (CHECKPOINT, SCOPE) to artifact_write |
| `.claude/agents/dev-plan-leader.agent.md` | Primary target — migrate kb_write_artifact call (PLAN + CHECKPOINT update) to artifact_write |
| `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | Zod schema defining CHECKPOINT content — referenced in agent frontmatter |
| `packages/backend/orchestrator/src/artifacts/scope.ts` | Zod schema defining SCOPE content — referenced in agent frontmatter |
| `packages/backend/orchestrator/src/artifacts/plan.ts` | Zod schema defining PLAN content — referenced in agent frontmatter |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Where `artifact_write` handler will be registered (post-KBAR-0110) |

### Reuse Candidates

- `dev-setup-leader.agent.md` existing `kb_write_artifact` call blocks — use as the starting point, wrap with `artifact_write` semantics
- `dev-plan-leader.agent.md` existing `kb_write_artifact` call blocks — same pattern
- `artifact_write` tool definition from KBAR-0110 (once landed) — use its input schema directly in agent call documentation
- KBAR-0110 `KBAR-0110.md` story — defines `artifact_write` input shape: `{ story_id, artifact_type, content, file_path?, skip_kb?, phase?, iteration? }`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Current kb_write_artifact usage (setup) | `.claude/agents/dev-setup-leader.agent.md` | Shows the exact call shape that needs migration to `artifact_write`. Lines covering CHECKPOINT and SCOPE writes are the update targets. |
| Current kb_write_artifact usage (planning) | `.claude/agents/dev-plan-leader.agent.md` | Shows CHECKPOINT update and PLAN write call shapes. Maps to `artifact_write` canonical path computation. |
| artifact_write input contract | `plans/future/platform/kb-artifact-migration/in-progress/KBAR-0110/KBAR-0110.md` | Defines the `artifact_write` tool's accepted input: `story_id`, `artifact_type`, `content`, optional `file_path`, `skip_kb`, `phase`, `iteration`. |
| Existing agent migration example (execute) | `.claude/agents/dev-execute-leader.agent.md` | Already migrated to KB-only reads via `kb_read_artifact`. Shows the post-migration pattern for agents operating on KB-native artifacts. |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0080]** Story descriptions and index entries can drift from actual implementation state. (category: edge-cases)
  - *Applies because*: The KBAR-0160 index entry says to migrate agents "to use artifact_write for CHECKPOINT, SCOPE, PLAN." But inspecting both agents reveals they already write to KB via `kb_write_artifact` — the migration is from KB-only to KB+file dual-write via the new `artifact_write` tool. Dev Feasibility must confirm the exact migration delta before writing ACs.

- **[KBAR-0120]** Mock must target specific sub-module path, not broad barrel import. (category: edge-cases)
  - *Applies because*: Not directly applicable (this story is agent markdown, no tests). But if UAT validation of the updated agents requires integration tests, the test mock isolation lesson applies.

- **[WKFL retro]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard. (category: workflow)
  - *Applies because*: `artifact_write`'s dual-write design (file write first, KB write best-effort with graceful failure) is designed exactly for this. The agent instructions must document the fallback behavior: if KB write fails, the file was still written successfully. Agents must not treat a KB write warning as a failure.

- **[KBAR-0110 feasibility]** Canonical file path computation rule must be defined before migration. (category: constraint)
  - *Applies because*: `artifact_write` accepts an optional `file_path` argument. KBAR-0160 must specify whether the agents should compute and pass explicit `file_path` arguments (preserving the old `_implementation/` paths) or rely on canonical path computation inside the tool. This is the key design question for this story.

### Blockers to Avoid (from past stories)

- Do not start KBAR-0160 implementation until KBAR-0150 (Artifact Tools Integration Tests) is complete — that is the declared dependency
- Do not assume `artifact_write` input schema is identical to `kb_write_artifact` — verify the actual implemented tool signature from KBAR-0110 at implementation time
- Do not remove `kb_read_artifact` calls from the agents — only the *write* calls are in scope for migration. Reads remain as-is.
- Do not break backward compatibility for stories already in-progress (agents reading from KB expect KB-written artifacts to still be present)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration or UAT validation of updated agents must use real MCP server. Unit-level validation of agent markdown changes is limited to human review. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI impact. `frontend_impacted: false`. |

### Patterns to Follow

- Agent frontmatter `kb_tools` list must be updated to include `artifact_write` in addition to or replacing `kb_write_artifact` for the write operations
- Agent frontmatter `tools` list should remain unchanged (Write/Read tools are not introduced by this migration — `artifact_write` is an MCP tool, not a direct Claude tool)
- Document the dual-write semantics clearly: file write is primary (blocking), KB write is secondary (best-effort, failure produces warning not error)
- Keep the `kb_read_artifact` pattern unchanged — only the write side is migrating

### Patterns to Avoid

- Do not change the logical content structure of CHECKPOINT, SCOPE, or PLAN artifacts — only the write mechanism changes
- Do not replace `kb_read_artifact` with file-system reads — the read path stays DB-first
- Do not introduce TypeScript interfaces in any code changes that may accompany this story

---

## Conflict Analysis

### Conflict: Implementation Ahead of Story in One Direction, Dependency Gate in Other (warning)

- **Severity**: warning (non-blocking)
- **Description**: The `dev-setup-leader` and `dev-plan-leader` have already been partially migrated — they write to KB via `kb_write_artifact` and explicitly prohibit file writes. The KBAR-0160 migration target (`artifact_write`) doesn't yet exist (it's being built in KBAR-0110, which is in-progress). The story index says "Update ... to use artifact_write" but the full dependency chain (KBAR-0110 → KBAR-0120/0130 → KBAR-0140 → KBAR-0150 → KBAR-0160) means this story cannot be worked until at least mid-Phase 4. This is expected and correct.
- **Resolution Hint**: Story scope is well-defined: swap `kb_write_artifact` calls with `artifact_write` calls and update `file_path` arguments for CHECKPOINT, SCOPE, and PLAN artifacts. Dev Feasibility must confirm the exact `artifact_write` input schema from the final KBAR-0110 implementation before writing subtasks.

### Conflict: File Path Convention Undefined (warning)

- **Severity**: warning (non-blocking)
- **Description**: The `artifact_write` tool accepts an optional `file_path`. The current agents do NOT create `_implementation/` directories (this is a non-negotiable in `dev-setup-leader`). The migration must define: should the agents pass an explicit `file_path` to write to `_implementation/CHECKPOINT.yaml`, or should the canonical path computation inside `artifact_write` determine the path? If the agents pass no `file_path`, the behavior depends on `artifact_write`'s internal default — which is not yet implemented. This creates a risk of undefined behavior at KBAR-0160 implementation time.
- **Resolution Hint**: Dev Feasibility should resolve: (A) agents explicitly pass `file_path: "{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/CHECKPOINT.yaml"` etc., or (B) agents omit `file_path` and rely on canonical path computation in `artifact_write`. Option A gives agents explicit control and visibility; Option B requires the canonical path convention to be stabilized in KBAR-0110. Given KBAR-0110 is still in-progress, **Option A is recommended** as the safer choice.

---

## Story Seed

### Title

Migrate `dev-setup-leader` and `dev-plan-leader` to Use `artifact_write` for Dual-Write Artifact Persistence

### Description

**Context**: The KBAR epic's Phase 4 delivers the `artifact_write` MCP tool (KBAR-0110) — a dual-write mechanism that simultaneously writes a YAML artifact to the filesystem and indexes it in the KB for semantic search. Phase 5 (this story and its siblings KBAR-0170 through KBAR-0220) migrates all workflow agents to use `artifact_write` instead of the current KB-only `kb_write_artifact` calls.

`dev-setup-leader` (v5.1.0) currently writes CHECKPOINT and SCOPE artifacts via `kb_write_artifact` (KB-only, no file write). `dev-plan-leader` (v1.2.0) similarly writes PLAN and updates CHECKPOINT via `kb_write_artifact`. Both agents have non-negotiables prohibiting direct file writes. After this migration, both agents will use `artifact_write`, which writes the file to `_implementation/` AND indexes it in the KB — providing file-system persistence for human inspection alongside KB-searchability.

**Problem**: Artifacts written by `dev-setup-leader` and `dev-plan-leader` exist only in the KB database. They are not accessible via file system (no `_implementation/CHECKPOINT.yaml` or `_implementation/PLAN.yaml`). This limits observability (humans can't inspect artifacts without a KB query) and prevents the deferred-write fallback pattern from functioning correctly for these artifacts.

**Proposed solution**: Update both agent files to replace `kb_write_artifact` calls with `artifact_write` calls (once delivered by KBAR-0110 and validated by KBAR-0150). Pass explicit `file_path` arguments pointing to the canonical `_implementation/` paths. Update agent frontmatter `kb_tools` to list `artifact_write`. Remove the "Do NOT create `_implementation/` directories" constraint from `dev-setup-leader` (since `artifact_write` will now create the directory as part of the file write). Document the graceful failure semantics: if KB write fails, `file_written: true` and `kb_write_warning` is returned — this is not a blocking failure.

### Initial Acceptance Criteria

- [ ] AC-1: `dev-setup-leader.agent.md` CHECKPOINT write (implement mode, step 4) uses `artifact_write` tool call with `artifact_type: "checkpoint"`, `phase: "setup"`, `iteration: 0`, and `file_path` set to the canonical `_implementation/CHECKPOINT.yaml` path.
- [ ] AC-2: `dev-setup-leader.agent.md` SCOPE write (implement mode, step 5) uses `artifact_write` tool call with `artifact_type: "scope"`, `phase: "setup"`, `iteration: 0`, and `file_path` set to the canonical `_implementation/SCOPE.yaml` path.
- [ ] AC-3: `dev-setup-leader.agent.md` CHECKPOINT update (fix mode, step 3) uses `artifact_write` with the updated checkpoint content and incremented iteration.
- [ ] AC-4: `dev-plan-leader.agent.md` CHECKPOINT update (step 7) uses `artifact_write` with `current_phase: "plan"`.
- [ ] AC-5: `dev-plan-leader.agent.md` PLAN write (step 8) uses `artifact_write` with `artifact_type: "plan"`, `phase: "planning"`, `iteration: 0`, and `file_path` set to the canonical `_implementation/PLAN.yaml` path.
- [ ] AC-6: Both agents' frontmatter `kb_tools` sections are updated to replace or supplement `kb_write_artifact` with `artifact_write` for the write operations.
- [ ] AC-7: `dev-setup-leader.agent.md` non-negotiable "Do NOT create `_implementation/` directories" is removed (or updated to clarify that `artifact_write` creates it). Non-negotiable "MUST write artifacts via `artifact_write`" replaces the old `kb_write_artifact` constraint.
- [ ] AC-8: Both agents document the graceful failure behavior: if KB write fails, `artifact_write` returns `file_written: true` and a `kb_write_warning` — the setup/planning phase proceeds, not blocks.
- [ ] AC-9: `kb_read_artifact` calls in both agents are unchanged — only the write side is migrated.

### Non-Goals

- Migrating `dev-execute-leader`, `backend-coder`, `frontend-coder` to use `artifact_write` — that is KBAR-0170
- Migrating code review agents — that is KBAR-0180
- Migrating QA agents — that is KBAR-0190
- Implementing the `artifact_write` tool itself — that is KBAR-0110 (Phase 4 dependency)
- Changing the content structure of CHECKPOINT, SCOPE, or PLAN artifacts
- Changing `kb_read_artifact` usage in either agent
- Touching any TypeScript source files in this story (agent markdown files only)
- Adding tests for agent behavior (agents are markdown; behavior is tested via E2E workflow runs, not unit tests)
- Removing `kb_write_artifact` from the KB MCP server — it remains and is used by other agents

### Reuse Plan

- **Pattern**: Use existing `kb_write_artifact` call blocks in `dev-setup-leader` and `dev-plan-leader` as the template — update tool name to `artifact_write`, add `file_path` parameter, document KB-write failure semantics
- **Schema reference**: `packages/backend/orchestrator/src/artifacts/checkpoint.ts`, `scope.ts`, `plan.ts` — content fields are unchanged
- **Tool contract**: `artifact_write` input shape from KBAR-0110: `{ story_id, artifact_type, content, file_path, skip_kb?, phase?, iteration? }` — verify final shape from landed KBAR-0110 before writing ACs in detail
- **File path convention**: `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/{ARTIFACT_TYPE}.yaml`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story modifies agent markdown files, not TypeScript source. There are no unit tests to write for agent markdown changes. Validation strategy:
- Manual review: compare before/after diffs of both agent files against ACs
- Functional validation: run a test story through the full `dev-implement-story` workflow after changes land, verify `_implementation/CHECKPOINT.yaml`, `_implementation/SCOPE.yaml`, and `_implementation/PLAN.yaml` are written to the filesystem
- Integration assertion: confirm the written YAML files are also retrievable via `kb_read_artifact` (both paths written)
- KB write failure path: not testable via unit tests — document expected graceful behavior only

### For UI/UX Advisor

Not applicable — this story is agent markdown updates with no UI impact. `frontend_impacted: false`.

### For Dev Feasibility

- **Dependency gate is real**: Do not elaborate or schedule KBAR-0160 for implementation until KBAR-0150 (Artifact Tools Integration Tests) is complete. The `artifact_write` tool must be fully implemented, tested, and merged.
- **Scope confirmation**: Verify the exact `artifact_write` tool input schema from the landed KBAR-0110 implementation. The story assumes `file_path` is an explicit parameter — if KBAR-0110 uses a canonical path computation internally, ACs may need adjustment.
- **File path resolution**: Decide between explicit `file_path` (recommended) vs. canonical internal computation. Explicit is preferred for agent clarity and observability.
- **Non-negotiable removal**: `dev-setup-leader` currently has "Do NOT create `_implementation/` directories" — this must be updated since `artifact_write` will create the directory. Verify the tool creates parent directories (or agents must pre-create them).
- **KB read path unchanged**: Both agents use `kb_read_artifact` to read CHECKPOINT and SCOPE at the start of subsequent phases. After migration, the artifact is in both DB and filesystem. The read path via `kb_read_artifact` continues to work unchanged.
- **Subtask decomposition**:
  - ST-1: Read KBAR-0110 final implementation, confirm `artifact_write` input schema and file-path behavior
  - ST-2: Update `dev-setup-leader.agent.md` — migrate CHECKPOINT and SCOPE write calls, update frontmatter, update non-negotiables (AC-1, AC-2, AC-3, AC-6, AC-7, AC-8)
  - ST-3: Update `dev-plan-leader.agent.md` — migrate CHECKPOINT update and PLAN write calls, update frontmatter (AC-4, AC-5, AC-6, AC-8)
  - ST-4: Human review of both diffs against ACs, functional test via a canary story run
