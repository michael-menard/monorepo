---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0170

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 4 and Phase 5 agent migration work (KBAR-0110 through KBAR-0160). The baseline's "Active Stories" section states "None currently in-progress" but the index and repository state show KBAR-0110 in UAT, KBAR-0120 in UAT, KBAR-0130 in ready-for-qa, KBAR-0160 in ready-to-work. KB was unavailable at seed generation time — lessons_loaded is false (KB search returned INTERNAL_ERROR). Lessons below are sourced from codebase inspection and KBAR-0160 seed precedent.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `dev-execute-leader` agent (v3.1.0) | `.claude/agents/dev-execute-leader.agent.md` | **Key target**: Currently writes EVIDENCE and CHECKPOINT via `kb_write_artifact` (KB-only). Steps 8–10 produce both artifacts. Frontmatter `kb_tools` lists `kb_write_artifact`. |
| `dev-implement-backend-coder` agent (v3.4.0) | `.claude/agents/dev-implement-backend-coder.agent.md` | **Key target**: Writes `BACKEND-LOG.md` directly to `_implementation/` via the `Write` tool. This is already a file-system write — migration here differs from execute-leader. Uses `kb_search` for reading only (no `kb_write_artifact`). |
| `dev-implement-frontend-coder` agent (v3.3.0) | `.claude/agents/dev-implement-frontend-coder.agent.md` | **Key target**: Writes `FRONTEND-LOG.md` directly to `_implementation/` via the `Write` tool. Same pattern as backend-coder — already file-based. Uses `kb_search` for reading only (no `kb_write_artifact`). |
| `artifact_write` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Delivered by KBAR-0110 (now in UAT). Dual-write: file first, KB best-effort. Response: `{ file_path, file_written, kb_artifact_id?, kb_write_skipped?, kb_write_warning? }`. Contract verified from KBAR-0110.md. |
| `EVIDENCE.yaml` schema (v2) | `packages/backend/orchestrator/src/artifacts/evidence.ts` | The primary output of `dev-execute-leader`. Zod schema with schema v2, AC evidence, touched_files, commands_run, e2e_tests section (ADR-006). Written by execute-leader, read by review and QA phases. |
| `storyArtifacts` table | `apps/api/knowledge-base/src/db/` | Protected. KB storage backing `artifact_write` and `kb_write_artifact`. Do not alter. |
| KBAR-0160 story and seed | `.claude/agents/dev-setup-leader.agent.md` migration | Precedent story for Phase 5 migration pattern. Defines the agent-migration approach for CHECKPOINT, SCOPE, PLAN. KBAR-0170 follows the same migration pattern for EVIDENCE and log artifacts. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0160 (Migrate dev-setup-leader, dev-plan-leader) | ready-to-work | **Sibling Phase 5 story**: KBAR-0170 depends on KBAR-016 per index. No direct file overlap — KBAR-0160 modifies `dev-setup-leader` and `dev-plan-leader`; KBAR-0170 modifies `dev-execute-leader`, `backend-coder`, `frontend-coder`. |
| KBAR-0110 (`artifact_write` tool) | UAT | Hard transitive dependency — must be merged before KBAR-0160 lands, which must land before KBAR-0170. |
| KBAR-0120 (artifact tool unit tests) | UAT | No direct overlap with agent markdown files. |
| KBAR-0130 (`artifact_search` tool) | ready-for-qa | No direct overlap with agent markdown files. |

### Constraints to Respect

- `storyArtifacts` DB schema is protected — do not alter
- `kb_write_artifact` tool contract must not change — not all agents are migrated in this story
- Agent `.agent.md` files are documentation-only changes (no TypeScript code in this story)
- Backward compatibility: stories already in-progress (with artifacts written via old `kb_write_artifact`) must still be readable via `kb_read_artifact`
- `dev-execute-leader`, `backend-coder`, and `frontend-coder` are invoked for **every story's implementation phase** — regressions here have maximum blast radius
- BACKEND-LOG and FRONTEND-LOG are **high-frequency writes** (updated after each implementation chunk); any logging overhead or tool-call latency matters
- No barrel files, Zod-first types — applies to any TypeScript touched (none expected in this story)
- E2E tests not applicable: no UI surface touched

---

## Retrieved Context

### Related Endpoints

This story touches no HTTP endpoints. It modifies agent markdown files only. The `artifact_write` MCP tool (delivered by KBAR-0110) is the new write mechanism — no new endpoints introduced.

### Related Components

