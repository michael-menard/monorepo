---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0190

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates all Phase 4 and Phase 5 agent migration stories (KBAR-0110 through KBAR-0180 were added post-baseline). The baseline's "Active Stories" section says "None currently in-progress" but the index shows KBAR-0110 is in UAT, KBAR-0120 is in UAT, and KBAR-0130 is ready-for-qa. The baseline's documentation of the `kb_write_artifact` tool correctly describes the existing mechanism these QA and fix agents currently use. KBAR-0170 (execute/worker agents) and KBAR-0180 (code review agents) are both "pending" — their seeds and implementations are not yet complete, meaning the exact migration patterns established by those stories are not yet available as reference. KBAR-0190 depends on both.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `qa-verify-setup-leader` (v5.1.0) | `.claude/agents/qa-verify-setup-leader.agent.md` | **Key finding**: Uses `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob` tools. KB tools: `kb_search` only. Does NOT currently write any KB artifacts. Uses skills (/story-move, /story-update, /index-update). Writes `CHECKPOINT.yaml` via direct skill (not artifact_write). |
| `qa-verify-verification-leader` (v4.1.0) | `.claude/agents/qa-verify-verification-leader.agent.md` | **Key finding**: KB tools: `kb_read_artifact`, `kb_write_artifact`. Already uses `kb_write_artifact` to write the `verification` artifact (QA-VERIFY.yaml equivalent). Also uses `kb_read_artifact` to read evidence, context, and review artifacts. Migration target: swap `kb_write_artifact` calls for `artifact_write`. |
| `qa-verify-completion-leader` (v3.3.0) | `.claude/agents/qa-verify-completion-leader.agent.md` | **Key finding**: KB tools: `kb_read_artifact`, `kb_write_artifact`, `kb_add_lesson`, `kb_add_task`, `kb_sync_working_set`, `kb_archive_working_set`, `kb_update_story_status`. Uses `kb_write_artifact` to update the `verification` artifact with the gate decision (PASS/FAIL). Migration target: swap `kb_write_artifact` calls for `artifact_write` for the `verification` artifact gate writes. |
| `dev-fix-fix-leader` (v5.0.0) | `.claude/agents/dev-fix-fix-leader.agent.md` | **Key finding**: KB tools: `kb_read_artifact`, `kb_write_artifact`, `kb_search`, `kb_add_lesson`, `kb_update_story_status`. Uses `kb_write_artifact` to update the `evidence` artifact after fixes and to increment the `review` artifact iteration. Migration target: swap both `kb_write_artifact` calls for `artifact_write`. |
| `artifact_write` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (KBAR-0110, in UAT) | Delivered by KBAR-0110. Dual-write: file first (primary, blocking), KB second (best-effort, graceful failure). Accepted input: `{ story_id, artifact_type, content, file_path, phase?, iteration?, skip_kb? }`. Response: `{ file_path, file_written, kb_artifact_id?, kb_write_skipped?, kb_write_warning? }`. |
| `QaVerifySchema` | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Zod schema defining QA-VERIFY.yaml content structure. Referenced in qa-verify-verification-leader frontmatter (`schema:` field). Content is unchanged by this migration. |
| KB Artifact Type Reference | `.claude/agents/_shared/kb-integration.md` | Defines the canonical mapping: `QA-VERIFY.yaml` → `artifact_type: "verification"`, `phase: "qa_verification"`. `FIX-CONTEXT.yaml` → `artifact_type: "fix_summary"`, `phase: "implementation"`. Both written by agents in this story's scope. |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/schema.ts` | Protected. KB storage backing both `kb_write_artifact` and `artifact_write`. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0110 (`artifact_write` tool) | uat | **Hard dependency**: KBAR-0190 cannot use `artifact_write` until KBAR-0110 is merged and the tool is live. Currently in UAT — close to completion. |
| KBAR-0170 (execute/worker agents) | pending | **Direct dependency**: KBAR-0190 depends on KBAR-0170. KBAR-0170 migrates `dev-execute-leader`, `backend-coder`, `frontend-coder` to `artifact_write` for EVIDENCE and logs. The patterns established by KBAR-0170 for high-frequency writes (BACKEND-LOG, FRONTEND-LOG) should inform how KBAR-0190 handles QA-VERIFY writes. Cannot implement KBAR-0190 until KBAR-0170 is at minimum complete. |
| KBAR-0180 (code review agents) | pending | **Direct dependency**: KBAR-0190 depends on KBAR-0180. KBAR-0180 migrates all `code-review-*.agent.md` files to `artifact_write` for REVIEW artifacts. The REVIEW artifact is read by `dev-fix-fix-leader` via `kb_read_artifact` — that read path is unchanged, but KBAR-0180 must complete before KBAR-0190 is implemented to avoid conflicts on agent file patterns. |
| KBAR-0160 (setup/plan leaders) | ready-to-work | No direct overlap. KBAR-0160 migrates `dev-setup-leader` and `dev-plan-leader`. Those agents write CHECKPOINT, SCOPE, and PLAN artifacts. `dev-fix-fix-leader` reads evidence and review (not checkpoint/scope/plan), so no conflict. |

