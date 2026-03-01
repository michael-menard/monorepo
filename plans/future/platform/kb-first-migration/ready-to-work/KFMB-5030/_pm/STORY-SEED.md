---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: KFMB-5030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB-first migration plan was created after the baseline date (2026-02-26). The baseline records no in-progress KFMB stories, which is accurate. The baseline explicitly documents "Orchestrator YAML Artifacts" at `packages/backend/orchestrator/src/artifacts/` as existing infrastructure — this is the artifact schema layer that KFMB-5030 assumes will already be migrated to KB writes by KFMB-5010/5020.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `dev-implement-story.md` command | `.claude/commands/dev-implement-story.md` (v8.2.0) | Primary orchestrator in scope; Step 2 reads checkpoint from KB (`kb_read_artifact`), passes context to agents. The command already references KB artifact reads at several steps — this story must ensure all inter-phase artifact passing uses KB tool calls |
| `elab-story.md` command | `.claude/commands/elab-story.md` (v5.1.0) | In scope; Phase 1 currently instructs writing `_implementation/ELAB.yaml` to disk — after KFMB-5010 completes, writers use KB; this story updates the command to use KB read path |
| `dev-code-review.md` command | `.claude/commands/dev-code-review.md` (v6.0.0) | In scope; Phase 0 validates evidence artifact via `kb_read_artifact` — already partially KB-native. Phase 1 reads `evidence` artifact from KB. Needs review artifact pass-through updated |
| `qa-verify-story.md` command | `.claude/commands/qa-verify-story.md` (v3.0.0) | In scope; outputs `verification` KB artifact. Phase 0 setup checks story status. |
| `dev-fix-story.md` command | `.claude/commands/dev-fix-story.md` (v2.1.0) | In scope; spawns phase leaders sequentially. Uses KB state updates (`kb_update_story_status`). |
| `scrum-master.md` command | `.claude/commands/scrum-master.md` (v3.0.0) | In scope as meta-orchestrator. Phase 1 loop leader reads context from `_workflow/AGENT-CONTEXT.md` — this filesystem path needs to be assessed |
| `precondition-check.md` command | `.claude/commands/precondition-check.md` (v1.0.0) | In scope; currently validates preconditions by checking filesystem artifacts (`_implementation/ELAB.yaml`, `_implementation/VERIFICATION.yaml`). Must migrate to KB artifact checks |
| `context-init.md` command | `.claude/commands/context-init.md` (v1.0.0) | In scope; writes `AGENT-CONTEXT.md` to `_implementation/` directory. Must migrate to KB-based context storage |
| `implement-stories.sh` | `scripts/implement-stories.sh` | In scope; `is_elaborated()` checks for `_implementation/ELAB.yaml` or `_implementation/` directory; `is_implemented()` checks for `_implementation/EVIDENCE.yaml`; `is_reviewed()` checks for `_implementation/REVIEW.yaml`. All three filesystem checks must migrate to KB state queries |
| `implement-dispatcher.sh` | `scripts/implement-dispatcher.sh` | In scope; same `is_elaborated()` filesystem heuristic and `EVIDENCE.yaml` check — both must migrate to KB state queries |
| `generate-stories.sh` | `scripts/generate-stories.sh` | In scope; `ALREADY_GENERATED` checks `acceptance_criteria` in `story.yaml`; `ALREADY_ELABORATED` checks `_implementation/ELAB.yaml` or `_implementation/` — must migrate to KB story state queries |
| `scripts/lib/resolve-plan.sh` | `scripts/lib/resolve-plan.sh` | Already partially KB-native via `kb_get_plan` lookup and `kb_list_stories` story discovery. Filesystem fallback for `stories.index.md` is transitional |
| KB artifact types registered | `packages/backend/orchestrator/src/artifacts/` | Zod-validated: checkpoint, scope, plan, evidence, review, qa-verify, audit-findings — these are the artifact types KFMB-5010/5020 will have migrated to KB by the time KFMB-5030 runs |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|--------------|
| KFMB-5010 | Migrate _implementation/ Writer Agents to kb_write_artifact | Hard dependency (must complete first): once agents write artifacts to KB, orchestrators can reference KB artifact IDs instead of filesystem paths |
| KFMB-5020 | Migrate _implementation/ Reader Agents to kb_read_artifact | Hard dependency (must complete first): once reader agents use `kb_read_artifact`, orchestrators can pass `story_id` as context key instead of filesystem paths |
| KFMB-3030 | Eliminate stories.index.md — Script Updates | Parallel-path story that also touches the same shell scripts; coordination needed to avoid conflicting edits to `implement-stories.sh`, `generate-stories.sh` |
| KFMB-4020 | Stage Directory Elimination — precondition-check, context-init, and Script State Detection | Direct overlap: also migrates precondition-check and context-init commands, and script state detection heuristics. KFMB-5030 scope must be clearly differentiated from KFMB-4020 (KFMB-4020 handles stage directory elimination; KFMB-5030 handles artifact reference migration) |
| KFMB-6010 | Script Modernization | Downstream dependent: KFMB-6010 cannot start until KFMB-5030 is complete (see critical path in stories.index.md). Any leftover filesystem artifact references left by KFMB-5030 will become KFMB-6010's responsibility |

