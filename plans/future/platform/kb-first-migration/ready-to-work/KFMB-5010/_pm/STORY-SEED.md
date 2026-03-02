---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: KFMB-5010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline does not describe the `artifact_write` dual-write tool in detail; the tool's exact API was inferred from agent files. The baseline records the KB `storyArtifacts` jump table pattern as existing, which is accurate and relevant. No KFMB stories are in-progress in the baseline snapshot (plan was created 2026-02-26).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `storyArtifacts` jump table + 13 detail tables | `apps/api/knowledge-base/src/db/schema.ts`, `migrations/015_artifact_type_tables.sql` | The KB storage backend that will receive all migrated artifact writes |
| `kb_write_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | The target write API that replaces `artifact_write` filesystem dual-write |
| `kb_read_artifact` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2408) | The target read API; reader agents (KFMB-5020) depend on these writes being present |
| `artifact_write` dual-write tool | Used in 7 leader agents (see below) | Transitional tool: writes file to `_implementation/` and also calls KB as secondary best-effort. This story replaces these calls with pure `kb_write_artifact` |
| `_implementation/` artifact files | `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/*.yaml` | Currently produced by 7 agents; these filesystem artifacts are deprecated per `_shared/kb-integration.md` |
| KB integration shared doc | `.claude/agents/_shared/kb-integration.md` | Authoritative policy document: declares `_implementation/` files deprecated and mandates `kb_write_artifact` / `kb_read_artifact` as the standard |
| Orchestrator artifact Zod schemas | `packages/backend/orchestrator/src/artifacts/` | Validates CHECKPOINT, SCOPE, PLAN, EVIDENCE, REVIEW, PROOF artifact content structure; these schemas define the `content` payload shape for `kb_write_artifact` calls |
| KFMB-1030 (PM Artifact Types) | `plans/future/platform/kb-first-migration/ready-to-work/KFMB-1030/` | Hard dependency: adds `test_plan`, `dev_feasibility`, `uiux_notes`, `story_seed` artifact types — the types KFMB-5010 does NOT need, but KFMB-5040 does. KFMB-5010 only uses pre-existing types (`checkpoint`, `scope`, `plan`, `evidence`, `review`, `verification`, `fix_summary`) |
| KFMB-2040 (KB-Native Story Generation Pipeline) | `plans/future/platform/kb-first-migration/elaboration/KFMB-2040/` | Hard dependency: delivers the KB-native story generation pipeline — this story follows the same pattern for the implementation pipeline |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|--------------|
| KFMB-1030 | PM Artifact Types and Detail Tables | Hard dependency: must reach `completed` before KFMB-5010 implementation begins; however all artifact types needed by KFMB-5010 (`checkpoint`, `scope`, `plan`, `evidence`, `review`, `verification`, `fix_summary`) already exist in the KB — no new types needed |
| KFMB-2040 | KB-Native Story Generation Pipeline | Hard dependency: must reach `completed` before KFMB-5010 implementation begins; establishes the KB-native pattern that KFMB-5010 extends to the implementation pipeline |
| KFMB-5040 | Migrate _pm/ Writer Agents to kb_write_artifact | Parallel story in Phase 4: same migration pattern applied to `_pm/` artifacts instead of `_implementation/` artifacts. No file overlap — distinct agent set |
| KFMB-5020 | Migrate _implementation/ Reader Agents | Direct downstream: depends on KFMB-5010 completing first; reader agents cannot migrate to `kb_read_artifact` until writer agents write to KB reliably |

No KFMB stories are currently in-progress per the baseline snapshot.

### Constraints to Respect

- KFMB-5010 MUST NOT begin implementation until KFMB-1030 and KFMB-2040 are both complete.
- All 7 artifact types needed by this story (`checkpoint`, `scope`, `plan`, `evidence`, `review`, `verification`, `fix_summary`) already exist in `ARTIFACT_TYPES` and have detail tables — no new DB work needed.
- `artifact_write` is a transitional dual-write tool; after this migration, agents use `kb_write_artifact` directly. The `artifact_write` tool in `kb_tools` frontmatter must be replaced with `kb_write_artifact`.
- Reader agents (KFMB-5020) depend on these writes being present in KB — the switch from filesystem to KB must be complete and not leave partial writes.
- `_implementation/` log files (BACKEND-LOG.md, FRONTEND-LOG.md) are explicitly excluded from KB artifact writes per KBAR-0170 (AC-6, Option b). This story does NOT migrate log files.
- Protected: All production DB schemas; KB server API surface; existing orchestrator artifact Zod schemas.

---

## Retrieved Context

### Related Endpoints

None — this story touches only agent instruction files (`.claude/agents/`) and the KB MCP tool calls within them. No HTTP API endpoints are modified.

### Related Components

| Component | Path | Role in KFMB-5010 |
|-----------|------|-------------------|
| `dev-setup-leader` | `.claude/agents/dev-setup-leader.agent.md` | Writes `checkpoint` (setup phase), `scope`, and `fix_summary` via `artifact_write` — 3 write calls to migrate |
| `dev-plan-leader` | `.claude/agents/dev-plan-leader.agent.md` | Writes `checkpoint` (planning phase) and `plan` via `artifact_write` — 2 write calls to migrate |
| `dev-execute-leader` | `.claude/agents/dev-execute-leader.agent.md` | Writes `evidence` and `checkpoint` (implementation phase) via `artifact_write` — 2 write calls to migrate |
| `dev-fix-fix-leader` | `.claude/agents/dev-fix-fix-leader.agent.md` | Writes `evidence` and `review` via `artifact_write` — 2 write calls to migrate |
| `review-aggregate-leader` | `.claude/agents/review-aggregate-leader.agent.md` | Writes `review` via `artifact_write` — 1 write call to migrate |
| `qa-verify-verification-leader` | `.claude/agents/qa-verify-verification-leader.agent.md` | Writes `verification` via `artifact_write` — 1 write call to migrate |
| `qa-verify-completion-leader` | `.claude/agents/qa-verify-completion-leader.agent.md` | Writes `verification` via `artifact_write` (PASS + FAIL branches) — 2 write calls to migrate |
| `kb_write_artifact` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | Target write tool; accepts `story_id`, `artifact_type`, `phase`, `iteration`, `content` |
| `_shared/kb-integration.md` | `.claude/agents/_shared/kb-integration.md` | Policy document with canonical write/read patterns and the Artifact Type Reference table |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Defines `content` payload shape for each artifact type; must be consulted when constructing `kb_write_artifact` call `content` fields |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `_shared/kb-integration.md` write pattern | Direct template for replacing `artifact_write` calls with `kb_write_artifact` calls; includes the canonical call signature |
| `knowledge-context-loader.agent.md` | Already uses `kb_write_artifact` natively (no `artifact_write`); study as the pattern for how a fully migrated agent looks |
| KFMB-2040 migration pattern | Sister story migrating the PM pipeline; use its agent update approach as the structural model for implementation pipeline migration |
| Graceful failure pattern | All 7 agents currently have graceful failure notes on `artifact_write`; replace with equivalent `kb_write_artifact` failure handling — KB write failure should not block pipeline execution |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Fully migrated writer agent | `.claude/agents/knowledge-context-loader.agent.md` | Uses `kb_write_artifact` natively with no `artifact_write` fallback; shows the target state for all 7 agents |
| `kb_write_artifact` call schema | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) | Authoritative input schema: `story_id`, `artifact_type`, `phase`, `iteration`, `content` — required before updating any agent |
| KB integration policy | `.claude/agents/_shared/kb-integration.md` (lines 293-390) | Defines the Artifact Type Reference table mapping deprecated file names to `artifact_type` strings, phases, and writing agents |
| Orchestrator checkpoint schema | `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | Defines `content` payload structure for `checkpoint` artifact type — one of the most-written types in this story |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0190]** Frontmatter `kb_tools` list must be updated atomically with call-site migration (category: pattern)
  - *Applies because*: All 7 agents have `kb_tools` frontmatter listing `artifact_write`. When calls are replaced with `kb_write_artifact`, the frontmatter must be updated in the same edit. Stale frontmatter entries create confusion and tool access control mismatches.

- **[KBAR-0200]** Agent+TypeScript node pairs must always be updated together (category: architecture)
  - *Applies because*: The `artifact_write` dual-write tool is backed by a TypeScript implementation that also writes to the filesystem as primary. Once agents stop calling `artifact_write` and use `kb_write_artifact` directly, the TypeScript dual-write mechanism becomes a dead code path. If any orchestration script reads `_implementation/` files directly (e.g., `workflow-retro.md`, `story-status.md`, `checkpoint.md`), those must be updated as part of KFMB-5020/5030 — document this dependency clearly.

- **[WKFL-010]** Non-code agent stories: PROOF-based QA via direct file spot-checking (category: testing)
  - *Applies because*: This story modifies 7 `.claude/` agent instruction files — no TypeScript code. QA must verify the agent files directly rather than relying on unit tests.

- **[KBAR-0170]** Log files (BACKEND-LOG.md, FRONTEND-LOG.md) must NOT use `artifact_write` — direct Write tool calls only (category: architecture)
  - *Applies because*: `dev-implement-backend-coder` and `dev-implement-frontend-coder` have `artifact_write` in their frontmatter but only for log file context. These agents do NOT write YAML artifact files and are out of scope for KFMB-5010. Confirm exclusion in scope documentation.

### Blockers to Avoid (from past stories)

- Do not begin implementation before KFMB-1030 and KFMB-2040 are both complete — the KB infrastructure and pipeline patterns they deliver are prerequisites.
- Do not remove `artifact_write` calls without simultaneously adding `kb_write_artifact` calls — a partial migration leaves writer agents with no persistence path.
- Do not assume `artifact_write` and `kb_write_artifact` have the same call signature — `artifact_write` wraps filesystem + KB; `kb_write_artifact` is KB-only. The `file_path` parameter present in `artifact_write` calls does not exist in `kb_write_artifact`.
- Do not migrate the `dev-implement-backend-coder` or `dev-implement-frontend-coder` — these agents have `artifact_write` in frontmatter only for log-writing context (KBAR-0170 exemption); they are out of scope.
- Do not remove graceful failure handling — each agent's failure behavior must be updated to handle `kb_write_artifact` failure gracefully (log warning, do not block pipeline).
- Do not assume reader agents (KFMB-5020) can be worked in parallel — they must wait for KFMB-5010 to complete so KB writes are guaranteed to exist before reads are attempted.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration verification must use the real KB DB (port 5433), not mocked MCP responses |
| ADR-006 | E2E Tests Required in Dev Phase | Skip condition applies: `frontend_impacted: false`; no UI-facing ACs. No Playwright tests required. |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not relevant — this story does not touch HTTP API paths, infrastructure, images, or authentication.

### Patterns to Follow

- Replace `artifact_write({ artifact_type, phase, iteration, content, file_path })` with `kb_write_artifact({ story_id, artifact_type, phase, iteration, content })` — drop the `file_path` parameter.
- Update frontmatter `kb_tools`: remove `artifact_write`, add `kb_write_artifact` (if not already present).
- Preserve graceful failure pattern: if `kb_write_artifact` fails, log a warning and continue — do not block pipeline execution.
- Consult `_shared/kb-integration.md` Artifact Type Reference table for the canonical mapping of deprecated file names to `artifact_type` strings and phases.

### Patterns to Avoid

- Do not add `file_path` to `kb_write_artifact` calls — this parameter does not exist in the KB tool.
- Do not create `_implementation/` directories or files — this is explicitly deprecated.
- Do not use raw filesystem Write tool calls for artifact YAML files — use `kb_write_artifact` exclusively.
- Do not leave `artifact_write` in both frontmatter and call sites after migration — the tool must be fully replaced, not just supplemented.
- Do not add the `knowledge-context-loader` to the migration scope — it already uses `kb_write_artifact` natively.

---

## Conflict Analysis

### Conflict: Hard Dependency — KFMB-1030 Not Yet Complete
- **Severity**: warning (non-blocking for seeding; blocking for implementation)
- **Description**: KFMB-5010 depends on KFMB-1030 (PM Artifact Types and Detail Tables). While all 7 artifact types written by KFMB-5010 (`checkpoint`, `scope`, `plan`, `evidence`, `review`, `verification`, `fix_summary`) already exist in the KB, the dependency is declared in the story graph and must be respected. This also ensures the DB migrations and CRUD layer are stable before pipeline agents switch to KB-only writes.
- **Resolution Hint**: Gate implementation on KFMB-1030 reaching `completed`. No additional DB work is needed for KFMB-5010 itself.
- **Source**: index dependency graph + story.yaml

### Conflict: Hard Dependency — KFMB-2040 Not Yet Complete
- **Severity**: warning (non-blocking for seeding; blocking for implementation)
- **Description**: KFMB-5010 depends on KFMB-2040 (KB-Native Story Generation Pipeline). The PM pipeline migration (KFMB-2040) establishes the pattern and validates the KB tool call approach for the full story generation workflow. KFMB-5010 extends the same approach to the implementation pipeline. Beginning implementation before KFMB-2040 completes risks pattern drift.
- **Resolution Hint**: Gate implementation on KFMB-2040 reaching `completed` or at minimum `needs-code-review`. Review KFMB-2040's final agent files as canonical pattern examples.
- **Source**: index dependency graph

### Conflict: Sizing Warning — 7 Agents with Cross-Cutting Write Path Changes
- **Severity**: warning
- **Description**: This story modifies 7 distinct agent instruction files across the full dev/QA pipeline. A partial migration — e.g., updating 4 of 7 agents — creates an inconsistent pipeline where some phases write to KB and others write to filesystem. Downstream reader agents (KFMB-5020) cannot safely migrate until all writer agents are confirmed KB-only. The `sizing_warning: true` flag in story.yaml reflects this risk.
- **Resolution Hint**: Implement as an atomic batch: all 7 agents must be updated in a single story implementation. If scope proves too large, split into KFMB-5010a (setup/plan phases: dev-setup-leader, dev-plan-leader) and KFMB-5010b (execute/review/QA phases: remaining 5 agents), ensuring each sub-story leaves a consistent write path. Consider splitting during elaboration.
- **Source**: story.yaml `sizing_warning: true` + risk_notes

---

## Story Seed

### Title

Migrate _implementation/ Writer Agents to kb_write_artifact

### Description

The implementation pipeline — from dev setup through execution, code review, and QA verification — currently persists its workflow artifacts (`CHECKPOINT.yaml`, `SCOPE.yaml`, `PLAN.yaml`, `EVIDENCE.yaml`, `REVIEW.yaml`, `QA-VERIFY.yaml`) to the filesystem under `_implementation/` directories using a transitional dual-write tool called `artifact_write`. This tool writes the file to disk as primary and attempts a secondary KB write as best-effort.

The KB-first migration plan (KFMB) designates `_implementation/` filesystem artifacts as deprecated. All workflow artifact persistence must move to direct `kb_write_artifact` calls, with no filesystem fallback. The `_shared/kb-integration.md` policy document already declares this as the mandatory standard; the 7 leader agents that use `artifact_write` have not yet been updated to comply.

This story migrates those 7 agents to call `kb_write_artifact` directly, removing the filesystem write path entirely:

1. **`dev-setup-leader`** — writes `checkpoint` (setup), `scope`, and `fix_summary`
2. **`dev-plan-leader`** — writes `checkpoint` (planning) and `plan`
3. **`dev-execute-leader`** — writes `evidence` and `checkpoint` (implementation)
4. **`dev-fix-fix-leader`** — writes `evidence` and `review`
5. **`review-aggregate-leader`** — writes `review`
6. **`qa-verify-verification-leader`** — writes `verification`
7. **`qa-verify-completion-leader`** — writes `verification` (PASS + FAIL branches)

Once complete, the full implementation pipeline will persist all workflow artifacts exclusively through the KB MCP tools, enabling KFMB-5020 to safely migrate reader agents away from filesystem reads.

### Initial Acceptance Criteria

- [ ] AC-1: `dev-setup-leader` calls `kb_write_artifact` directly for `checkpoint`, `scope`, and `fix_summary` artifacts. No `artifact_write` calls remain. No `_implementation/` file paths remain in artifact write paths.
- [ ] AC-2: `dev-plan-leader` calls `kb_write_artifact` directly for `checkpoint` and `plan` artifacts. No `artifact_write` calls remain.
- [ ] AC-3: `dev-execute-leader` calls `kb_write_artifact` directly for `evidence` and `checkpoint` artifacts. No `artifact_write` calls remain.
- [ ] AC-4: `dev-fix-fix-leader` calls `kb_write_artifact` directly for `evidence` and `review` artifacts. No `artifact_write` calls remain.
- [ ] AC-5: `review-aggregate-leader` calls `kb_write_artifact` directly for `review` artifacts. No `artifact_write` calls remain.
- [ ] AC-6: `qa-verify-verification-leader` calls `kb_write_artifact` directly for `verification` artifacts. No `artifact_write` calls remain.
- [ ] AC-7: `qa-verify-completion-leader` calls `kb_write_artifact` directly for `verification` artifacts in both PASS and FAIL branches. No `artifact_write` calls remain.
- [ ] AC-8: All 7 agents have their `kb_tools` frontmatter updated: `artifact_write` is removed; `kb_write_artifact` is added (if not already present).
- [ ] AC-9: Each agent retains graceful failure handling for `kb_write_artifact` failures — a KB write failure logs a warning and allows the pipeline phase to continue; it does not block or halt execution.
- [ ] AC-10: `dev-implement-backend-coder` and `dev-implement-frontend-coder` are confirmed unchanged — their `artifact_write` frontmatter references relate only to log files (KBAR-0170 exemption) and are out of scope.
- [ ] AC-11: No agent in the set references `_implementation/` filesystem paths in artifact write outputs (these may still appear in read fallback paths until KFMB-5020 removes them).
- [ ] AC-12: The `artifact_write` entry is removed from the `kb_tools` frontmatter of all 7 migrated agents.

### Non-Goals

- This story does NOT migrate reader agents away from `_implementation/` filesystem reads — that is KFMB-5020.
- This story does NOT remove `_implementation/` directories from existing stories on disk — those are pre-existing artifacts unaffected by agent instruction changes.
- This story does NOT modify `dev-implement-backend-coder` or `dev-implement-frontend-coder` — their log-writing pattern is exempt (KBAR-0170).
- This story does NOT modify the `knowledge-context-loader` — it already uses `kb_write_artifact` natively.
- This story does NOT add new artifact types to the KB — all types used (`checkpoint`, `scope`, `plan`, `evidence`, `review`, `verification`, `fix_summary`) already exist.
- This story does NOT update the `workflow-retro`, `story-status`, or `checkpoint` commands that read `_implementation/` files — those are part of KFMB-5020/5030.
- This story does NOT delete the `artifact_write` tool implementation itself — that cleanup is deferred to KFMB-6020.
- This story does NOT touch `_pm/` artifact writers (`test-plan.yaml`, `dev-feasibility.yaml`, etc.) — that is KFMB-5040.
- Stage directories and `stories.index.md` are not touched.

### Reuse Plan

- **Components**: `kb_write_artifact` (existing MCP tool), `kb_read_artifact` (existing, used by downstream reader agents) — no new tool registration needed.
- **Patterns**: `_shared/kb-integration.md` write pattern (lines 293-390) as the authoritative call template; `knowledge-context-loader.agent.md` as the reference implementation of a fully migrated writer agent.
- **Packages**: No TypeScript packages modified — this is a docs-only story targeting 7 `.claude/agents/` files.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is docs-only (7 agent `.md` files). No runnable unit tests apply to the agent instruction files themselves. The test plan should focus on:
- **Integration verification**: After KFMB-1030 and KFMB-2040 are complete, run `/dev-implement-story` against a test story end-to-end and confirm: (a) `checkpoint` artifact appears in KB via `kb_read_artifact` after setup phase, (b) `scope` artifact appears in KB after setup phase, (c) `plan` artifact appears in KB after planning phase, (d) `evidence` artifact appears in KB after execute phase, (e) `review` artifact appears in KB after code review phase, (f) `verification` artifact appears in KB after QA verification.
- **Regression guard**: Confirm no `_implementation/` YAML files are created during the end-to-end run (directories should not be created; only `BACKEND-LOG.md` and `FRONTEND-LOG.md` log files are permissible).
- **Graceful failure test**: Simulate KB unavailability for one phase and verify the pipeline phase logs a warning and continues rather than halting.
- ADR-006 skip condition applies: `frontend_impacted: false`, no E2E tests required.
- ADR-005 applies: integration verification must use the real KB database (port 5433), not mocked MCP responses.

### For UI/UX Advisor

No UI/UX concerns — this story modifies only internal agent instruction files used by AI agents. No user-facing interface changes. Skip UX phase or provide a brief "not applicable" note.

### For Dev Feasibility

- **Scope**: 7 agent files require edits — all markdown, no build/type-check required.
  1. `.claude/agents/dev-setup-leader.agent.md` (3 `artifact_write` → `kb_write_artifact` replacements)
  2. `.claude/agents/dev-plan-leader.agent.md` (2 replacements)
  3. `.claude/agents/dev-execute-leader.agent.md` (2 replacements)
  4. `.claude/agents/dev-fix-fix-leader.agent.md` (2 replacements)
  5. `.claude/agents/review-aggregate-leader.agent.md` (1 replacement)
  6. `.claude/agents/qa-verify-verification-leader.agent.md` (1 replacement)
  7. `.claude/agents/qa-verify-completion-leader.agent.md` (2 replacements — PASS + FAIL branches)
- **Sizing risk**: `sizing_warning: true` is warranted — 7 files, 13 total write-call replacements. Evaluate during elaboration whether to split into 2 sub-stories: (a) setup/plan phase agents (dev-setup-leader, dev-plan-leader — 5 calls) and (b) execute/review/QA phase agents (remaining 5 agents — 8 calls). A split works only if the two sets are implemented sequentially, not in parallel, to maintain a consistent pipeline state.
- **Migration pattern per call site**:
  ```javascript
  // BEFORE (artifact_write dual-write)
  artifact_write({
    story_id: "{STORY_ID}",
    artifact_type: "checkpoint",
    phase: "setup",
    iteration: 0,
    content: { ... },
    file_path: "{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/CHECKPOINT.yaml",
  })

  // AFTER (kb_write_artifact direct)
  kb_write_artifact({
    story_id: "{STORY_ID}",
    artifact_type: "checkpoint",
    phase: "setup",
    iteration: 0,
    content: { ... },
    // file_path is REMOVED — not a valid parameter for kb_write_artifact
  })
  ```
- **Frontmatter update pattern per agent**:
  ```yaml
  # BEFORE
  kb_tools:
    - artifact_write
    - kb_read_artifact

  # AFTER
  kb_tools:
    - kb_write_artifact
    - kb_read_artifact
  ```
- **Key pre-conditions**: Read the final versions of `tool-schemas.ts` (post-KFMB-1030) and confirm `artifact_write` is still present during the transition (it should be — its removal is KFMB-6020). Read `_shared/kb-integration.md` Artifact Type Reference table for phase mappings.
- **Canonical references for subtask decomposition**:
  - ST-1: Read all 7 target agent files to establish current state
  - ST-2-8: Update each agent (one per subtask) — frontmatter update + call site replacement(s) + graceful failure update
  - ST-9: Verify no `_implementation/` artifact write references remain across all 7 files
  - `.claude/agents/knowledge-context-loader.agent.md` — reference for completed migration state
  - `.claude/agents/_shared/kb-integration.md` (lines 293-390) — reference for canonical call signature and artifact type mapping
  - `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 2323) — ground truth for `kb_write_artifact` input parameter schema