### Constraints to Respect

- `storyArtifacts` DB schema is protected — do not alter columns or indexes
- `kb_write_artifact` tool contract must not change — it is used by other agents not in scope for this story
- Agent `.agent.md` files are documentation-only changes (no TypeScript code changes in this story)
- Backward compatibility: agents not yet migrated must still function. `artifact_write` must be available and merged before migration happens.
- `FIX-CONTEXT.yaml` link requirement: the story index risk note states "FIX-CONTEXT must link to original failure evidence." The `dev-fix-fix-leader` currently reads evidence and review from KB; after migration the `fix_summary` artifact write via `artifact_write` must include a `file_path` pointing to `_implementation/FIX-CONTEXT.yaml` so it is accessible for downstream agents (dev-documentation-leader, dev-verification-leader) that read it from the filesystem.
- `kb_read_artifact` calls in all four agents are NOT in scope — only the write side migrates
- No barrel files, Zod-first types apply to TypeScript touched (but this story is agent markdown only)

---

## Retrieved Context

### Related Endpoints

This story touches no HTTP endpoints. It modifies agent markdown files (`.claude/agents/*.agent.md`). The MCP tool `artifact_write` (being delivered by KBAR-0110) is the write target; no new HTTP endpoints are introduced by this story.

### Related Components