### Constraints to Respect

- KFMB-5030 MUST NOT start implementation until KFMB-5020 is complete; the reader agents that the orchestrators invoke must already use `kb_read_artifact` before the orchestrators can be updated to reference KB artifacts.
- The shell scripts (`implement-stories.sh`, `implement-dispatcher.sh`, `generate-stories.sh`) run in bash environments outside Claude sessions — they cannot make MCP tool calls directly. The migration must delegate state queries to `claude -p` subprocess calls (the same pattern as `resolve-plan.sh` already uses for `kb_get_plan`) or use `kb_update_story_status`-derived state from the stories table.
- Protected: All production DB schemas in `packages/backend/database-schema/`; KB server API surface; `@repo/db` client package.
- The `precondition-check.md` and `context-init.md` commands are called by setup leaders across many workflows — any signature changes must be backward-compatible.
- KFMB-4020 overlap: KFMB-5030 focuses on migrating _implementation/ artifact references (ELAB.yaml, EVIDENCE.yaml, REVIEW.yaml checks) to KB queries; KFMB-4020 focuses on eliminating stage directories. If both target the same files (implement-stories.sh, precondition-check.md), the stories must coordinate scope boundaries during elaboration.

---

## Retrieved Context

### Related Endpoints
None — this story touches only command orchestrator files (`.claude/commands/`), shell scripts (`scripts/`), and the artifact reference passing patterns within them. No HTTP API endpoints are modified.

### Related Components