| File | Role |
|------|------|
| `.claude/agents/dev-execute-leader.agent.md` | Primary target — migrate `kb_write_artifact` calls (EVIDENCE write step 8, CHECKPOINT update step 9) to `artifact_write` with file_path for `_implementation/EVIDENCE.yaml` and `_implementation/CHECKPOINT.yaml` |
| `.claude/agents/dev-implement-backend-coder.agent.md` | Target — BACKEND-LOG.md is already file-written directly. Determine if BACKEND-LOG also needs `artifact_write` KB indexing, or if direct file write is sufficient. |
| `.claude/agents/dev-implement-frontend-coder.agent.md` | Target — FRONTEND-LOG.md is already file-written directly. Same determination as backend-coder. |
| `packages/backend/orchestrator/src/artifacts/evidence.ts` | EVIDENCE schema v2 — content fields are unchanged; only the write mechanism changes |
| `packages/backend/orchestrator/src/artifacts/checkpoint.ts` | CHECKPOINT schema — KBAR-0170 updates the execute-leader's checkpoint update call |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Where `handleArtifactWrite` is registered (post-KBAR-0110, now in UAT) |

### Reuse Candidates

- KBAR-0160 story (`plans/future/platform/kb-artifact-migration/ready-to-work/KBAR-0160/KBAR-0160.md`) — the sibling Phase 5 story defines the exact migration approach and `artifact_write` call shape to follow
- `dev-execute-leader` existing `kb_write_artifact` call blocks at steps 8–10 — use as template, replace with `artifact_write`, add `file_path`
- `artifact_write` tool contract from KBAR-0110: `{ story_id, artifact_type, content, file_path?, phase?, iteration?, skip_kb? }` → response: `{ file_path, file_written, kb_artifact_id?, kb_write_skipped?, kb_write_warning? }`
- KBAR-0160 seed conflict analysis: Option A (explicit `file_path` from agent) is the recommended approach — carry forward to KBAR-0170

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Current `kb_write_artifact` usage (execute) | `.claude/agents/dev-execute-leader.agent.md` | Shows the exact EVIDENCE and CHECKPOINT write call shapes (steps 8–10) that need migration. The `kb_write_artifact` blocks are the update targets. |
| Sibling migration pattern | `plans/future/platform/kb-artifact-migration/ready-to-work/KBAR-0160/KBAR-0160.md` | Defines the `artifact_write` migration approach for Phase 5 agents: explicit `file_path`, frontmatter updates, non-negotiable updates, graceful failure documentation. |
| `artifact_write` tool contract | `plans/future/platform/kb-artifact-migration/UAT/KBAR-0110/KBAR-0110.md` | AC-2, AC-6: accepted input fields and response shape. Verified at UAT stage — contract is stable. |
| EVIDENCE artifact schema | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Zod schema for the EVIDENCE content structure (unchanged by this story — only the write mechanism changes). |

---

## Knowledge Context

### Lessons Learned

KB was unavailable at generation time (`INTERNAL_ERROR`). The following lessons are inferred from codebase inspection and KBAR-0160 seed precedent:

- **[KBAR-0160 seed]** Explicit `file_path` (Option A) is recommended over relying on `artifact_write`'s internal canonical path computation. Provides agent-side transparency and avoids dependency on internal path-resolution behavior.
  - *Applies because*: Same tradeoff applies to EVIDENCE.yaml path in `dev-execute-leader`.

- **[KBAR-0160 seed]** Do not assume `artifact_write` input schema is identical to `kb_write_artifact` — verify the actual tool signature before writing agent call documentation.
  - *Applies because*: KBAR-0110 is now in UAT; the input schema can be verified from `UAT/KBAR-0110/KBAR-0110.md` AC-2 and AC-6 rather than from implementation time discovery.

- **[WKFL retro — inferred]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard. `artifact_write`'s dual-write design (file first, KB best-effort) is designed for this. Agent instructions must document that a KB write warning does NOT block the execute/implementation phase.
  - *Applies because*: `dev-execute-leader` is a high-throughput agent; a blocking KB write failure during EVIDENCE write would halt every story implementation.

- **[Backend-coder / frontend-coder finding]** These agents do NOT currently use `kb_write_artifact`. They write logs directly to the filesystem via the `Write` tool. The migration question for KBAR-0170 is: should BACKEND-LOG and FRONTEND-LOG also be KB-indexed via `artifact_write`, or should they remain direct file writes? This is the key design question that differs from KBAR-0160's scope. The index entry says "use artifact_write for EVIDENCE, logs" — but BACKEND-LOG is a streaming append log, not a structured artifact. Dev Feasibility must resolve this explicitly.

