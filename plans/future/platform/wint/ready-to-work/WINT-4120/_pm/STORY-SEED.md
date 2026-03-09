---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4120

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 4 cohesion infrastructure (WINT-4010, WINT-4020, WINT-4050, WINT-4060, WINT-4070, WINT-4090 all completed after baseline). All dependency story context retrieved directly from story files.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| Knowledge Base (pgvector) | deployed | KB artifacts (evidence, checkpoint) are the source of truth in `qa-verify-story` and `dev-implement-story` workflows |
| Orchestrator YAML Artifacts | deployed | Zod-validated schemas for evidence, checkpoint, plan, scope — the integration points for cohesion checks |
| Workflow scripts (`qa-verify-story`, `dev-implement-story`) | deployed | These are the two integration surfaces for WINT-4120 |
| graph-checker agent (`WINT-4060`) | needs-code-review | Produces `graph-check-results.json` from graph queries and rules — the upstream detector agent |
| cohesion-prosecutor agent (`WINT-4070`) | needs-code-review | Produces `prosecution-verdict.json` — PO-layer reasoning on capability completeness |
| evidence-judge agent (`WINT-4090`) | in-qa | Produces `ac-verdict.json` — adversarial challenge of QA evidence quality |
| Cohesion rules seed (`WINT-4050`) | uat | Seeded 4 canonical active cohesion rules into `wint.rules`; these are what graph-checker evaluates against |
| `@repo/sidecar-rules-registry` | deployed (via WINT-4020/WINT-4050) | `getRules()`, `proposeRule()`, `promoteRule()` — rules lifecycle API |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-4070 (cohesion-prosecutor) | needs-code-review | HIGH — this story is a direct input agent for WINT-4120; its `prosecution-verdict.json` must be consumed by WINT-4120 |
| WINT-4090 (evidence-judge) | in-qa | HIGH — this story is a direct input agent for WINT-4120; its `ac-verdict.json` must be consumed by WINT-4120 |

### Constraints to Respect

- `qa-verify-story` and `dev-implement-story` are heavily used production workflows — changes must be backward compatible and gracefully degrade when Phase 4 agents are unavailable or produce no results
- Both dependency agents (WINT-4070 and WINT-4090) are not yet fully released (in-qa and needs-code-review) — WINT-4120 must be designed to work when they are available and degrade gracefully when they are not
- `MUST handle failures gracefully` — per story risk notes; cohesion check failures must never block story delivery unless explicitly designated as a hard gate
- `dev-implement-story` is docs-only for orchestration; actual work happens in spawned agents — integration hooks must be added at the command/orchestrator level, not inside sub-agent files
- Protected: `qa-verify-verification-leader.agent.md`, `qa-verify-setup-leader.agent.md`, `qa-verify-completion-leader.agent.md`, `dev-implement-story` command structure — changes must be additive/non-breaking

---

## Retrieved Context

### Related Endpoints