| Component | Path | Role in Migration |
|-----------|------|-------------------|
| `dev-implement-story.md` | `.claude/commands/dev-implement-story.md` | Step 1.3 reads checkpoint from KB; Steps 4-8 pass context via KB artifact IDs. Ensure all agent spawn prompts pass `story_id` not filesystem paths |
| `elab-story.md` | `.claude/commands/elab-story.md` | Phase 1 passes ELAB output location to analyst; must reference KB artifact instead of `_implementation/ELAB.yaml` path |
| `dev-code-review.md` | `.claude/commands/dev-code-review.md` | Phase 0 validates evidence via `kb_read_artifact` — already correct. Phase 2 aggregate leader context must pass KB artifact reference not file path |
| `qa-verify-story.md` | `.claude/commands/qa-verify-story.md` | Phase 0 setup currently checks `_implementation/VERIFICATION.yaml` — must migrate to KB artifact check |
| `dev-fix-story.md` | `.claude/commands/dev-fix-story.md` | Phase leaders need KB-based artifact context threading |
| `scrum-master.md` | `.claude/commands/scrum-master.md` | Phase 1 reads `_workflow/AGENT-CONTEXT.md` from filesystem — needs KB equivalent |
| `precondition-check.md` | `.claude/commands/precondition-check.md` | `--requires=_implementation/ELAB.yaml` and `--requires=_implementation/VERIFICATION.yaml` checks must become KB artifact existence queries |
| `context-init.md` | `.claude/commands/context-init.md` | Writes `AGENT-CONTEXT.md` to `_implementation/`; must shift to KB context artifact or scrum-master workflow KB artifact |
| `implement-stories.sh` | `scripts/implement-stories.sh` | `is_elaborated()`, `is_implemented()`, `is_reviewed()` functions use filesystem stat; must migrate to KB story state (`kb_get_story` or `kb_list_stories` with state filter) via `claude -p` subprocess |
| `implement-dispatcher.sh` | `scripts/implement-dispatcher.sh` | Same `is_elaborated()` and EVIDENCE.yaml check as implement-stories.sh |
| `generate-stories.sh` | `scripts/generate-stories.sh` | `ALREADY_GENERATED` and `ALREADY_ELABORATED` checks use filesystem stat; must migrate to KB story state |
| `scripts/lib/resolve-plan.sh` | `scripts/lib/resolve-plan.sh` | `discover_stories()` already supports KB fallback via `kb_list_stories`; `resolve_plan()` already uses `kb_get_plan` with filesystem fallback |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `resolve_plan()` pattern in `resolve-plan.sh` | Already calls `claude -p "Call kb_get_plan..."` as a subprocess; use same pattern for `claude -p "Call kb_get_story..."` to replace filesystem stat checks in `is_elaborated()` / `is_implemented()` / `is_reviewed()` |
| `discover_stories()` KB fallback in `resolve-plan.sh` | Already calls `claude -p "Call kb_list_stories..."` — reuse exact pattern for story state queries |
| `kb_read_artifact` pattern in `dev-code-review.md` Phase 0 | Already demonstrates the correct KB artifact existence check pattern; replicate for `precondition-check.md` |
| `kb_update_story_status` state management | Already used in `dev-implement-story.md` Step 0.6, `dev-code-review.md` Step 0.6 — the state written here is what shell scripts should read back |
| KFMB-2010/2020/2030 implementation (post-completion) | Parallel Phase 2 stories that completed the same type of filesystem-to-KB migration for bootstrap commands and agents — use as pattern references |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Bash subprocess KB query pattern | `scripts/lib/resolve-plan.sh` | `resolve_plan()` and `discover_stories()` show the exact `claude -p` subprocess approach for querying KB from shell scripts — the same pattern must replace `is_elaborated()`, `is_implemented()`, `is_reviewed()` filesystem checks |
| Command orchestrator KB artifact read | `.claude/commands/dev-code-review.md` | Phase 0 already reads `evidence` artifact via `kb_read_artifact` as the authoritative existence check — the canonical template for migrating `precondition-check.md` |
| Command with KB state claim/release | `.claude/commands/dev-implement-story.md` | Step 0.6 (`kb_update_story_status`) and Step 1.3 (`kb_read_artifact` for checkpoint) show the full KB-integrated orchestrator pattern |
| Frontmatter `kb_artifacts` listing | `.claude/commands/dev-implement-story.md` | Lists `checkpoint`, `scope`, `plan`, `context`, `evidence`, `review` — shows how orchestrators should declare KB artifact dependencies rather than filesystem paths |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0190]** Frontmatter `kb_tools` list must be updated atomically with call-site migration (category: pattern)
  - *Applies because*: Command files like `dev-implement-story.md`, `elab-story.md`, and `qa-verify-story.md` have frontmatter (e.g., `kb_artifacts`) listing artifact dependencies. When artifact reference passing is migrated from filesystem paths to KB IDs, the frontmatter declarations must be updated in the same commit to stay accurate.

- **[WKFL-010]** EVIDENCE.yaml may live in worktrees rather than main branch during QA (category: workflow)
  - *Applies because*: The shell scripts' `is_implemented()` check (`grep -q "in.progress\|ready.for.review"` in `story.yaml` + `_implementation/EVIDENCE.yaml` presence) is fragile because EVIDENCE.yaml artifacts may not be merged into main even after a story completes. After migration, KB state (`in_progress`, `ready_for_review`) is the authoritative source — not filesystem presence.

- **[WKFL lesson]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard (category: workflow)
  - *Applies because*: Shell script KB queries via `claude -p` subprocesses can fail if the KB is unavailable. Scripts must have a fallback behavior (e.g., treat story as not-ready and skip, log to a failure file) rather than crashing the entire pipeline run.

