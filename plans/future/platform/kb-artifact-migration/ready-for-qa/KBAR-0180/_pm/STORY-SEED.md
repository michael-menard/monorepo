---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0180

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 4 and Phase 5 work (KBAR-0110 through KBAR-0170). The `artifact_write` tool described in KBAR-0110 is now in UAT. The `review-aggregate-leader` agent currently uses `kb_write_artifact` for REVIEW artifacts — a fact not captured in the baseline but verified by direct file inspection. The baseline correctly documents the KB `storyArtifacts` table as protected infrastructure.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `review-aggregate-leader` agent (v2.1.0) | `.claude/agents/review-aggregate-leader.agent.md` | **Primary migration target**: Already uses `kb_write_artifact` for REVIEW artifact writes. Has `kb_tools: [kb_write_artifact]` in frontmatter. This is the aggregator that writes the final REVIEW.yaml to KB after all code review workers report. |
| `code-review-security` agent (v4.0.0) | `.claude/agents/code-review-security.agent.md` | Uses `kb_search`, `kb_add_lesson`, `kb_add_decision` — but does NOT write REVIEW artifacts. It returns YAML output only. Not a direct migration target. |
| `code-review-syntax` agent (v3.0.0) | `.claude/agents/code-review-syntax.agent.md` | Returns YAML output only. No direct artifact writes. Not a migration target. |
| `code-review-react` agent (v1.0.0) | `.claude/agents/code-review-react.agent.md` | Returns YAML output only. No artifact writes. Not a migration target. |
| `code-review-typescript` agent (v1.0.0) | `.claude/agents/code-review-typescript.agent.md` | Returns YAML output only. No artifact writes. Not a migration target. |
| `code-review-style-compliance` agent (v3.0.0) | `.claude/agents/code-review-style-compliance.agent.md` | Returns YAML output only. No artifact writes. Not a migration target. |
| `code-review-reusability` agent (v1.0.0) | `.claude/agents/code-review-reusability.agent.md` | Returns YAML output only. No artifact writes. Not a migration target. |
| `code-review-accessibility` agent (v1.0.0) | `.claude/agents/code-review-accessibility.agent.md` | Returns YAML output only. No artifact writes. Not a migration target. |
| `code-review-build` agent (v2.0.0) | `.claude/agents/code-review-build.agent.md` | Returns YAML output only. `permission_level: test-run`. No artifact writes. Not a migration target. |
| `code-review-lint` agent (v5.0.0) | `.claude/agents/code-review-lint.agent.md` | Returns YAML output only. `permission_level: test-run`. No artifact writes. Not a migration target. |
| `code-review-typecheck` agent (v3.0.0) | `.claude/agents/code-review-typecheck.agent.md` | Returns YAML output only. `permission_level: test-run`. No artifact writes. Not a migration target. |
| `artifact_write` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` (KBAR-0110, in UAT) | New dual-write tool being delivered by KBAR-0110. Writes YAML to filesystem AND indexes in KB. This is the migration target tool for KBAR-0180. |
| REVIEW artifact Zod schema | `packages/backend/orchestrator/src/artifacts/review.ts` | Referenced in frontmatter of all code-review-*.agent.md files. Defines the REVIEW artifact content shape. Protected — do not alter. |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/` | KB storage for all artifact types including REVIEW. Protected infrastructure. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0110 (`artifact_write` tool) | in-UAT | **Hard dependency**: KBAR-0180 must use the `artifact_write` tool delivered by KBAR-0110. KBAR-0180 depends on KBAR-0160, which depends on KBAR-0150, which depends on KBAR-0110. |
| KBAR-0160 (Update Setup & Plan Leaders) | ready-to-work | **Direct sibling dependency**: KBAR-0180 depends on KBAR-0160 being complete. The migration pattern established by KBAR-0160 (explicit `file_path` approach) should be consistent across KBAR-0180. |
| KBAR-0170 (Update Execute & Worker Agents) | pending | **Parallel sibling**: Both KBAR-0170 and KBAR-0180 depend on KBAR-0160. They are parallel Phase 5 stories targeting different agent files. No file overlap — `review-aggregate-leader` is exclusive to KBAR-0180 scope. |

### Constraints to Respect