None — this story is agent/workflow integration only. No HTTP endpoints are created or modified.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `qa-verify-story` command | `.claude/commands/qa-verify-story.md` | Integration target — cohesion check spawns here |
| `dev-implement-story` command | `.claude/commands/dev-implement-story.md` | Integration target — cohesion check spawns here |
| `qa-verify-verification-leader` | `.claude/agents/qa-verify-verification-leader.agent.md` | Phase 1 of qa-verify; evidence-judge call most likely added here or as new phase |
| `graph-checker` agent | `.claude/agents/graph-checker.agent.md` | Upstream detector for cohesion violations — produces `graph-check-results.json` |
| `cohesion-prosecutor` agent | `.claude/agents/cohesion-prosecutor.agent.md` | Upstream PO-layer evaluator — produces `prosecution-verdict.json` |
| `evidence-judge` agent | `.claude/agents/evidence-judge.agent.md` | Upstream QA adversarial agent — produces `ac-verdict.json` |
| `cohesion-check` command | `.claude/commands/cohesion-check.md` (WINT-4110) | The manual `/cohesion-check` command; WINT-4120 is the automated companion |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `graph-checker.agent.md` spawn pattern | Model how to spawn graph-checker as a Task sub-agent with story context |
| `cohesion-prosecutor.agent.md` spawn pattern | Model how to invoke prosecutor after graph-checker; consumes `graph-check-results.json` |
| `evidence-judge.agent.md` spawn pattern | Model how to invoke evidence-judge during QA phase; reads `EVIDENCE.yaml` |
| Existing Phase spawn patterns in `dev-implement-story` | Follow same `Task tool: subagent_type: "general-purpose"` spawn format used for dev phases |
| `qa-verify-story` guard pattern (Step 0.6) | Model for guard logic — check result before proceeding, STOP on unrecoverable failure |
| `WINT-4110` cohesion-check command | The manual version of this integration; WINT-4120 automates what WINT-4110 makes manually accessible |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent spawn in QA orchestrator | `.claude/commands/qa-verify-story.md` | Canonical pattern for spawning Phase N agents with story context; Task tool format, wait for signal, handle BLOCKED/FAILED |
| Agent spawn in dev orchestrator | `.claude/commands/dev-implement-story.md` | Shows how to add new phases to the dev workflow; Step numbering, signal handling, flags like `--skip-worktree` for graceful degradation |
| graph-checker agent output contract | `.claude/agents/graph-checker.agent.md` | Defines `graph-check-results.json` schema — this is what WINT-4120 must route to the cohesion-prosecutor |
| evidence-judge agent output contract | `.claude/agents/evidence-judge.agent.md` | Defines `ac-verdict.json` schema and `overall_verdict` field — the signal WINT-4120 uses to influence QA gate decisions |

---

## Knowledge Context

### Lessons Learned

No KB lesson search performed (knowledge base query not executed in this seed run). ADR constraints loaded from `plans/stories/ADR-LOG.md`.

### Blockers to Avoid (from past stories)

- Workflow commands changed without backward compatibility consideration — always add flags or graceful degradation so existing callers are not broken
- Hard gates that block delivery when upstream agents fail — per risk notes, cohesion check failures must be surfaced as warnings/advisories, not hard blocks (at least in v1.0)
- Tightly coupling to agents that are still in review — WINT-4070 and WINT-4090 are not fully released; spawn them defensively and handle null/missing output files

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services; if integration tests are written for workflow hooks, they must use real agent invocations or manual fixture YAML files |
| ADR-006 | E2E Tests Required in Dev Phase | `dev-implement-story` already has E2E gate; WINT-4120 additions must not interfere with E2E gate logic |

### Patterns to Follow

- Task-tool spawn pattern: `subagent_type: "general-purpose"`, `model: haiku` for detection agents, wait for exact completion signal
- Signal-based coordination: check for `GRAPH-CHECKER COMPLETE`, `PROSECUTION COMPLETE`, `EVIDENCE-JUDGE COMPLETE` — route on signal type
- Graceful degradation: if upstream agent produces `BLOCKED` or no output file, emit WARNING and continue workflow — do not fail the story
- Evidence-first: WINT-4120 consumes the output JSON files that agents write to `{story_dir}/_implementation/`; it does not re-run detection

### Patterns to Avoid

- Do NOT make cohesion check a synchronous hard gate that blocks all stories if the graph is empty (WINT-4030 may not have run in all environments)
- Do NOT modify protected agent files (`qa-verify-verification-leader`, `qa-verify-setup-leader`, `qa-verify-completion-leader`) — add integration as new phases or hooks in orchestrator commands
- Do NOT re-implement graph query logic in the workflow command — reuse existing agents
- Do NOT embed prosecution verdict logic directly in the workflow — the prosecutor agent is responsible for that reasoning

---

## Conflict Analysis

### Conflict: Dependency agents not yet fully released

- **Severity**: warning
- **Description**: WINT-4070 (cohesion-prosecutor) is in `needs-code-review` and WINT-4090 (evidence-judge) is in `in-qa`. WINT-4120 depends on both. If WINT-4120 is worked before these stories complete review, the integration may be authored against agents that still change.
- **Resolution Hint**: Implement WINT-4120 only after WINT-4070 and WINT-4090 reach `uat` status. The dependency constraint (`Depends On: WINT-4050, WINT-4090`) in the index only lists WINT-4090, not WINT-4070 — the cohesion-prosecutor is also a practical dependency. Consider waiting for WINT-4070 to pass code review as well, or design integration to be resilient to prosecution-verdict.json being absent.