- **[KBAR-0190]** Non-code agent stories: PROOF-based QA via direct file spot-checking (category: testing)
  - *Applies because*: This story modifies `.claude/commands/` markdown files and bash scripts — no TypeScript code. QA must spot-check the command files and scripts directly rather than relying on unit tests.

### Blockers to Avoid (from past stories)

- Do not start implementation before KFMB-5020 is complete — shell script state detection cannot query KB artifact existence until the writer agents (KFMB-5010) and reader agents (KFMB-5020) have migrated; the KB state will not be populated.
- Do not modify `implement-stories.sh`, `implement-dispatcher.sh`, or `generate-stories.sh` without coordinating with KFMB-3030 (which also targets these scripts for `stories.index.md` elimination). Conflicting changes in the same PR would cause merge failures.
- Do not conflate KFMB-5030 scope with KFMB-4020 scope: KFMB-4020 eliminates stage directory references from precondition-check and context-init; KFMB-5030 migrates artifact filesystem references to KB calls. The two stories must partition these changes cleanly.
- Do not assume shell scripts can call MCP tools directly — they cannot. KB queries from bash must go through `claude -p` subprocess calls (same as `resolve-plan.sh`).
- Do not remove the `--requires=_implementation/ELAB.yaml` check from `precondition-check.md` without confirming that the KB elaboration artifact is reliably populated by KFMB-5010 and readable by KFMB-5020 for all calling agents.
- Do not update `context-init.md` to skip the `_implementation/` directory creation without auditing all downstream agents that read `AGENT-CONTEXT.md` — they will break silently.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration test verifying KB state queries from shell scripts must use the real KB DB (port 5433), not mocked MCP responses |
| ADR-006 | E2E Tests Required in Dev Phase | Skip condition applies: `frontend_impacted: false`; no UI-facing ACs. No Playwright tests required for this story. |

ADR-001, ADR-002, ADR-003, ADR-004 are not relevant — this story does not touch HTTP API paths, infrastructure, CDN/images, or authentication.

### Patterns to Follow

- Shell script KB query via `claude -p` subprocess: `result=$(claude -p "Call kb_get_story..." --allowedTools "mcp__knowledge-base__kb_get_story" --output-format text 2>/dev/null)` — same idiom as `resolve-plan.sh`'s `kb_get_plan` call.
- KB story state as the source of truth for elaboration/implementation readiness: `state == "ready"` for elaborated, `state == "in_progress"` or `state == "ready_for_review"` for implemented, `state == "in_review"` for reviewed.
- Command orchestrators pass `story_id` as the primary context key when spawning agents; agents retrieve artifact content via `kb_read_artifact({ story_id, artifact_type })` — not via filesystem path parameters.
- Precondition checks migrate from `--requires=FILEPATH` file-existence assertions to `kb_read_artifact` existence assertions with graceful null handling.
- Frontmatter `kb_artifacts` declaration in command files accurately lists all artifact types the orchestrator reads or writes.

### Patterns to Avoid

- Do not use raw `grep` or `ls` on `_implementation/` directories in shell scripts to determine story readiness — these produce false results when artifacts live in KB.
- Do not pass filesystem artifact paths as parameters between command orchestrators and agents after migration — pass `story_id` only.
- Do not introduce new MCP tool dependencies not already available in the `ALLOWED_TOOLS` list of the shell scripts; the existing `mcp__knowledge-base__kb_get_story`, `mcp__knowledge-base__kb_list_stories`, `mcp__knowledge-base__kb_read_artifact` are already permitted.
- Do not add synchronous `claude -p` KB queries to the hot loop of `implement-dispatcher.sh` polling — this would add 2-5 seconds of latency per poll cycle per story.

---

## Conflict Analysis

### Conflict: Hard Dependency — KFMB-5020 Not Yet Complete
- **Severity**: warning
- **Description**: KFMB-5030 depends on KFMB-5020 (reader agents migrated). Until reader agents use `kb_read_artifact`, there is no KB artifact content for the command orchestrators to reference via KB. Running KFMB-5030 before KFMB-5020 would produce orchestrators that reference KB artifacts that may not exist.
- **Resolution Hint**: Gate implementation on KFMB-5020 reaching `needs-code-review` or later. Verify that key KB artifacts (checkpoint, scope, plan, evidence, review) are being written and read correctly end-to-end before migrating the orchestrators.
- **Source**: index dependency graph