- **[Performance concern from index]** The index risk note flags: "BACKEND-LOG and FRONTEND-LOG are high-frequency writes; performance critical." This means that if BACKEND-LOG migration is in scope, the `artifact_write` tool call overhead (file write + KB write per chunk) must be acceptable. Given that BACKEND-LOG is appended after each implementation chunk (potentially 5–10 times per story), the KB write leg adds round-trip latency. Consider `skip_kb: true` for log artifacts, or confirm log migration is out of scope.

### Blockers to Avoid (from past stories)

- Do not start KBAR-0170 implementation until KBAR-0160 (Migrate setup and plan leaders) is complete — that is the declared dependency
- Do not change `kb_read_artifact` calls in `dev-execute-leader` — only the write side is in scope
- Do not break backward compatibility for stories already in-progress (EVIDENCE artifacts written by old `kb_write_artifact` must still be readable via `kb_read_artifact`)
- Do not assume backend-coder and frontend-coder use `kb_write_artifact` — they use direct `Write` tool calls to the filesystem. Inspect before writing ACs.
- Do not migrate BACKEND-LOG/FRONTEND-LOG to `artifact_write` without resolving the performance risk explicitly in Dev Feasibility

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration/UAT validation of updated agents must use real MCP server. Human review of agent markdown changes is the primary validation mechanism (no unit tests for agent markdown). |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI surface. `frontend_impacted: false`. The EVIDENCE schema (v2) includes E2E test section per ADR-006 but that is content structure, not a test requirement for this story. |

### Patterns to Follow

- Agent frontmatter `kb_tools` list: update to include `artifact_write` for write operations (replace or supplement `kb_write_artifact`)
- Document dual-write semantics: file write is primary (blocking), KB write is secondary (best-effort, failure → `kb_write_warning`, not a blocking error)
- Keep `kb_read_artifact` calls unchanged if they exist in `dev-execute-leader` (read path stays DB-first)
- Use explicit `file_path` arguments (Option A from KBAR-0160 analysis)
- Log artifact design: resolve whether BACKEND-LOG / FRONTEND-LOG use `artifact_write` with `skip_kb: true` or remain as direct `Write` tool calls. Document the decision explicitly.

### Patterns to Avoid

- Do not change the EVIDENCE artifact content structure — only the write mechanism changes
- Do not introduce TypeScript interfaces in any code that may accompany this story
- Do not use `artifact_write` with blocking behavior on KB failure — KB write must be best-effort
- Do not treat log files (BACKEND-LOG, FRONTEND-LOG) identically to structured artifacts without performance analysis

---

## Conflict Analysis

### Conflict: Backend-Coder and Frontend-Coder Do Not Use `kb_write_artifact` (warning)

- **Severity**: warning (non-blocking)
- **Description**: The index entry describes migrating backend-coder and frontend-coder "to use artifact_write for EVIDENCE, logs." However, inspection of the current agent files reveals: (a) backend-coder and frontend-coder do NOT write EVIDENCE — that is `dev-execute-leader`'s output; (b) backend-coder and frontend-coder already write logs directly to the filesystem via the `Write` tool (not via `kb_write_artifact`). Therefore the "migration" for these agents may differ substantially from the execute-leader migration. The scope may be: add optional KB indexing for logs via `artifact_write` with `skip_kb: true`, OR confirm that direct `Write` tool calls remain appropriate and no change is needed.
- **Resolution Hint**: Dev Feasibility must determine: (A) which specific calls in backend-coder and frontend-coder are targets, and (B) whether log artifacts should use `artifact_write` (with performance consideration) or remain direct file writes. If no `kb_write_artifact` calls exist in these agents, the migration scope is primarily `dev-execute-leader`.

### Conflict: BACKEND-LOG and FRONTEND-LOG Performance Risk (warning)

- **Severity**: warning (non-blocking)
- **Description**: The index explicitly flags "BACKEND-LOG and FRONTEND-LOG are high-frequency writes; performance critical." If BACKEND-LOG is appended after every implementation chunk (5–10 times per story), routing each write through `artifact_write` adds KB round-trip latency (even with graceful failure isolation). This could meaningfully slow down implementation phases.
- **Resolution Hint**: Dev Feasibility should define: if log migration is in scope, mandate `skip_kb: true` for BACKEND-LOG and FRONTEND-LOG writes to `artifact_write` (file-only write, no KB overhead). Or confirm that log migration is explicitly out of scope for KBAR-0170 and belongs to a separate story.