| File | Role |
|------|------|
| `.claude/agents/qa-verify-setup-leader.agent.md` | In-scope: migrate CHECKPOINT write in the "Update CHECKPOINT.yaml" step |
| `.claude/agents/qa-verify-verification-leader.agent.md` | In-scope: migrate `kb_write_artifact` → `artifact_write` for `verification` artifact (Step 9) |
| `.claude/agents/qa-verify-completion-leader.agent.md` | In-scope: migrate both `kb_write_artifact` calls for `verification` artifact gate update (PASS path step 2, FAIL path step 2) |
| `.claude/agents/dev-fix-fix-leader.agent.md` | In-scope: migrate two `kb_write_artifact` calls — evidence update (step 6) and review iteration increment (step 7) |
| `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Referenced (read only): Zod schema defining `verification` artifact content — content structure unchanged |
| `packages/backend/orchestrator/src/artifacts/evidence.ts` | Referenced (read only): Zod schema for evidence artifact content — content structure unchanged |
| `packages/backend/orchestrator/src/artifacts/review.ts` | Referenced (read only): Zod schema for review artifact — content structure unchanged |
| `.claude/agents/_shared/kb-integration.md` | Reference: canonical artifact type → file mapping table |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Reference: `artifact_write` handler implementation from KBAR-0110 |

### Reuse Candidates

- KBAR-0160 `STORY-SEED.md` and final implementation — use as the template for migration pattern. KBAR-0160 establishes the exact change shape: update `kb_tools` frontmatter, replace `kb_write_artifact` call blocks with `artifact_write`, add `file_path` parameter, document KB-write failure semantics.
- KBAR-0170 final implementation (once landed) — use as pattern for how high-frequency writes (evidence, backend-log) are migrated. KBAR-0190's evidence update in `dev-fix-fix-leader` is the same artifact type as KBAR-0170.
- `artifact_write` tool input schema from KBAR-0110: `{ story_id, artifact_type, content, file_path, phase?, iteration?, skip_kb? }` — verify final shape from landed implementation at elaboration time.
- KB artifact type reference table in `.claude/agents/_shared/kb-integration.md` — use to confirm canonical `artifact_type` and `file_path` values for `verification` (`QA-VERIFY.yaml`) and `fix_summary` (`FIX-CONTEXT.yaml`) artifacts.
- `dev-fix-fix-leader`'s existing `kb_write_artifact` call blocks — use as starting points, wrap with `artifact_write` semantics and add explicit `file_path` arguments.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Completed agent migration example (setup/plan) | `.claude/agents/dev-setup-leader.agent.md` | The KBAR-0160 migration target. After KBAR-0160 lands, this file shows the exact call shape, frontmatter update, and non-negotiable update pattern for `artifact_write` migration. |
| Current kb_write_artifact usage (QA verification) | `.claude/agents/qa-verify-verification-leader.agent.md` | Step 9 shows the `kb_write_artifact` call that is the primary migration target in this story. Lines around Step 9 show current call shape. |
| Current kb_write_artifact usage (fix leader) | `.claude/agents/dev-fix-fix-leader.agent.md` | Steps 6 and 7 show the two `kb_write_artifact` calls to migrate. Represents the dual-artifact-update pattern (evidence + review in the same agent). |
| artifact_write input contract | `plans/future/platform/kb-artifact-migration/UAT/KBAR-0110/KBAR-0110.md` | Defines the landed `artifact_write` tool input shape and dual-write semantics. Use the Architecture Notes dual-write pattern as the reference for documenting the migration in agent files. |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0160 seed]** Inspecting the actual agent files before writing ACs reveals critical drift between the index description and the current agent state. (category: edge-cases)
  - *Applies because*: The KBAR-0190 index entry says "Update qa-verify-*.agent.md and dev-fix-fix-leader to use artifact_write." Inspecting `qa-verify-setup-leader` reveals it does NOT currently use `kb_write_artifact` at all — it writes CHECKPOINT via the `/story-move` skill indirectly and doesn't have a direct KB artifact write step. The actual migration scope for `qa-verify-setup-leader` is narrower than the index implies; Dev Feasibility must confirm whether the setup leader's CHECKPOINT write is in scope or whether only the verification and completion leaders need migration.

- **[KBAR-0160 seed]** File path convention for `artifact_write` must be resolved before implementation begins. (category: constraint)
  - *Applies because*: `artifact_write` accepts an optional `file_path`. For QA-VERIFY artifacts, the canonical path is `{FEATURE_DIR}/UAT/{STORY_ID}/QA-VERIFY.yaml` (already written at that path in existing stories). For FIX-CONTEXT, the path is `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/FIX-CONTEXT.yaml`. KBAR-0190 must specify explicit `file_path` values for each artifact write, matching the canonical locations that downstream agents (dev-documentation-leader, dev-verification-leader) read from the filesystem.

- **[KBAR-0080]** Story descriptions and index entries can drift from actual implementation state. (category: edge-cases)
  - *Applies because*: The index entry lists "qa-verify-*.agent.md and dev-fix-fix-leader." There are three qa-verify agents (setup, verification, completion). Only verification and completion currently write KB artifacts. The setup leader may require only a minor CHECKPOINT update via `artifact_write` if at all. Dev Feasibility must enumerate the exact write calls in each of the four agents before committing to ACs.

- **[WKFL retro]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard. (category: workflow)
  - *Applies because*: `artifact_write`'s dual-write design (file write first, KB write best-effort with graceful failure) means agents must document that a KB write warning is not a blocking failure. This is especially important for QA flows where a KB write failure must not prevent the QA verdict from being recorded.

- **[KBAR-0110 Architecture Notes]** FIX-CONTEXT.yaml must be written to the filesystem so downstream agents can read it. (category: constraint)
  - *Applies because*: `dev-documentation-leader` reads `_implementation/FIX-CONTEXT.yaml` (confirmed in grep results). `dev-verification-leader` reads `_implementation/FIX-CONTEXT.yaml`. Currently `dev-fix-fix-leader` writes this artifact only to KB via `kb_write_artifact` (as `fix_summary`). After migration to `artifact_write`, the `file_path` must be set to `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/FIX-CONTEXT.yaml` so file-system reads by downstream agents continue to work. This is the "FIX-CONTEXT must link to original failure evidence" risk note from the index.

### Blockers to Avoid (from past stories)

- Do not start KBAR-0190 implementation until KBAR-0170 (execute/worker agents) AND KBAR-0180 (code review agents) are both complete — those are the declared dependencies
- Do not assume `artifact_write` input schema is identical to `kb_write_artifact` — verify the actual implemented tool signature from KBAR-0110 at implementation time
- Do not remove `kb_read_artifact` calls from any agent — only the *write* calls are in scope
- Do not break downstream agents that read FIX-CONTEXT.yaml from the filesystem (dev-documentation-leader, dev-verification-leader) — the `file_path` argument to `artifact_write` must be set explicitly
- Do not omit the `file_path` argument for QA-VERIFY — the canonical path (`UAT/{STORY_ID}/QA-VERIFY.yaml`) must be computed and passed explicitly so the file is written to the expected location
- Do not change the logical content structure of `verification`, `evidence`, `review`, or `fix_summary` artifacts — only the write mechanism changes

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration or UAT validation of updated agents must use real MCP server. Unit-level validation of agent markdown changes is limited to human review. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI impact. `frontend_impacted: false`. |

### Patterns to Follow

- Agent frontmatter `kb_tools` list must be updated to include `artifact_write` in addition to or replacing `kb_write_artifact` for write operations. `kb_read_artifact` remains as-is.
- Document the dual-write semantics clearly in each agent: file write is primary (blocking), KB write is secondary (best-effort; failure produces `kb_write_warning`, not an error).
- For `qa-verify-verification-leader` and `qa-verify-completion-leader`: the `verification` artifact write must include `file_path` pointing to the canonical QA-VERIFY location (`{FEATURE_DIR}/UAT/{STORY_ID}/QA-VERIFY.yaml`).
- For `dev-fix-fix-leader`: the `fix_summary` artifact write must include `file_path` pointing to `_implementation/FIX-CONTEXT.yaml`, and the evidence artifact write should include `file_path` pointing to `_implementation/EVIDENCE.yaml`. This ensures file-system consumers continue to work.
- Keep `kb_read_artifact` calls unchanged in all four agents — only writes are migrating.

### Patterns to Avoid

- Do not change the logical content structure of any artifact — only the write call site and `file_path` argument change
- Do not replace `kb_read_artifact` with file-system reads — the read path stays DB-first
- Do not introduce TypeScript interfaces in any code changes that may accompany this story
- Do not omit `file_path` and rely on canonical path computation inside `artifact_write` — pass explicit paths in all cases (consistent with KBAR-0160 recommendation, safer during transition)

---

## Conflict Analysis

### Conflict: Dependency Chain Not Yet Complete (warning)

- **Severity**: warning (non-blocking)
- **Description**: KBAR-0190 depends on KBAR-0170 and KBAR-0180, both of which are currently `pending` with no seeds or implementations started. The dependency chain is KBAR-0110 (uat) → KBAR-0120/0130 (uat/ready-for-qa) → KBAR-0140 (pending) → KBAR-0150 (pending) → KBAR-0160 (ready-to-work) → KBAR-0170 (pending) → KBAR-0190, and KBAR-0180 (pending) → KBAR-0190. This story is genuinely blocked by upstream work and should not be elaborated or scheduled until KBAR-0170 and KBAR-0180 are at minimum complete.
- **Resolution Hint**: Treat this seed as planning-only context. At elaboration time, verify KBAR-0170 and KBAR-0180 are merged; review their final patterns before finalizing ACs for KBAR-0190.

### Conflict: qa-verify-setup-leader Has No Direct kb_write_artifact Calls (warning)

- **Severity**: warning (non-blocking)
- **Description**: The story index says to update "qa-verify-*.agent.md" (all three) to use `artifact_write`. However, inspecting `qa-verify-setup-leader.agent.md` reveals that this agent's KB tools are `kb_search` only — it does NOT currently write any KB artifacts. Its "Update CHECKPOINT.yaml" step writes CHECKPOINT via local file or through skill-managed state, not via `kb_write_artifact`. The migration scope for `qa-verify-setup-leader` may be limited to updating its `kb_tools` frontmatter to add `artifact_write` for potential future CHECKPOINT writes during QA setup, or it may be out of scope entirely.
- **Resolution Hint**: Dev Feasibility should determine: (A) Should `qa-verify-setup-leader`'s CHECKPOINT.yaml update step be migrated to use `artifact_write` (with appropriate `file_path`), or (B) is `qa-verify-setup-leader` not a migration target for this story and only `qa-verify-verification-leader` and `qa-verify-completion-leader` are in scope alongside `dev-fix-fix-leader`? Given the CHECKPOINT write is already handled by KBAR-0160 (dev-setup-leader), the simpler answer is (B) — `qa-verify-setup-leader` may not need migration in this story.

---

## Story Seed

### Title

Migrate `qa-verify-*` and `dev-fix-fix-leader` Agents to Use `artifact_write` for Dual-Write Artifact Persistence

### Description

**Context**: The KBAR epic's Phase 4 delivers the `artifact_write` MCP tool (KBAR-0110, now in UAT) — a dual-write mechanism that simultaneously writes a YAML artifact to the filesystem and indexes it in the KB for semantic search. Phase 5 (KBAR-0160 through KBAR-0220) migrates all workflow agents to use `artifact_write` instead of the current KB-only `kb_write_artifact` calls. This story (KBAR-0190) is the fourth migration in Phase 5, targeting the QA verification and fix agents.

The affected agents currently use `kb_write_artifact` to write the `verification` artifact (QA-VERIFY.yaml) and — in `dev-fix-fix-leader` — the updated `evidence` and `review` artifacts. These artifacts exist only in the KB database; they are not accessible via the file system without a KB query. This limits observability during QA cycles and prevents file-system consumers (dev-documentation-leader reads `FIX-CONTEXT.yaml`; dev-verification-leader reads `FIX-CONTEXT.yaml`) from receiving the artifact without KB access.

**Problem**:
1. `qa-verify-verification-leader` writes the `verification` artifact (QA-VERIFY) via `kb_write_artifact` — KB-only, no file written.
2. `qa-verify-completion-leader` updates the `verification` artifact with the gate decision (PASS/FAIL) via `kb_write_artifact` — KB-only, no file written.
3. `dev-fix-fix-leader` writes the updated `evidence` artifact and increments the `review` artifact via `kb_write_artifact` — KB-only, no file written.
4. The `fix_summary` artifact (FIX-CONTEXT.yaml) written by `dev-setup-leader` in fix mode is read by `dev-documentation-leader` and `dev-verification-leader` from the filesystem. After KBAR-0160 migrates `dev-setup-leader` to `artifact_write`, the `file_path` must be set correctly so downstream filesystem reads continue to work — this story must preserve the same constraint for the fix leader's updates.

**Proposed solution**: Update the three QA agents and `dev-fix-fix-leader` to replace `kb_write_artifact` write calls with `artifact_write` calls (once KBAR-0170 and KBAR-0180 land). Pass explicit `file_path` arguments pointing to canonical locations. Update agent frontmatter `kb_tools` sections. Document graceful failure semantics for all four agents.

### Initial Acceptance Criteria

- [ ] AC-1: `qa-verify-verification-leader.agent.md` Step 9 ("Write Verification Artifact to KB") uses `artifact_write` instead of `kb_write_artifact` for the `verification` artifact write, with `artifact_type: "verification"`, `phase: "qa_verification"`, `iteration: 0`, and `file_path` set to the canonical `{FEATURE_DIR}/UAT/{STORY_ID}/QA-VERIFY.yaml` path.
- [ ] AC-2: `qa-verify-completion-leader.agent.md` PASS path Step 2 ("Update verification artifact in KB with gate decision") uses `artifact_write` instead of `kb_write_artifact`, with the same `artifact_type: "verification"`, `phase: "qa_verification"` and an updated `file_path` for the UAT location.
- [ ] AC-3: `qa-verify-completion-leader.agent.md` FAIL path Step 2 ("Update verification artifact in KB with gate decision") uses `artifact_write` instead of `kb_write_artifact`, preserving the FAIL gate content and the `file_path` for the UAT location.
- [ ] AC-4: `dev-fix-fix-leader.agent.md` Step 6 ("Update evidence artifact in KB") uses `artifact_write` instead of `kb_write_artifact` for the `evidence` artifact update, with `file_path` set to `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/EVIDENCE.yaml`.
- [ ] AC-5: `dev-fix-fix-leader.agent.md` Step 7 ("Increment review iteration in KB") uses `artifact_write` instead of `kb_write_artifact` for the `review` artifact update, with `file_path` set to `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/REVIEW.yaml`.
- [ ] AC-6: All four agents' frontmatter `kb_tools` sections are updated to include `artifact_write` (replacing or supplementing `kb_write_artifact` for the write operations listed above).
- [ ] AC-7: All four agents document the graceful failure behavior: if KB write fails, `artifact_write` returns `file_written: true` and a `kb_write_warning` — the QA/fix phase proceeds rather than blocks. Specifically, a QA verdict that has been written to the file system must not be rolled back due to a KB write warning.
- [ ] AC-8: `kb_read_artifact` calls in all four agents are unchanged — only the write side is migrated.
- [ ] AC-9: Dev Feasibility confirms whether `qa-verify-setup-leader.agent.md` requires any migration (its CHECKPOINT.yaml update step). If in scope: the step uses `artifact_write` with `file_path` pointing to `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/CHECKPOINT.yaml`. If not in scope: explicitly documented as a non-goal.

### Non-Goals

- Migrating `dev-execute-leader`, `backend-coder`, `frontend-coder` to use `artifact_write` — that is KBAR-0170
- Migrating code-review agents to use `artifact_write` — that is KBAR-0180
- Migrating `knowledge-context-loader` to use `artifact_search` — that is KBAR-0200
- Implementing the `artifact_write` tool itself — that is KBAR-0110 (Phase 4, already in UAT)
- Changing the content structure of `verification`, `evidence`, `review`, or `fix_summary` artifacts
- Changing `kb_read_artifact` usage in any of the four agents
- Touching any TypeScript source files in this story (agent markdown files only)
- Adding automated tests for agent behavior (agents are markdown; behavior validated via E2E workflow runs)
- Removing `kb_write_artifact` from the KB MCP server — it remains and is used by other agents

### Reuse Plan

- **Pattern**: Use KBAR-0160's final implementation as the migration template — update `kb_tools` frontmatter, replace `kb_write_artifact` call blocks with `artifact_write`, add `file_path` parameter, document KB-write failure semantics
- **Schema references**: `packages/backend/orchestrator/src/artifacts/qa-verify.ts`, `evidence.ts`, `review.ts` — content fields unchanged
- **Tool contract**: `artifact_write` input shape from KBAR-0110: `{ story_id, artifact_type, content, file_path, skip_kb?, phase?, iteration? }` — verify final shape from landed KBAR-0110 before writing ACs in detail
- **File path convention**: Canonical paths from `_shared/kb-integration.md` artifact type table:
  - `verification` → `{FEATURE_DIR}/UAT/{STORY_ID}/QA-VERIFY.yaml`
  - `evidence` → `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/EVIDENCE.yaml`
  - `review` → `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/REVIEW.yaml`
  - `fix_summary` → `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/FIX-CONTEXT.yaml`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story modifies agent markdown files, not TypeScript source. There are no unit tests to write for agent markdown changes. Validation strategy:
- Manual review: compare before/after diffs of all four agent files against ACs
- Functional validation: run a test story through the full `qa-verify-story` and `dev-fix-story` workflows after changes land, verify `QA-VERIFY.yaml`, `EVIDENCE.yaml`, `REVIEW.yaml`, and `FIX-CONTEXT.yaml` are written to the expected filesystem locations
- Integration assertion: confirm the written YAML files are also retrievable via `kb_read_artifact` (both paths written successfully)
- KB write failure path: not testable via unit tests — document expected graceful behavior only
- Downstream read validation: confirm that `dev-documentation-leader` and `dev-verification-leader` can still read `FIX-CONTEXT.yaml` from the filesystem after the fix leader's migration

### For UI/UX Advisor

Not applicable — this story is agent markdown updates with no UI impact. `frontend_impacted: false`.

### For Dev Feasibility

- **Dependency gate is real**: Do not elaborate or schedule KBAR-0190 for implementation until KBAR-0170 (execute/worker agents) AND KBAR-0180 (code review agents) are both complete. Review their final migration patterns as the most current reference.
- **Scope confirmation**: Verify the exact `artifact_write` tool input schema from the landed KBAR-0110 implementation. Confirm `file_path` is a supported parameter and that parent directories are created automatically by `artifact_write` (via `fs/promises.mkdir({ recursive: true })`).
- **qa-verify-setup-leader scope question**: Determine whether `qa-verify-setup-leader`'s CHECKPOINT.yaml update step is in scope for this story. The agent currently has no `kb_write_artifact` calls; if KBAR-0160 covers the CHECKPOINT write for the initial setup phase, then `qa-verify-setup-leader` may need only a frontmatter `kb_tools` addition — or may be entirely out of scope. Resolve this definitively in Dev Feasibility and document as AC-9 resolution.
- **FIX-CONTEXT file path criticality**: The `file_path` for the `fix_summary` artifact in `dev-fix-fix-leader` is a hard requirement, not optional. `dev-documentation-leader` and `dev-verification-leader` both read `FIX-CONTEXT.yaml` from the filesystem. This must be confirmed by reading those agents at elaboration time.
- **Canonical file paths**: The QA-VERIFY canonical location is `{FEATURE_DIR}/UAT/{STORY_ID}/QA-VERIFY.yaml` (not under `_implementation/`) because QA artifacts land in the UAT directory. Confirm this path matches existing QA-VERIFY.yaml locations (check any KBAR-0110 or other UAT directory for the pattern).
- **Subtask decomposition**:
  - ST-1: Read KBAR-0110 and KBAR-0160 final implementations, confirm `artifact_write` input schema, canonical file path conventions, and frontmatter update pattern
  - ST-2: Read `dev-documentation-leader.agent.md` and `dev-verification-leader.agent.md` to confirm FIX-CONTEXT.yaml read paths (establish ground truth for `file_path` requirement in `dev-fix-fix-leader`)
  - ST-3: Update `qa-verify-verification-leader.agent.md` — migrate Step 9 `kb_write_artifact` → `artifact_write`, update frontmatter, document graceful failure (AC-1, AC-6, AC-7, AC-8)
  - ST-4: Update `qa-verify-completion-leader.agent.md` — migrate both PASS and FAIL path `kb_write_artifact` calls → `artifact_write`, update frontmatter (AC-2, AC-3, AC-6, AC-7, AC-8)
  - ST-5: Update `dev-fix-fix-leader.agent.md` — migrate Steps 6 and 7 `kb_write_artifact` calls → `artifact_write` with explicit `file_path`, update frontmatter (AC-4, AC-5, AC-6, AC-7, AC-8)
  - ST-6: Resolve AC-9 scope question for `qa-verify-setup-leader.agent.md` and apply accordingly; human review of all diffs against ACs
  - canonical references for subtask decomposition:
    - `.claude/agents/qa-verify-verification-leader.agent.md` (current Step 9 `kb_write_artifact` call shape)
    - `.claude/agents/dev-fix-fix-leader.agent.md` (current Steps 6–7 `kb_write_artifact` call shapes)
    - `.claude/agents/dev-setup-leader.agent.md` (post-KBAR-0160 state — migration template)
    - `plans/future/platform/kb-artifact-migration/UAT/KBAR-0110/KBAR-0110.md` (Architecture Notes section — dual-write pattern)