- `storyArtifacts` DB schema is protected — do not alter
- `kb_write_artifact` tool contract must not change — it is used by any non-migrated agents
- `review-aggregate-leader.agent.md` and `code-review-*.agent.md` files are documentation-only changes (no TypeScript code changes)
- Backward compatibility: any agent not yet migrated must still work while migration is in progress
- The `artifact_write` tool must be available (KBAR-0110 merged) before KBAR-0180 is worked
- Do not modify the REVIEW artifact content schema — only the write mechanism changes
- The 10 code review worker agents (`code-review-syntax`, `code-review-security`, `code-review-react`, `code-review-typescript`, `code-review-style-compliance`, `code-review-reusability`, `code-review-accessibility`, `code-review-build`, `code-review-lint`, `code-review-typecheck`) return YAML output only — they do not write artifacts to KB themselves. Only `review-aggregate-leader` writes the REVIEW artifact.

---

## Retrieved Context

### Related Endpoints

This story touches no HTTP endpoints. It modifies agent markdown files (`.claude/agents/*.agent.md`). The MCP tool `artifact_write` (delivered by KBAR-0110) is the new target; no new endpoints are introduced.

### Related Components

| File | Role |
|------|------|
| `.claude/agents/review-aggregate-leader.agent.md` | **Primary migration target** — migrate `kb_write_artifact` call (REVIEW artifact write) to `artifact_write`. Update `kb_tools` in frontmatter. |
| `packages/backend/orchestrator/src/artifacts/review.ts` | Zod schema defining REVIEW artifact content — referenced in all code-review agent frontmatter. Content structure is unchanged. |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Where `artifact_write` handler is registered (post-KBAR-0110) |

### Reuse Candidates

- `review-aggregate-leader.agent.md` existing `kb_write_artifact` call block — use as starting point, swap to `artifact_write` semantics with explicit `file_path`
- KBAR-0160 `dev-setup-leader.agent.md` migration — use as the canonical before/after pattern for agent `kb_write_artifact` → `artifact_write` migration
- KBAR-0110 `artifact_write` tool input contract: `{ story_id, artifact_type, content, file_path?, skip_kb?, phase?, iteration? }` — verify from landed implementation
- KBAR-0160 file path convention: `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/{ARTIFACT_TYPE}.yaml` — apply consistently to `REVIEW.yaml` paths

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Current kb_write_artifact usage (review aggregator) | `.claude/agents/review-aggregate-leader.agent.md` | Shows the exact `kb_write_artifact` call shape in `review-aggregate-leader` that needs migration to `artifact_write`. The call in Step 5 ("Write Review Artifact to KB") is the primary migration target. |
| Sibling migration pattern (setup/plan leaders) | `.claude/agents/dev-setup-leader.agent.md` | Post-KBAR-0160, will show the canonical `artifact_write` call shape with explicit `file_path`, updated frontmatter, and dual-write failure semantics. Use as the direct template for KBAR-0180. |
| artifact_write tool contract | `plans/future/platform/kb-artifact-migration/UAT/KBAR-0110/KBAR-0110.md` | Defines the implemented `artifact_write` input shape: `{ story_id, artifact_type, content, file_path, skip_kb?, phase?, iteration? }`. Also defines the response shape: `{ file_path, file_written, kb_artifact_id?, kb_write_skipped?, kb_write_warning? }`. |
| Code review agent with KB integration (most complex) | `.claude/agents/code-review-security.agent.md` | Shows a code review worker that uses `kb_search`, `kb_add_lesson`, `kb_add_decision` — but does NOT write REVIEW artifacts. Demonstrates that the KB tool additions in the worker agents are NOT part of this story's scope (they are reads and knowledge writes, not REVIEW artifact writes). |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0160]** Inspect actual agent files before writing ACs — the story index may describe what to migrate but the agent itself shows exactly which call to update. (category: edge-cases)
  - *Applies because*: The KBAR-0180 index says "update all code-review-*.agent.md files" but file inspection reveals that only `review-aggregate-leader` writes REVIEW artifacts. The 10 worker agents return YAML output to the orchestrator context — they do not call `kb_write_artifact`. Dev Feasibility must confirm the scope is limited to `review-aggregate-leader` only.

- **[KBAR-0160 feasibility]** Canonical file path computation rule must be defined before migration. (category: constraint)
  - *Applies because*: `artifact_write` accepts an optional `file_path`. KBAR-0180 must specify the `file_path` for REVIEW artifacts. REVIEW artifacts are written per-iteration (an iteration number is passed to the aggregator). The path convention must handle the iteration parameter: e.g., `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/REVIEW-{iteration}.yaml` or `REVIEW.yaml` for first iteration. Dev Feasibility should confirm with KBAR-0160's landed path convention.

