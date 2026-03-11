---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: KBAR-0220

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: The baseline predates Phase 5 agent migration work (KBAR-0160 through KBAR-0210). It documents "Active Stories: None currently in-progress for the platform epic" — outdated, as most Phase 5 stories are now in UAT. The baseline documents the `kb_write_artifact` tool as the current mechanism; Phase 5 has since migrated agents to `artifact_write` and commands to use `kb_update_story_status` consistently. These migrations are the exact scope that KBAR-0220 is tasked to validate end-to-end.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `artifact_write` MCP tool (dual-write, KB + file) | `apps/api/knowledge-base/src/mcp-server/` | Delivered by KBAR-0110 (UAT). Agents from KBAR-0160/0170/0180/0190/0200 now use this tool. KBAR-0220 validates it persists artifacts to `_implementation/` correctly in a real workflow. |
| `artifact_search` MCP tool (semantic search) | `apps/api/knowledge-base/src/mcp-server/` | Delivered by KBAR-0130 (completed). `knowledge-context-loader` now uses this (KBAR-0200). KBAR-0220 validates that artifact_search returns relevant results during the canary story workflow. |
| `kb_update_story_status` MCP tool | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Standardized by KBAR-0210 (UAT). All workflow commands now call this with correct state strings and Step 0.6 guard + abort recovery. KBAR-0220 validates state transitions are correctly recorded in the DB at each workflow step. |
| `dev-setup-leader.agent.md` (migrated) | `.claude/agents/dev-setup-leader.agent.md` | Migrated by KBAR-0160 to write CHECKPOINT and SCOPE via `artifact_write`. KBAR-0220 verifies `_implementation/CHECKPOINT.yaml` and `_implementation/SCOPE.yaml` appear on the filesystem during a real workflow run. |
| `dev-plan-leader.agent.md` (migrated) | `.claude/agents/dev-plan-leader.agent.md` | Migrated by KBAR-0160 to write PLAN via `artifact_write`. KBAR-0220 verifies `_implementation/PLAN.yaml` appears on the filesystem. |
| `dev-execute-leader.agent.md` + coder agents (migrated) | `.claude/agents/dev-execute-leader.agent.md` | Migrated by KBAR-0170 to write EVIDENCE via `artifact_write`. KBAR-0220 verifies `_implementation/EVIDENCE.yaml` appears on the filesystem. |
| `review-aggregate-leader.agent.md` (migrated) | `.claude/agents/review-aggregate-leader.agent.md` | Migrated by KBAR-0180 to write REVIEW via `artifact_write`. KBAR-0220 verifies `_implementation/REVIEW.yaml` appears on the filesystem. |
| `qa-verify-completion-leader.agent.md` (migrated) | `.claude/agents/qa-verify-completion-leader.agent.md` | Migrated by KBAR-0190 to write QA-VERIFY artifact via `artifact_write`. KBAR-0220 verifies `_implementation/QA-VERIFY.yaml` appears on the filesystem. |
| `knowledge-context-loader.agent.md` (migrated) | `.claude/agents/knowledge-context-loader.agent.md` | Migrated by KBAR-0200 to use `artifact_search` for pattern discovery. KBAR-0220 verifies that relevant past artifacts are surfaced during setup. |
| Workflow commands (standardized) | `.claude/commands/dev-implement-story.md`, `elab-story.md`, `dev-code-review.md`, `qa-verify-story.md`, `dev-fix-story.md` | State strings standardized and Step 0.6 patterns completed by KBAR-0210. KBAR-0220 validates the full state transition chain: `backlog → ready → in_progress → ready_for_review → in_review → ready_for_qa → in_qa`. |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` (port 5433) | Separate PostgreSQL instance hosting all KB entries. Requires the KB server to be running (Docker Compose) for artifact write/search validation per ADR-005. |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas for all artifact types (checkpoint, scope, plan, evidence, review). KBAR-0220 validates these schemas are satisfied by the real artifact_write output during the canary run. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| KBAR-0210 (Update Orchestrator Commands) | uat | KBAR-0220 depends on KBAR-0210 reaching UAT or completed before canary validation can be fully trusted. KBAR-0210 is the direct predecessor. If any KBAR-0210 AC is not yet verified, the corresponding validation in KBAR-0220 may be premature. |
| KBAR-0190 (Update QA & Fix Agents) | needs-code-review | KBAR-0190 provides the qa-verify-completion-leader migration. KBAR-0220 cannot fully validate the QA phase of the canary workflow until KBAR-0190 code review is resolved and the story is merged. |
| KBAR-0140 (Artifact Summary Extraction) | created | No direct conflict. KBAR-0140 extends artifact metadata; KBAR-0220 only validates artifact file persistence, not summary extraction. |

### Constraints to Respect

- KBAR-0220 is a validation story, not an implementation story — no agent or command markdown files should be modified unless a defect is found
- ADR-005: UAT must use real services — KB server, real DB, real filesystem; no mocking of MCP tools
- ADR-006: E2E tests required for UI-facing stories — not applicable here (no UI impact), but the canary story used for validation must be a real story object in the DB, not a stub
- The canary test story must be isolated — it should be created solely for validation purposes and cleaned up afterward to prevent pollution of the real story queue
- Protected: `storyArtifacts` table schema, orchestrator artifact Zod schemas, KB MCP server implementation — KBAR-0220 makes no changes to these
- All prior Phase 5 KBAR migrations (KBAR-0160 through KBAR-0210) must be merged before KBAR-0220 validation is meaningful

---

## Retrieved Context

### Related Endpoints

No HTTP endpoints are directly touched by this story. However, the following MCP tool servers must be running for validation:
- KB MCP server (port 5433): `artifact_write`, `artifact_search`, `kb_update_story_status`, `kb_read_artifact`
- Story CRUD MCP tools: `kb_get_story`, `kb_update_story_status`

### Related Components

| File | Role | Validation Target |
|------|------|-------------------|
| `.claude/commands/dev-implement-story.md` | Primary workflow command | Validate Step 0.6 (`in_progress` claim), CHECKPOINT, SCOPE, PLAN artifact writes |
| `.claude/commands/elab-story.md` | Elaboration command | Validate state transition to `ready` and KB state reflects this |
| `.claude/commands/dev-code-review.md` | Code review command | Validate Step 0.6 (`in_review` claim) and REVIEW artifact write |
| `.claude/commands/qa-verify-story.md` | QA verification command | Validate Step 0.6 (`in_qa` claim) and QA-VERIFY artifact write |
| `.claude/agents/dev-setup-leader.agent.md` | Setup phase agent | Validate CHECKPOINT.yaml and SCOPE.yaml written to `_implementation/` |
| `.claude/agents/dev-plan-leader.agent.md` | Planning phase agent | Validate PLAN.yaml written to `_implementation/` |
| `.claude/agents/dev-execute-leader.agent.md` | Execute phase agent | Validate EVIDENCE.yaml written to `_implementation/` |
| `.claude/agents/review-aggregate-leader.agent.md` | Code review agent | Validate REVIEW.yaml written to `_implementation/` |
| `.claude/agents/qa-verify-completion-leader.agent.md` | QA agent | Validate QA-VERIFY artifact written to `_implementation/` |
| `.claude/agents/knowledge-context-loader.agent.md` | Context loader agent | Validate `artifact_search` returns relevant results during setup |
| `apps/api/knowledge-base/src/mcp-server/` | KB MCP server | All artifact tool operations flow through here |
| `apps/api/knowledge-base/src/__types__/index.ts` | State schema | `StoryStateSchema` — verify DB state matches expected value at each transition point |

### Reuse Candidates

- **KBAR-0210 test plan MC-1**: The canary story full workflow run was already defined in KBAR-0210's manual case MC-1 (`backlog → ready → in_progress → in_review → in_qa`). KBAR-0220 extends this with artifact verification at each stage.
- **KBAR-0160 test plan HP-1 through HP-4**: Defined the artifact file existence checks (CHECKPOINT.yaml, SCOPE.yaml, PLAN.yaml). KBAR-0220 runs the real versions of these checks.
- **KBAR-0170 test plan HP-1 through HP-3**: Defined the EVIDENCE.yaml verification check. KBAR-0220 runs this in a real workflow.
- **KB search**: `mcp__knowledge-base__kb_search` can be used to verify that after artifact writes complete, artifacts are indexed and retrievable semantically.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Full workflow command with Step 0.6 claim | `.claude/commands/qa-verify-story.md` | Best model for understanding what a complete, migrated workflow command looks like — the canonical reference for KBAR-0210 verification in KBAR-0220 |
| Artifact file existence verification | `plans/future/platform/kb-artifact-migration/UAT/KBAR-0160/KBAR-0160.md` | HP-1 through HP-4 define the exact verification pattern (check for CHECKPOINT.yaml, SCOPE.yaml on filesystem) that KBAR-0220 must execute for real |
| State transition verification | `apps/api/knowledge-base/src/__types__/index.ts` | `StoryStateSchema` is the authoritative enum — KBAR-0220 must read DB state against this after each workflow step |
| Canary story test pattern | `plans/future/platform/kb-artifact-migration/UAT/KBAR-0210/KBAR-0210.md` | MC-1 manual case defines the full state machine traversal pattern that KBAR-0220 extends with artifact persistence verification |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0210 elab]** A state machine automation harness opportunity was identified: after KBAR-0210 lands, a Vitest integration test that creates a stub story and drives it through state transitions via `kb_update_story_status` would eliminate the need for manual canary runs on future command changes.
  - *Applies because*: KBAR-0220 is exactly the manual canary run that KBAR-0210 predicted. The story should document whether a formal harness is created or whether the manual canary approach suffices. If this is manual-only, the story should be explicit about that limitation so KBAR-0230 (DB-Driven Index Generation) can later build automation.

- **[KBAR-0190 elab]** Graceful KB write failure paths are not unit-testable via static analysis of agent markdown — they require a running KB server with failure simulation.
  - *Applies because*: KBAR-0220 must validate that graceful failure behavior (WARNING + continue when KB is unavailable) is actually in place. This cannot be done purely by reading agent files; it requires either a live failure test or explicit documentation of the exemption.

- **[WKFL-010 / multiple KBAR lessons]** Agent-file-only stories and docs-only stories have E2E exemptions — must document the exemption explicitly in EVIDENCE.yaml.
  - *Applies because*: KBAR-0220 is a validation story (workflow + docs). There are no UI surfaces. E2E exemption must be documented. The canary workflow run itself IS the validation, not a Playwright test.

- **[KBAR-0150 through KBAR-0210 elab pattern]** stories.index.md descriptions drift from actual story scope during elaboration. The KBAR-022 index entry says "Depends On: none" but KBAR-0210 is the direct predecessor and must be complete first.
  - *Applies because*: The stories index shows KBAR-022 with `Depends On: none`, which is inconsistent with the platform index (Wave 8, row 91) showing `← KBAR-0210`. The dependency should be clarified at elaboration time. KBAR-0220 cannot produce meaningful validation results until all of KBAR-0160 through KBAR-0210 are merged.

- **[KBAR-0210 ARCH-001]** The Step 0.6 DB claim was added to `dev-implement-story.md` because DB state consistency at the correct moment (implementation start) enables future tooling to query live story state.
  - *Applies because*: KBAR-0220 is that future tooling moment. The story should query the DB state after Step 0.6 executes and assert it reflects `in_progress` — this was the key architectural decision that KBAR-0210 made to enable exactly this kind of validation.

### Blockers to Avoid (from past stories)

- Do not begin KBAR-0220 validation until KBAR-0160, KBAR-0170, KBAR-0180, KBAR-0190, KBAR-0200, and KBAR-0210 are all merged (not just in UAT)
- Do not attempt to test the `artifact_write` dual-write path without the KB server running — it will silently write files only (no KB index), which would make KB search validation meaningless
- Do not pollute the real story queue with the canary test story — create it with a clearly marked test prefix and clean it up at the end of validation
- Do not attempt to verify graceful KB write failure in a passing-state canary run — this requires separate failure injection that may be out of scope for this story
- Do not make changes to agent or command files during validation — if defects are found, file them as separate stories (or fix stories if critical)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Canary story validation must connect to real KB server, real DB, real filesystem. No mocking of MCP tools. KB server (Docker Compose) must be running at validation time. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — no UI impact. `frontend_impacted: false`. E2E tests are exempt; document in EVIDENCE.yaml. |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not applicable to this story.

### Patterns to Follow

- Run the canary workflow against a real test story (not a stub) to catch integration issues that mocks would hide (ADR-005)
- After each workflow command completes, inspect both the filesystem (`_implementation/`) and the DB (`StoryStateSchema` query via `kb_get_story`) to verify artifact persistence and state transitions
- Document findings in EVIDENCE.yaml with specific artifact paths and DB state values observed — do not rely on "it worked" narratives
- If a defect is found in any prior KBAR story (0160–0210), document it clearly: the story ID, the AC that failed, the observed vs expected behavior. File a fix story rather than modifying files in KBAR-0220.
- Verify `artifact_search` returns relevant results after artifacts are written — this validates the KB indexing path of `artifact_write` (not just the file write path)

### Patterns to Avoid

- Do not skip any phase of the canary workflow — skipping phases (e.g., going from setup directly to QA) would miss phase-specific artifact validation
- Do not interpret "nothing broke" as "everything works" — explicitly verify each artifact file path and each DB state value
- Do not modify KBAR-0220 scope to include fixes for prior stories — KBAR-0220 is read-only validation; fixes belong in separate stories
- Do not write TypeScript code or agent files in this story — the output is a validation report (EVIDENCE.yaml), not code changes

---

## Conflict Analysis

### Conflict: Dependency Listed as "none" in Stories Index (warning)

- **Severity**: warning (non-blocking)
- **Description**: The `stories.index.md` entry for KBAR-022 lists `Depends On: none`, but the platform index (Wave 8, row 91) shows `← KBAR-0210`. Additionally, the story's own context states KBAR-0210 (Update Orchestrator Commands) must be complete for a meaningful E2E validation. This is the same stale-description pattern documented in KB entries for KBAR-0150, KBAR-0180, and KBAR-0210 (KB entries 952868d2, 4deae7af, 2d1f6edf).
- **Resolution Hint**: At elaboration, update the story dependency to `KBAR-0210` (and transitively KBAR-0160 through KBAR-0200). The validation cannot be meaningful until all Phase 5 migrations are merged.

### Conflict: KBAR-0190 Still in needs-code-review (warning)

- **Severity**: warning (non-blocking)
- **Description**: As of the current git status snapshot, KBAR-0190 (Update QA & Fix Agents) is in `needs-code-review` status. This means the `qa-verify-completion-leader.agent.md` migration may not yet be merged. If KBAR-0220 attempts to validate the QA phase of the canary workflow before KBAR-0190 merges, it will be testing the un-migrated version of the agent.
- **Resolution Hint**: Confirm KBAR-0190 is merged before executing the QA-phase validation in KBAR-0220. If not merged, the QA phase validation can be deferred or the story can be split into a "partial validation" run (setup through code review) and a "full validation" run once KBAR-0190 merges.

---

## Story Seed

### Title

Agent Migration Testing — End-to-End Canary Story Workflow Validation for KBAR Phase 5

### Description

**Context**: The KBAR epic's Phase 5 (KBAR-0160 through KBAR-0210) has migrated all workflow agents to use `artifact_write` for dual-write artifact persistence (file + KB) and standardized all workflow commands to use `kb_update_story_status` with correct state strings, Step 0.6 claim patterns, and graceful failure handling. Each migration was validated independently in its own UAT story. KBAR-0220 is the integration validation story that validates all Phase 5 migrations work correctly *together* in a real end-to-end workflow run.

**Problem**: Individual story UAT tests verify isolated changes (e.g., "does `dev-setup-leader` now write CHECKPOINT.yaml to the filesystem?") but do not catch cross-story integration issues. Examples of integration issues that individual UAT cannot catch:
- `artifact_write` writes the file correctly, but `artifact_search` cannot find it (KB indexing regression)
- Step 0.6 state claim in `dev-implement-story.md` works, but the state was already set by `elab-story.md` in an unexpected state that blocks the claim guard
- `knowledge-context-loader` uses `artifact_search` but the artifact type filter misses SCOPE artifacts written by `dev-setup-leader`
- A missed edge case in the `kb_update_story_status` graceful failure path causes a command to halt rather than continue with a WARNING

**Proposed solution**: Run a full canary story through the complete workflow (elab → implement → code-review → QA) using the production workflow commands. At each phase boundary, inspect the filesystem (`_implementation/` directory) for artifact files and query the DB for story state transitions. Document all observations in EVIDENCE.yaml. If any defect is found in a prior KBAR story, document it and file a fix story — do not attempt to repair it within KBAR-0220.

The canary story should be a small, real KBAR-series story (e.g., a simple documentation update story from the KBAR backlog) — not a synthetic stub — to ensure the full workflow machinery (context loading, KB lookups, artifact writes) is exercised with realistic inputs.

### Initial Acceptance Criteria

- [ ] AC-1: A canary test story is created in the KB DB in `backlog` state and run through the full workflow: elab (`/elab-story`), implement (`/dev-implement-story`), code review (`/dev-code-review`), QA verify (`/qa-verify-story`). All commands complete without fatal errors.
- [ ] AC-2: After `elab-story` PASS path completes, the story DB state is `ready` (verified via `kb_get_story`).
- [ ] AC-3: After `dev-implement-story` Step 0.6 executes, the story DB state is `in_progress` (verified via `kb_get_story`).
- [ ] AC-4: After `dev-implement-story` completes, `_implementation/CHECKPOINT.yaml`, `_implementation/SCOPE.yaml`, and `_implementation/PLAN.yaml` exist on the filesystem for the canary story directory. Each file contains valid YAML conforming to the respective artifact schema.
- [ ] AC-5: After `dev-implement-story` Done path completes, the story DB state is `ready_for_review` (verified via `kb_get_story`).
- [ ] AC-6: After `dev-code-review` Step 0.6 executes, the story DB state is `in_review` (verified via `kb_get_story`).
- [ ] AC-7: After `dev-code-review` PASS path completes, `_implementation/REVIEW.yaml` (or `_implementation/EVIDENCE.yaml` for the implementation evidence) exists on the filesystem and is retrievable via `kb_read_artifact`. Story DB state transitions to `ready_for_qa`.
- [ ] AC-8: After `qa-verify-story` Step 0.6 executes, the story DB state is `in_qa` (verified via `kb_get_story`).
- [ ] AC-9: After `qa-verify-story` PASS path completes, the QA verification artifact exists in `_implementation/` on the filesystem. Story DB state transitions to an appropriate terminal or next state.
- [ ] AC-10: `artifact_search` returns at least one result matching the canary story artifacts when queried by artifact type after the implementation phase completes (validates KB indexing path of `artifact_write`, not just file write path).
- [ ] AC-11: During the `dev-setup-leader` phase, the `knowledge-context-loader` agent invokes `artifact_search` and returns results (or empty results with no error) — confirming KBAR-0200 migration is operative in the real workflow.
- [ ] AC-12: No defects found in any prior KBAR Phase 5 story (KBAR-0160 through KBAR-0210) that block successful canary workflow completion. If defects are found, they are documented in the EVIDENCE.yaml and filed as separate fix stories.
- [ ] AC-13: The canary test story is cleaned up (removed from DB or marked `cancelled`) after validation completes to prevent pollution of the story queue used by `kb_get_next_story`.

### Non-Goals

- Making code changes to any agent, command, or TypeScript source file — KBAR-0220 is validation-only; fixes belong in separate stories
- Implementing the state machine automation harness (Vitest integration tests that programmatically drive state transitions) — this is a future automation opportunity identified in KBAR-0210 elab; KBAR-0220 uses a manual canary run
- Validating the graceful KB write failure path in an active failure injection scenario — this requires KB server downtime during validation, which is complex and out of scope unless a safe failure injection method is identified
- Validating KBAR stories from Phases 1–4 (KBAR-0010 through KBAR-0150) — Phase 5 migration validation only
- Performance benchmarking — the validation is functional correctness only
- Testing parallel story execution (two concurrent canary runs) — single-story sequential validation is sufficient for KBAR-0220

### Reuse Plan

- **KBAR-0210 MC-1**: Use the manual case definition from KBAR-0210 as the template for the canary workflow sequence
- **KBAR-0160 HP-1 through HP-4**: Use the test conditions as the checklist for filesystem artifact verification
- **KBAR-0170 HP-1 through HP-3**: Use the test conditions for EVIDENCE.yaml verification
- **`kb_get_story` MCP tool**: Query story DB state after each workflow step
- **`artifact_search` MCP tool**: Verify KB indexing of artifacts after `artifact_write` calls
- **`kb_read_artifact` MCP tool**: Verify artifact retrievability from KB after write

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is a validation story — the "test plan" IS the story. However, the test plan document should structure the canary run as a matrix of checkpoint observations:

| Phase | Command | DB State to Assert | Filesystem Artifacts to Verify | KB Search to Verify |
|-------|---------|-------------------|-------------------------------|---------------------|
| Elab | `/elab-story` | `ready` | None (elab writes no `_implementation/` artifacts) | None |
| Setup | Within `/dev-implement-story` | `in_progress` (after Step 0.6) | `CHECKPOINT.yaml`, `SCOPE.yaml` | `artifact_search` by story_id |
| Plan | Within `/dev-implement-story` | — | `PLAN.yaml` | — |
| Execute | Within `/dev-implement-story` | — | `EVIDENCE.yaml` | — |
| Done | `/dev-implement-story` Done path | `ready_for_review` | All 4 above | — |
| Code Review | `/dev-code-review` | `in_review` → `ready_for_qa` | `REVIEW.yaml` | `artifact_search` by artifact_type: review |
| QA Verify | `/qa-verify-story` | `in_qa` → terminal | QA-VERIFY artifact | — |

Testing strategy is manual (no Playwright, no Vitest). ADR-005 compliance: real KB server, real DB. ADR-006: exempt (no UI surface).

The test plan should explicitly note: if KBAR-0190 is not yet merged at the time of the canary run, the QA phase must be deferred or the story split. A partial validation (elab through code review) is better than skipping validation entirely.

### For UI/UX Advisor

Not applicable — this story has no UI impact. `frontend_impacted: false`. `ui_touched: false`.

### For Dev Feasibility

- **Dependency gate is hard**: All of KBAR-0160, KBAR-0170, KBAR-0180, KBAR-0190, KBAR-0200, KBAR-0210 must be merged before a meaningful full canary run is possible. Verify each story's merge status before scheduling KBAR-0220 for implementation.
- **Canary story selection**: The canary test story should be a real, simple KBAR backlog story (e.g., KBAR-0230 or KBAR-0240 — both pending, small scope, documentation-adjacent) rather than a synthetic stub. A real story exercises the full context-loading and artifact-write machinery realistically. Alternatively, a purpose-built `KBAR-TEST-001` story can be created and deleted after validation — but it must be real in the DB (not mocked).
- **Infrastructure requirements**: Docker Compose must be running with the KB service (port 5433) and main DB (port 5432) before starting validation. The `apps/api/knowledge-base/` server must be running and accessible to Claude Code's MCP tools.
- **Observation methodology**: After each phase boundary, the implementer should directly query the DB using `kb_get_story({story_id: CANARY_ID})` and note the `state` field. Filesystem observation should use `ls _implementation/` in the canary story directory. KB search observation should use `artifact_search({story_id: CANARY_ID})`.
- **Defect handling**: If a defect is found, the workflow may not progress past that phase. Document the defect clearly and stop validation at that point. Do not attempt to manually patch agent/command files to work around the defect. File the defect story and resume KBAR-0220 validation after the fix is merged.
- **Subtask decomposition**:
  - ST-1: Verify all KBAR-0160 through KBAR-0210 stories are merged and their agent/command files are at the expected versions (read-only check of file modification dates / content)
  - ST-2: Select canary story and create it in DB in `backlog` state; verify initial state via `kb_get_story`
  - ST-3: Run `/elab-story` on canary; observe and record state transition to `ready`; note any `artifact_search` outputs from knowledge-context-loader
  - ST-4: Run `/dev-implement-story` on canary; observe Step 0.6 state claim (`in_progress`); verify CHECKPOINT.yaml, SCOPE.yaml, PLAN.yaml, EVIDENCE.yaml appear in `_implementation/`; verify Done-path state transition to `ready_for_review`
  - ST-5: Run `artifact_search` query against canary story artifacts; verify KB indexing is populated
  - ST-6: Run `/dev-code-review` on canary; observe Step 0.6 state claim (`in_review`); verify REVIEW.yaml written; observe state transition to `ready_for_qa`
  - ST-7: Run `/qa-verify-story` on canary; observe Step 0.6 state claim (`in_qa`); verify QA artifact written; observe terminal state transition
  - ST-8: Clean up canary story (mark `cancelled` or delete from DB); write EVIDENCE.yaml summarizing all observations; flag any defects found
- **Canonical references for verification**:
  - State values: `apps/api/knowledge-base/src/__types__/index.ts` (`StoryStateSchema`)
  - Artifact schemas: `packages/backend/orchestrator/src/artifacts/` (checkpoint.ts, scope.ts, plan.ts, evidence.ts, review.ts)
  - KB tool calls: `mcp__knowledge-base__kb_get_story`, `mcp__knowledge-base__artifact_search`, `mcp__knowledge-base__kb_read_artifact`