### Conflict: Scope Overlap — KFMB-4020 Targets Same Files
- **Severity**: warning
- **Description**: KFMB-4020 (Stage Directory Elimination — precondition-check, context-init, and Script State Detection) explicitly targets `precondition-check.md`, `context-init.md`, and script state detection heuristics — the same files in scope for KFMB-5030. Both stories are in Backlog and neither has a formal ordering constraint between them (KFMB-4020 depends on KFMB-4010, KFMB-5030 depends on KFMB-5020 — different dependency chains). This creates a risk that both stories attempt to modify the same files independently.
- **Resolution Hint**: During elaboration, explicitly partition scope: KFMB-4020 owns the stage-directory elimination aspect (removing `--in-stage` checks, eliminating directory-based state transitions); KFMB-5030 owns the artifact reference migration aspect (replacing `--requires=_implementation/ELAB.yaml` with KB artifact queries). Coordinate with the KFMB-4020 assignee or sequence these stories to run serially if both overlap in the same files.
- **Source**: stories.index.md phase 4 / phase 3 overlap analysis

### Conflict: Shell Script Architecture Constraint
- **Severity**: warning
- **Description**: The `implement-stories.sh`, `implement-dispatcher.sh`, and `generate-stories.sh` scripts cannot make MCP tool calls directly — they run in bash outside of Claude sessions. Any KB state query must go through a `claude -p` subprocess, which adds ~2-5 seconds per call. In a tight dispatch loop (implement-dispatcher.sh polls every 20s with up to 6 parallel stories), adding 3 subprocess calls per `is_elaborated()` check per story could noticeably degrade dispatcher performance.
- **Resolution Hint**: Batch state queries where possible. Alternatively, consider that the `kb_update_story_status` calls already made by agents (Step 0.6 in dev-implement-story.md, qa-verify-story.md, etc.) populate a reliable DB state. The scripts could be updated to query story state once per story per poll cycle (not per-check), or to use a lightweight `claude -p` call that fetches all pending-story states in one `kb_list_stories` call.
- **Source**: architectural analysis of resolve-plan.sh pattern and dispatcher polling behavior

---

## Story Seed

### Title
Migrate _implementation/ Command Orchestrators to KB Artifact References

### Description

The implementation pipeline is driven by a set of command orchestrators (`.claude/commands/`) and shell scripts (`scripts/`) that coordinate the flow of stories through elaboration, implementation, code review, QA, and fix cycles. These orchestrators currently reference `_implementation/` artifacts by filesystem path: shell scripts check for `_implementation/ELAB.yaml` to determine elaboration readiness, `_implementation/EVIDENCE.yaml` to detect completion, and `_implementation/REVIEW.yaml` for review state. Command files pass artifact paths between phases and validate artifact existence by checking filesystem locations.

KFMB-5010 and KFMB-5020 will have migrated all writer and reader agents to use `kb_write_artifact` and `kb_read_artifact` respectively, making the KB the authoritative store for all `_implementation/` artifacts. After those stories complete, the filesystem paths become stale references that no longer reflect where artifacts actually live.

This story migrates the command orchestrators and shell scripts to consume KB artifact state rather than filesystem state:

1. **Shell script state detection** (`implement-stories.sh`, `implement-dispatcher.sh`, `generate-stories.sh`): Replace `is_elaborated()`, `is_implemented()`, `is_reviewed()` filesystem checks with KB story-state queries via `claude -p` subprocess calls (the same pattern already used by `resolve-plan.sh`).
2. **Command precondition checks** (`precondition-check.md`): Replace `--requires=_implementation/ELAB.yaml` / `--requires=_implementation/VERIFICATION.yaml` file-existence checks with `kb_read_artifact` artifact-existence assertions.
3. **Command context initialization** (`context-init.md`): Evaluate and migrate the `AGENT-CONTEXT.md` write pattern to KB context artifact storage, or document clearly why the filesystem path is still required.
4. **Inter-phase artifact passing** (`dev-implement-story.md`, `elab-story.md`, `dev-code-review.md`, `qa-verify-story.md`, `dev-fix-story.md`, `scrum-master.md`): Audit each command's agent spawn prompts to confirm artifact context is passed as `story_id` + `artifact_type` references rather than filesystem paths; update any remaining path-based references.