---

## Story Seed

### Title

Migrate `dev-execute-leader`, `backend-coder`, and `frontend-coder` to Use `artifact_write` for Dual-Write Artifact Persistence

### Description

**Context**: The KBAR epic's Phase 5 migrates all workflow agents from `kb_write_artifact` (KB-only writes) to `artifact_write` (dual-write: file + KB). KBAR-0160 migrates the setup and planning agents. KBAR-0170 migrates the execution agents: `dev-execute-leader`, `dev-implement-backend-coder`, and `dev-implement-frontend-coder`.

**Problem**: `dev-execute-leader` writes EVIDENCE.yaml and updates CHECKPOINT via `kb_write_artifact` — these artifacts exist only in the KB database. There is no `_implementation/EVIDENCE.yaml` file. This limits human observability and prevents the deferred-write fallback pattern. `backend-coder` and `frontend-coder` write BACKEND-LOG.md and FRONTEND-LOG.md directly to the filesystem already — but they are not KB-indexed. The migration determines whether logs should gain KB indexing (with performance tradeoff) or remain as-is.

**Proposed solution**: Update `dev-execute-leader.agent.md` to replace `kb_write_artifact` calls (EVIDENCE write, CHECKPOINT update in steps 8–10) with `artifact_write` calls using explicit `file_path` arguments. Update frontmatter `kb_tools`. Document graceful KB failure semantics. For `backend-coder` and `frontend-coder`: Dev Feasibility must explicitly determine scope — if log KB indexing is in scope, use `artifact_write` with `skip_kb: true` to preserve performance; if not, document that direct `Write` calls remain unchanged and no migration is needed.

### Initial Acceptance Criteria

- [ ] **AC-1**: `dev-execute-leader.agent.md` EVIDENCE write (step 8) uses `artifact_write` tool call with `artifact_type: "evidence"`, `phase: "implementation"`, `iteration: checkpoint.content.iteration`, and `file_path` set to the canonical `_implementation/EVIDENCE.yaml` path.
- [ ] **AC-2**: `dev-execute-leader.agent.md` CHECKPOINT update (step 9) uses `artifact_write` tool call with `artifact_type: "checkpoint"`, `phase: "implementation"`, and updated content including `current_phase: "execute"`, `last_successful_phase: "plan"`.
- [ ] **AC-3**: `dev-execute-leader.agent.md` frontmatter `kb_tools` section is updated to replace or supplement `kb_write_artifact` with `artifact_write` for write operations.
- [ ] **AC-4**: `dev-execute-leader.agent.md` documents graceful KB write failure behavior: if KB write fails, `artifact_write` returns `file_written: true` and `kb_write_warning` — the execute phase proceeds, not blocks.
- [ ] **AC-5**: `kb_read_artifact` calls in `dev-execute-leader` (inputs read at steps 1–2) are unchanged — only the write side is migrated.
- [ ] **AC-6**: For `dev-implement-backend-coder` and `dev-implement-frontend-coder`: Dev Feasibility determines and documents one of: (a) migrate BACKEND-LOG/FRONTEND-LOG to `artifact_write` with `skip_kb: true`, or (b) confirm direct `Write` tool calls remain unchanged. The chosen approach is implemented and documented in both agent files' non-negotiables.
- [ ] **AC-7**: Both coder agents' frontmatter `kb_tools` are updated if and only if `artifact_write` is adopted for log writes (AC-6 path a).
- [ ] **AC-8**: No `kb_write_artifact` write calls remain in any of the three target agent files after migration (unless confirmed intentionally preserved with justification).

### Non-Goals

- Migrating code review agents — that is KBAR-0180
- Migrating QA agents — that is KBAR-0190
- Migrating the knowledge-context-loader — that is KBAR-0200
- Implementing the `artifact_write` tool itself — delivered by KBAR-0110 (in UAT)
- Changing the content structure of EVIDENCE, CHECKPOINT, BACKEND-LOG, or FRONTEND-LOG artifacts
- Changing `kb_read_artifact` calls in `dev-execute-leader`
- Adding automated tests for agent behavior (agents are markdown; tested via E2E workflow runs)
- Removing `kb_write_artifact` from the KB MCP server (other agents not yet migrated still use it)
- Touching any TypeScript source files (agent markdown files only)

### Reuse Plan