- **[WKFL retro]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard. (category: workflow)
  - *Applies because*: `artifact_write`'s dual-write design (file write first, KB write best-effort with graceful failure) handles KB unavailability. The REVIEW artifact is high-value for searchability (pattern analysis of past findings) — but KB write failure must not block the code review workflow. Agents must document this fallback behavior.

- **[KBAR-0080]** Story index entries can drift from implementation reality. (category: edge-cases)
  - *Applies because*: The index says "update all code-review-*.agent.md files" implying all 10+ files need changes. Actual inspection shows only `review-aggregate-leader` writes artifacts — the workers output YAML to context only. Story scope is therefore 1 file, not 10+.

### Blockers to Avoid (from past stories)

- Do not start KBAR-0180 implementation until KBAR-0160 (Update Setup & Plan Leaders) is complete — that is the declared dependency
- Do not assume `artifact_write` input schema is identical to `kb_write_artifact` — verify the actual implemented tool signature from the landed KBAR-0110 at implementation time
- Do not remove `kb_search`, `kb_add_lesson`, or `kb_add_decision` calls from `code-review-security` — only REVIEW artifact *write* calls in `review-aggregate-leader` are in scope for this story
- Do not modify the REVIEW artifact content schema in `packages/backend/orchestrator/src/artifacts/review.ts`
- Do not assume all 10 code review worker agents need changes — they do not write to KB directly. Only `review-aggregate-leader` does.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration or UAT validation of updated agents must use real MCP server. Unit-level validation of agent markdown changes is limited to human review. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI impact. `frontend_impacted: false`. |

### Patterns to Follow

- Agent frontmatter `kb_tools` list in `review-aggregate-leader` must be updated to replace `kb_write_artifact` with `artifact_write` for the REVIEW write operation
- Follow KBAR-0160's established migration pattern: explicit `file_path` argument pointing to canonical `_implementation/REVIEW.yaml` path (or iteration-namespaced variant)
- Document the dual-write semantics clearly: file write is primary (blocking), KB write is secondary (best-effort, failure produces warning not error)
- REVIEW artifacts are searchable in KB — the searchability goal from the story index is achieved by `artifact_write`'s KB write leg (which indexes the REVIEW content for `artifact_search` queries)
- For code-review workers that already use KB tools (`code-review-security` uses `kb_search`, `kb_add_lesson`, `kb_add_decision`): no changes needed — those are reads and knowledge writes, not REVIEW artifact writes

### Patterns to Avoid

- Do not change the logical content structure of REVIEW artifacts — only the write mechanism changes
- Do not replace `kb_search` or `kb_add_lesson` in `code-review-security` — those are out of scope
- Do not introduce TypeScript interfaces in any code changes (but this story is agent markdown only)
- Do not attempt to change the 10 worker agents' output format — they return YAML to orchestrator context, not to KB

---

## Conflict Analysis

### Conflict: Story Index Says "All code-review-*.agent.md" But Scope Is Actually One File (warning)

- **Severity**: warning (non-blocking)
- **Description**: The story index entry says "Update all code-review-*.agent.md files to use artifact_write for REVIEW artifacts." File inspection reveals that only `review-aggregate-leader.agent.md` calls `kb_write_artifact` — and it is the only file that writes a REVIEW artifact. The 10 individual code review worker agents (`code-review-syntax`, `code-review-security`, etc.) return YAML output to the orchestrator context only; they do not call `kb_write_artifact` for REVIEW artifacts. One of them (`code-review-security`) calls `kb_add_lesson` and `kb_add_decision` post-review, but those are knowledge base operations unrelated to REVIEW artifact persistence.
- **Resolution Hint**: Dev Feasibility should confirm scope by running `grep -r "kb_write_artifact" .claude/agents/code-review*` to verify the exact set of files that call `kb_write_artifact`. Expected result: only `review-aggregate-leader.agent.md` (it calls `kb_write_artifact` in its "Write Review Artifact to KB" step). Story scope is then 1 file with clear boundaries.

### Conflict: REVIEW Iteration Number in File Path Convention Is Undefined (warning)