### Initial Acceptance Criteria

- [ ] AC-1: `implement-stories.sh` `is_elaborated()`, `is_implemented()`, and `is_reviewed()` functions no longer check the filesystem; instead they query KB story state via `claude -p` subprocess (using `kb_get_story` or `kb_list_stories`) and return based on KB `state` field values.
- [ ] AC-2: `implement-dispatcher.sh` `is_elaborated()` and the `EVIDENCE.yaml` readiness check are migrated to KB story state queries via the same `claude -p` subprocess pattern.
- [ ] AC-3: `generate-stories.sh` `ALREADY_GENERATED` and `ALREADY_ELABORATED` detection logic migrates from filesystem stat to KB story state queries (`state == "ready"` or later for elaborated; `acceptance_criteria` presence via `kb_get_story` for generated).
- [ ] AC-4: `precondition-check.md` `--requires=_implementation/ELAB.yaml` check (for `/dev-implement-story` preconditions) is replaced by a `kb_read_artifact({ story_id, artifact_type: "elaboration" })` existence check.
- [ ] AC-5: `precondition-check.md` `--requires=_implementation/VERIFICATION.yaml` check (for `/qa-verify-story` preconditions) is replaced by a `kb_read_artifact({ story_id, artifact_type: "verification" })` existence check.
- [ ] AC-6: All command orchestrators in scope (`dev-implement-story.md`, `elab-story.md`, `dev-code-review.md`, `qa-verify-story.md`, `dev-fix-story.md`, `scrum-master.md`) spawn agents with `story_id` as the primary artifact context key; no remaining agent spawn prompts pass raw `_implementation/` filesystem paths as the primary artifact reference.
- [ ] AC-7: `context-init.md` either: (a) is updated to write context to a KB artifact (`context` type) rather than `_implementation/AGENT-CONTEXT.md`, or (b) retains filesystem write with documented rationale for why KB migration is deferred (e.g., scrum-master workflow reads it from disk and cannot be migrated atomically in this story).
- [ ] AC-8: The `precondition-check.md` Precondition Sets table is updated to reflect KB-based checks for all commands currently referencing filesystem artifact paths.
- [ ] AC-9: Shell scripts continue to function correctly (correct story filtering, no false positives/negatives) after migration — verified by dry-run output matching expected story selection behavior.
- [ ] AC-10: The `ALLOWED_TOOLS` list in all three shell scripts includes all KB tools needed for state queries (`mcp__knowledge-base__kb_get_story` or `mcp__knowledge-base__kb_list_stories`) without adding tools not already available.

### Non-Goals

- This story does NOT modify the agent workers invoked by the orchestrators (e.g., `dev-setup-leader.agent.md`, `elab-analyst.agent.md`) — those are in scope for KFMB-5010 and KFMB-5020.
- This story does NOT eliminate stage directories (`backlog/`, `elaboration/`, `ready-to-work/`, etc.) from the filesystem — that is KFMB-4010 and KFMB-4020.
- This story does NOT eliminate `stories.index.md` file references — that is KFMB-3020 and KFMB-3030.
- This story does NOT add new MCP tool registrations to the KB server — tools are assumed to already exist from prior KFMB phases.
- This story does NOT remove the `_implementation/` directory structure from the repository — that is deferred to KFMB-6010/6020.
- This story does NOT migrate `_pm/` artifact reads/writes — that is KFMB-5040/5050.
- This story does NOT modify `story-move.md` or `story-update.md` commands — those are in scope for KFMB-4010.
- Existing `resolve-plan.sh` KB fallback logic is NOT modified — it is already KB-native and serves as the reference pattern.

### Reuse Plan