### Conflict: WINT-4110 cohesion-check command also deferred

- **Severity**: warning
- **Description**: WINT-4110 creates the manual `/cohesion-check` command and explicitly defers auto-run to WINT-4120. The WINT-4110 story file notes "Auto-run at story completion is explicitly deferred to WINT-4120." This creates a dependency on WINT-4110's command structure that WINT-4120 may want to reuse or reference. WINT-4110 is in `created` status.
- **Resolution Hint**: WINT-4120 can proceed independently of WINT-4110 by spawning the graph-checker agent directly (as WINT-4110 does), rather than calling the `/cohesion-check` command. This avoids a command-invocation dependency and makes WINT-4120 more robust. Reference WINT-4110 design for spawn patterns but do not chain command calls.

---

## Story Seed

### Title

Integrate Cohesion Checks into Workflow (WINT-4120)

### Description

**Context:** The WINT Phase 4 adversarial subsystem has produced three detection/evaluation agents:
- `graph-checker` (WINT-4060): queries the feature graph and active rules, produces `graph-check-results.json`
- `cohesion-prosecutor` (WINT-4070): applies PO-layer reasoning to capability coverage, produces `prosecution-verdict.json`
- `evidence-judge` (WINT-4090): adversarially challenges QA evidence quality, produces `ac-verdict.json`

These agents exist as standalone workers but are not yet integrated into the automated workflow. Currently, cohesion enforcement is purely manual (the `/cohesion-check` command in WINT-4110 covers the on-demand case).

**Problem:** Implementation and QA workflows (`dev-implement-story`, `qa-verify-story`) complete without any automated cohesion or evidence-quality check. A story can pass code review and QA without ever being evaluated by the Phase 4 adversarial layer.

**Proposed Solution:** Add automated cohesion check hooks into both workflows:

1. **In `dev-implement-story`**: After implementation (Phase 2 execute) and before or alongside the review phase, spawn the `graph-checker` and `cohesion-prosecutor` agents. Surface violations as advisory warnings in the evidence/review artifacts. Do not block story completion on cohesion violations in v1.0 — surface them for human decision.

2. **In `qa-verify-story`**: After or alongside the `qa-verify-verification-leader` phase, spawn the `evidence-judge` agent to evaluate `EVIDENCE.yaml` evidence quality. Use `overall_verdict` to influence the QA gate: `PASS` → no impact; `CHALLENGE` → add to QA report as advisory; `FAIL` → flag as QA issue (may trigger `VERIFICATION FAIL` if hard-gate mode is enabled).

Both integrations must degrade gracefully: if the upstream agents produce `BLOCKED` signals or their output files are absent, log a warning and continue the workflow without failing the story.

### Initial Acceptance Criteria

- [ ] **AC-1:** `dev-implement-story` spawns `graph-checker` agent for the story's feature after Phase 2 execution completes; `graph-check-results.json` is produced in `{story_dir}/_implementation/`
- [ ] **AC-2:** `dev-implement-story` spawns `cohesion-prosecutor` agent after graph-checker completes (receives `graph-check-results.json` as optional input); `prosecution-verdict.json` is produced in `{story_dir}/_implementation/`
- [ ] **AC-3:** `qa-verify-story` spawns `evidence-judge` agent during or after the verification phase; `ac-verdict.json` is produced in `{story_dir}/_implementation/`
- [ ] **AC-4:** Graceful degradation — if `graph-checker` emits `GRAPH-CHECKER BLOCKED` or `graph-check-results.json` is absent, `dev-implement-story` logs a warning and continues without failing the story
- [ ] **AC-5:** Graceful degradation — if `evidence-judge` emits `EVIDENCE-JUDGE BLOCKED` or `ac-verdict.json` is absent, `qa-verify-story` logs a warning and continues without failing the story
- [ ] **AC-6:** When `evidence-judge` produces `overall_verdict: FAIL`, `qa-verify-story` surfaces this as a QA issue in its report (does not silently ignore it)
- [ ] **AC-7:** When `cohesion-prosecutor` produces `verdict: INCOMPLETE-BLOCKED`, `dev-implement-story` surfaces this as an advisory in the review/evidence artifacts
- [ ] **AC-8:** All workflow changes are backward compatible — stories that predate Phase 4 infrastructure (empty graph, no active rules) complete normally; no regression to existing story paths
- [ ] **AC-9:** Integration is documented in the relevant command files (`.claude/commands/qa-verify-story.md`, `.claude/commands/dev-implement-story.md`) with clear step numbers and spawn patterns