- **Severity**: warning (non-blocking)
- **Description**: The `review-aggregate-leader` receives an `iteration` parameter (current review iteration number) and passes it to `kb_write_artifact`. With `artifact_write`, an explicit `file_path` must be provided (per KBAR-0160's recommended Option A). REVIEW artifacts differ from CHECKPOINT/SCOPE/PLAN in that multiple iterations can exist (iteration 1, 2, 3 as fixes are applied between review cycles). The canonical file path convention for REVIEW artifacts is not yet defined — specifically whether to use `REVIEW.yaml` (overwriting each iteration) or `REVIEW-{N}.yaml` (preserving each iteration).
- **Resolution Hint**: Dev Feasibility should choose one of: (A) `_implementation/REVIEW.yaml` — simple, overwritten each iteration (consistent with CHECKPOINT.yaml overwrite pattern from KBAR-0160); (B) `_implementation/REVIEW-{iteration}.yaml` — preserves history across review cycles. Option A is simpler and consistent with other artifacts. Option B is more useful for pattern analysis (comparing across review iterations). The story risk note "Review artifacts must be searchable in KB for pattern analysis" suggests Option B may be preferred. Decide before writing ACs.

---

## Story Seed

### Title

Migrate `review-aggregate-leader` to Use `artifact_write` for Dual-Write REVIEW Artifact Persistence

### Description

**Context**: The KBAR epic's Phase 5 migrates all workflow agents from `kb_write_artifact` (KB-only writes) to `artifact_write` (dual-write: file system + KB). KBAR-0160 handles setup/plan leaders; KBAR-0170 handles execute/worker agents; KBAR-0180 handles code review agents. The code review agent family consists of 10 worker agents (`code-review-syntax`, `code-review-security`, etc.) and one aggregator (`review-aggregate-leader`). Only the aggregator writes REVIEW artifacts to the KB — the workers return YAML output to the orchestrator context only.

**Problem**: REVIEW artifacts written by `review-aggregate-leader` exist only in the KB database. They are not written to the file system (`_implementation/REVIEW.yaml`). This limits observability (humans cannot inspect past review findings without KB queries) and prevents REVIEW artifacts from being discovered via file-system tooling. Critically, REVIEW artifacts are high-value for pattern analysis — the story explicitly calls out that "Review artifacts must be searchable in KB" — but the KB write is currently the only write. By migrating to `artifact_write`, the REVIEW is written to both the file system (human-readable) AND indexed in the KB (for semantic search via `artifact_search`).

**Proposed solution**: Update `review-aggregate-leader.agent.md` to replace the `kb_write_artifact` call (in the "Write Review Artifact to KB" step) with `artifact_write`. Pass explicit `file_path` argument pointing to the canonical `_implementation/REVIEW.yaml` (or `_implementation/REVIEW-{iteration}.yaml` — see conflict analysis). Update frontmatter `kb_tools` to list `artifact_write`. Document the graceful failure semantics: if KB write fails, `artifact_write` returns `file_written: true` and `kb_write_warning` — the code review workflow proceeds, not blocks. The 10 code review worker agents do not require changes.

### Initial Acceptance Criteria

- [ ] AC-1: `review-aggregate-leader.agent.md` REVIEW write step (Step 5, "Write Review Artifact to KB") uses `artifact_write` tool call with `artifact_type: "review"`, `phase: "code_review"`, `iteration: {iteration}`, and `file_path` set to the canonical `_implementation/REVIEW.yaml` (or `REVIEW-{iteration}.yaml` — see conflict resolution) path.
- [ ] AC-2: `review-aggregate-leader.agent.md` frontmatter `kb_tools` section is updated to replace `kb_write_artifact` with `artifact_write`.
- [ ] AC-3: `review-aggregate-leader.agent.md` documents the graceful failure behavior: if KB write fails, `artifact_write` returns `file_written: true` and a `kb_write_warning` — the code review result is preserved on the file system even if KB indexing fails.
- [ ] AC-4: The REVIEW artifact content structure is unchanged — only the write mechanism changes from `kb_write_artifact` to `artifact_write`.
- [ ] AC-5: The 10 code review worker agents (`code-review-syntax`, `code-review-security`, `code-review-react`, `code-review-typescript`, `code-review-style-compliance`, `code-review-reusability`, `code-review-accessibility`, `code-review-build`, `code-review-lint`, `code-review-typecheck`) are NOT modified — they do not write REVIEW artifacts and are out of scope for this story.
- [ ] AC-6: The `kb_search`, `kb_add_lesson`, and `kb_add_decision` calls in `code-review-security` are unchanged — only REVIEW artifact write calls are in scope.
- [ ] AC-7: REVIEW artifacts written via `artifact_write` are searchable in the KB (via `artifact_search`) — this is the pattern analysis goal from the story risk note, satisfied by the KB write leg of `artifact_write`.

### Non-Goals

- Migrating the 10 code review worker agents — none of them write REVIEW artifacts; no changes needed
- Migrating `dev-execute-leader`, `backend-coder`, `frontend-coder` — that is KBAR-0170
- Migrating QA agents (`qa-verify-*.agent.md`, `dev-fix-fix-leader`) — that is KBAR-0190
- Implementing the `artifact_write` tool itself — that is KBAR-0110 (Phase 4 dependency, in UAT)
- Changing the content structure of REVIEW artifacts (in `packages/backend/orchestrator/src/artifacts/review.ts`)
- Removing `kb_search`, `kb_add_lesson`, or `kb_add_decision` from `code-review-security` — those are separate KB operations, not REVIEW artifact writes
- Removing `kb_write_artifact` from the KB MCP server — it remains and may be used by other agents
- Adding tests for agent behavior (agent markdown is tested via E2E workflow runs, not unit tests)
- Touching any TypeScript source files (agent markdown files only)

### Reuse Plan

- **Pattern**: Use KBAR-0160's migrated `dev-setup-leader.agent.md` as the direct template — same `artifact_write` call shape, same explicit `file_path` convention, same dual-write failure semantics documentation
- **Schema reference**: `packages/backend/orchestrator/src/artifacts/review.ts` — content fields are unchanged; the `iteration` field already present in the REVIEW structure maps directly to the `iteration` parameter in `artifact_write`
- **Tool contract**: `artifact_write` input from KBAR-0110: `{ story_id, artifact_type, content, file_path, skip_kb?, phase?, iteration? }` — verify final shape from landed KBAR-0110 before writing implementation
- **File path convention**: Follow KBAR-0160's established convention; resolve the iteration naming question (Option A: `REVIEW.yaml` overwrite; Option B: `REVIEW-{iteration}.yaml` per iteration) in Dev Feasibility

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story modifies one agent markdown file (`review-aggregate-leader.agent.md`), not TypeScript source. There are no unit tests to write for agent markdown changes. Validation strategy:
- Manual review: compare before/after diff of `review-aggregate-leader.agent.md` against ACs
- Functional validation: run a test story through the full `/dev-code-review` workflow after changes land; verify `_implementation/REVIEW.yaml` (or `REVIEW-{N}.yaml`) is written to the filesystem
- Integration assertion: confirm the written REVIEW YAML is also retrievable via `kb_read_artifact` (or `artifact_search`) confirming dual-write succeeded
- KB write failure path: not testable via unit tests — document expected graceful behavior only
- The 10 worker agents require zero testing (no changes)

### For UI/UX Advisor

Not applicable — this story is agent markdown updates with no UI impact. `frontend_impacted: false`.

### For Dev Feasibility

- **Dependency gate is real**: Do not elaborate or schedule KBAR-0180 for implementation until KBAR-0160 (Update Setup & Plan Leaders) is complete. The `artifact_write` tool must be fully implemented, tested (KBAR-0110 in UAT currently), merged, and the KBAR-0160 migration pattern must be established as the canonical reference.
- **Scope confirmation — CRITICAL**: Verify the actual set of files that call `kb_write_artifact` by running: `grep -rn "kb_write_artifact" .claude/agents/code-review*.agent.md .claude/agents/review-aggregate*.agent.md`. Expected: only `review-aggregate-leader.agent.md`. If any worker agents also call it, add them to scope.
- **Iteration naming decision**: Resolve before writing ACs — Option A (`REVIEW.yaml`, overwritten each iteration) vs Option B (`REVIEW-{N}.yaml`, one file per iteration). The story's pattern analysis goal favors Option B; simplicity favors Option A. Check what KBAR-0160 did for any iterable artifacts (CHECKPOINT has iterations too) as the precedent.
- **kb_tools frontmatter**: Confirm whether `review-aggregate-leader` needs `artifact_write` in addition to (or replacing) `kb_write_artifact`. If `kb_write_artifact` is no longer called, remove it from `kb_tools`.
- **`code-review-security` scope clarification**: That agent uses `kb_search`, `kb_add_lesson`, `kb_add_decision` — all KB operations but NOT REVIEW artifact writes. Confirm these are out of scope (they should be — they're for knowledge capture, not REVIEW persistence).
- **Subtask decomposition**:
  - ST-1: Read KBAR-0110 final implementation and KBAR-0160 landed agent files; confirm `artifact_write` input schema, file-path convention, and iteration naming resolution
  - ST-2: Update `review-aggregate-leader.agent.md` — migrate REVIEW write call, update frontmatter `kb_tools`, document graceful failure semantics (AC-1 through AC-4, AC-7)
  - ST-3: Human review of diff against ACs; functional test via a canary story code review run