- **Components**: `kb_get_story`, `kb_list_stories`, `kb_read_artifact` MCP tools — all existing, no new registration needed. `claude -p` subprocess pattern from `resolve-plan.sh`.
- **Patterns**: `resolve-plan.sh` `kb_get_plan` + `kb_list_stories` subprocess pattern (direct reuse for shell script state queries); `dev-code-review.md` Phase 0 `kb_read_artifact` existence check (template for precondition-check.md migration); KFMB-2010/2020/2030 completed implementations as analogous pattern references.
- **Packages**: No TypeScript packages modified — this is a docs+scripts story targeting `.claude/commands/` markdown files and `scripts/*.sh` bash scripts.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is docs+scripts only (command `.md` files and bash scripts). No runnable unit tests apply to the command instruction files. The test plan should focus on:

- **Shell script dry-run verification**: Run `./scripts/implement-stories.sh kb-first-migration --dry-run` and `./scripts/generate-stories.sh kb-first-migration --dry-run` after migration; confirm story selection matches expected elaboration state from KB (not filesystem).
- **Precondition check regression**: Run `/precondition-check {STORY_ID} --command=dev-implement-story` against a story that is elaborated (KB state `ready`) and one that is not (KB state `backlog`); verify PASS/FAIL verdicts are correct.
- **Precondition check regression (QA)**: Run `/precondition-check {STORY_ID} --command=qa-verify-story` against a story with and without a `verification` KB artifact; verify PASS/FAIL.
- **End-to-end pipeline smoke test**: Run one story through the full pipeline (elab → implement → review → QA) after migration; verify no `_implementation/ELAB.yaml` file-not-found errors in logs.
- **Dispatcher performance**: Run `./scripts/implement-dispatcher.sh {plan-slug} --dry-run` and verify poll cycle latency is not significantly degraded by added `claude -p` subprocess calls.
- ADR-006 skip condition applies: `frontend_impacted: false`, no E2E tests required.
- ADR-005 applies: any integration test that verifies KB state queries must use the real KB database (port 5433).

### For UI/UX Advisor

No UI/UX concerns — this story modifies only internal command orchestrator files and shell scripts used by AI agents and the pipeline automation. No user-facing interface changes.

### For Dev Feasibility

- **Scope**: 7 command files require audit/update (dev-implement-story.md, elab-story.md, dev-code-review.md, qa-verify-story.md, dev-fix-story.md, scrum-master.md, precondition-check.md, context-init.md = 8 files) plus 3 shell scripts (implement-stories.sh, implement-dispatcher.sh, generate-stories.sh). All markdown + bash, no TypeScript build required.
- **Shell script KB query architecture**: The biggest design decision is how shell scripts query KB state. Option A: `claude -p "Call kb_get_story with story_id '${STORY_ID}'..."` subprocess per story (same as resolve-plan.sh, adds ~2-5s per call). Option B: batch query — `claude -p "Call kb_list_stories with prefix '${PREFIX}'..."` once at the start of the run to get all story states, then use the in-memory map. Option B is strongly preferred for the dispatcher's hot poll loop.
- **Context-init.md assessment**: Before implementing AC-7, audit all downstream consumers of `AGENT-CONTEXT.md` (scrum-master-loop-leader reads it; elab-epic-setup-leader; pm-bootstrap-setup-leader; pm-harness-setup-leader). If a clean KB migration path exists for all consumers in this story's scope, implement it. If not, document the deferral clearly and leave the filesystem write with a KB dual-write.
- **Sizing**: `sizing_warning: false` in story.yaml is appropriate — the changes are mechanical (swap filesystem checks for KB calls) and the pattern is clear from resolve-plan.sh. Unlike KFMB-5010/5020 which touched 10+ agents, KFMB-5030 is bounded to the orchestrator layer.
- **KFMB-4020 coordination**: Before beginning implementation, confirm with the KFMB-4020 implementer which files are claimed by each story. Suggested split: KFMB-5030 modifies `--requires=` artifact checks; KFMB-4020 modifies `--in-stage=` directory checks. If both are being worked in the same sprint, implement serially to avoid merge conflicts.
- **Canonical references for implementation**:
  - `scripts/lib/resolve-plan.sh` — authoritative bash `claude -p` KB query pattern
  - `.claude/commands/dev-code-review.md` Phase 0 — authoritative `kb_read_artifact` existence check pattern in a command file
  - `.claude/commands/dev-implement-story.md` Step 0.6 and Step 1.3 — authoritative KB state claim + artifact read pattern in a command orchestrator