### Non-Goals

- Do NOT implement the graph-checker, cohesion-prosecutor, or evidence-judge agents (these are already authored by WINT-4060, WINT-4070, WINT-4090 respectively)
- Do NOT make cohesion violations a hard blocking gate in v1.0 — surface as advisory/warning; hard-gate mode is a future configuration concern
- Do NOT modify the `qa-verify-verification-leader`, `qa-verify-setup-leader`, or `qa-verify-completion-leader` agent files — integration belongs in the orchestrator command
- Do NOT add TypeScript implementation code (this is a docs/command-file-only story)
- Do NOT implement the WINT-4110 `/cohesion-check` command (that story handles manual invocation separately)
- Do NOT implement the Round Table Agent (WINT-4140) — that story handles multi-verdict synthesis
- Do NOT create LangGraph nodes (that is WINT-9050+ territory)

### Reuse Plan

- **Commands**: Extend `.claude/commands/qa-verify-story.md` and `.claude/commands/dev-implement-story.md` following existing phase/step patterns
- **Patterns**: Task-tool spawn pattern from existing qa-verify-story phases; signal-based coordination; graceful degradation flag pattern from `--skip-worktree` in dev-implement-story
- **Agents**: Spawn existing graph-checker, cohesion-prosecutor, evidence-judge agents as Task sub-agents (haiku model for detection agents)
- **Packages**: No new packages; no TypeScript changes required — this story modifies markdown command files only

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story modifies `.md` command/orchestrator files only — no TypeScript code. Testing strategy is manual invocation + verification of workflow output files.
- Key test scenarios: (1) happy path — cohesion agents complete successfully, output files produced; (2) degradation path — graph is empty (WINT-4030 not run), workflow completes with warning; (3) evidence-judge FAIL path — `ac-verdict.json` produced with `overall_verdict: FAIL`, QA report updated.
- E2E is not applicable per ADR-006 (no frontend impact, no UI-facing changes). `frontend_impacted: false`.
- Integration tests should invoke the workflow commands against a story with real Phase 4 agent files available and verify output JSON artifacts are written.

### For UI/UX Advisor

- No UI impact. This story is workflow automation only.
- The only "UX" concern is the output surfaced to human operators in QA reports and dev review summaries — text formatting of advisory warnings and INCOMPLETE-BLOCKED verdicts should be clear and actionable, not just a raw JSON dump.

### For Dev Feasibility

- This is a docs-only story: all work is editing `.claude/commands/qa-verify-story.md` and `.claude/commands/dev-implement-story.md`.
- Key design decision needed: **where exactly in each workflow** the cohesion agents are spawned. Two options for `dev-implement-story`:
  - Option A: New Phase 2.5 (after execute, before review loop) — cleanest separation
  - Option B: Added as steps within the review phase — more complex but reuses existing phase infrastructure
- Option A is recommended for clarity.
- Key design decision for `qa-verify-story`: spawn evidence-judge as Phase 0.5 (before verification) or Phase 1.5 (after verification but before completion). Phase 1.5 is recommended so evidence-judge evaluates the same EVIDENCE.yaml that the verification leader just read.
- No infrastructure changes. No migrations. No new packages.
- Canonical references: `.claude/agents/graph-checker.agent.md` (output schema for what dev workflow receives), `.claude/agents/evidence-judge.agent.md` (output schema for what QA workflow receives), `.claude/commands/qa-verify-story.md` (existing phase spawn pattern to replicate).