- **Pattern**: Follow KBAR-0160 migration approach — replace `kb_write_artifact` write calls with `artifact_write`, add explicit `file_path`, update frontmatter `kb_tools`, document KB failure semantics
- **Tool contract**: `artifact_write` input: `{ story_id, artifact_type, content, file_path?, phase?, iteration?, skip_kb? }` — contract confirmed from KBAR-0110 UAT (AC-2 and AC-6)
- **Schema reference**: `packages/backend/orchestrator/src/artifacts/evidence.ts` — EVIDENCE v2 content fields are unchanged
- **File path convention**: `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/EVIDENCE.yaml` and `_implementation/CHECKPOINT.yaml` (Option A — explicit paths)
- **Performance guard**: For BACKEND-LOG/FRONTEND-LOG, if adopted, use `skip_kb: true` to eliminate KB round-trip overhead on high-frequency writes

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story modifies agent markdown files only — no TypeScript. No unit tests can be written for agent markdown changes. Validation strategy:
- **Manual diff review**: Compare before/after diffs of all three agent files against each AC
- **Functional canary run**: Run a test story through the full `dev-implement-story` workflow after changes land; verify `_implementation/EVIDENCE.yaml` and `_implementation/CHECKPOINT.yaml` are written to the filesystem by `dev-execute-leader`
- **Integration assertion**: Confirm written YAML files are retrievable via `kb_read_artifact` (KB-write leg succeeded)
- **KB failure graceful path**: Observational only — document expected behavior; verify agent instructions match
- **Log migration validation** (if AC-6 path a): Verify BACKEND-LOG.md / FRONTEND-LOG.md are still written to `_implementation/` as before (file path unchanged); if `artifact_write` adopted, verify no performance regression visible in implementation duration

**Prerequisite**: Full dependency chain KBAR-0110 through KBAR-0160 must be merged before functional canary validation.

### For UI/UX Advisor

Not applicable. This story modifies agent markdown files only. `frontend_impacted: false`.

### For Dev Feasibility

**Critical decision gate — resolve before writing subtasks:**

1. **Scope clarity for backend-coder and frontend-coder**: These agents do NOT use `kb_write_artifact`. They write logs directly via the `Write` tool. Determine:
   - (a) Adopt `artifact_write` with `skip_kb: true` for log writes — preserves file-write behavior, adds no KB overhead, but changes the write mechanism from direct `Write` to MCP `artifact_write`
   - (b) Confirm no change needed for log writes — direct `Write` tool calls remain, which already achieve file persistence. Focus KBAR-0170 scope on `dev-execute-leader` EVIDENCE and CHECKPOINT migration only.
   - **Recommendation**: Option (b) unless the epic explicitly requires log KB-indexing. The index risk note ("performance critical") supports keeping BACKEND-LOG/FRONTEND-LOG as direct writes. If KB indexing of logs is desired, it belongs in a separate story with dedicated performance analysis.

2. **Verify `artifact_write` input schema from KBAR-0110**: Confirm from `UAT/KBAR-0110/KBAR-0110.md` AC-2 and AC-6 that the tool accepts `{ story_id, artifact_type, content, file_path?, phase?, iteration?, skip_kb? }` and returns `{ file_path, file_written, kb_artifact_id?, kb_write_skipped?, kb_write_warning? }`. This story can use the UAT-stage story as the source of truth (no discovery needed at implementation time).

3. **Subtask decomposition** (suggested):
   - ST-1: Read KBAR-0110 UAT story to confirm `artifact_write` schema; read current `dev-execute-leader`, `backend-coder`, `frontend-coder` agent files; document scope decision for AC-6
   - ST-2: Update `dev-execute-leader.agent.md` — migrate EVIDENCE write (step 8) and CHECKPOINT update (step 9) to `artifact_write`; update frontmatter; document KB failure semantics (AC-1, AC-2, AC-3, AC-4, AC-5)
   - ST-3: Update `backend-coder` and `frontend-coder` per AC-6 decision — either adopt `artifact_write` with `skip_kb: true`, or document that no change is required (AC-6, AC-7, AC-8)
   - ST-4: Human review of all three agent file diffs against all ACs; functional canary story validation

4. **Canonical file paths** (explicit, Option A):
   ```
   EVIDENCE:    {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/EVIDENCE.yaml
   CHECKPOINT:  {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/CHECKPOINT.yaml
   BACKEND-LOG: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/BACKEND-LOG.md (unchanged if option b)
   FRONTEND-LOG:{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/FRONTEND-LOG.md (unchanged if option b)
   ```
