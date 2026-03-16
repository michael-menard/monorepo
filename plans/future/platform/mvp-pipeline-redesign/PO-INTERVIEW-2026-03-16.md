# Product Owner Interview — MVP Pipeline Redesign

**Date:** 2026-03-16
**Purpose:** Deep dive to understand real vision and constraints before redesigning the autonomous workflow system.

---

## Vision Summary

### Core System Purpose

An autonomous software development pipeline that picks up elaborated stories and carries them from `ready` to `UAT` automatically — using LangGraph for execution, BullMQ for scheduling, and the KB as the single source of truth for all stories, artifacts, state, and eventually telemetry.

### What Success Looks Like

A human writes a plan, runs bootstrap and elab (manually or autonomously), and the system takes over — working each story through dev, code review, and QA in dependency order, finishing started work before starting new, escalating failures to stronger models, and flagging only what genuinely requires human judgment. The operator watches from a Kanban board and intervenes only when necessary.

### True MVP Scope

- KB holds canonical story state with correct, enforced transitions
- Human initiates elab; automation starts at `ready`
- BullMQ polls for `ready` stories, respects dependency chain, enforces finish-before-new-start
- LangGraph executes: dev → code review → QA as sequential subgraphs
- Each stage writes required artifacts before state transition is allowed
- Failure escalation: Sonnet → Opus → stuck/blocked for human
- Roadmap/Kanban UI shows honest current state
- Validated against ORCH stories end-to-end

### Post-MVP (confirmed not blocking)

AI telemetry, self-improvement loops, autonomous model selection, simulation mode, system memory, interactive elab decision tracking, fully autonomous bootstrap.

### Most Important Workflow Stages (in order)

1. Story elaboration (ensures dev has clear, implementable input)
2. Dev implementation (core value delivery)
3. Code review (quality gate)
4. QA verification (trust gate)

### Key Design Principles

- KB is the only brain — not the filesystem, not agent memory
- Finish started work before starting new work
- Parallelism only when dependency chain allows
- Atomic transitions — artifact must exist before state advances
- Escalation over abandonment — fail up to stronger model, then to human
- Nothing deleted — everything in backlog has value, sequenced by priority

---

## Constraints Summary

### Hard Constraints

- KB is the sole source of truth for stories, artifacts, and state
- LangGraph is the execution engine (not `.claude` commands long-term)
- BullMQ is the job scheduler/supervisor
- Dependency chain must be respected before any story starts
- Finish started work before starting new work
- Atomic state transitions — no state advance without artifact
- Nothing removed from backlog — prioritization only
- ORCH stories are the first validation target

### Soft Constraints

- Bootstrap and elab can remain manual for MVP
- Model selection for dev agent is an open question (candidates: minimax2.5, qwen-code, llama-coder)
- Parallel capacity limits can be tuned later
- Trigger mechanism can start simple (manual kick or basic poll)

### Known Risks and Blockers

1. **LangGraph has never run end-to-end** — this is the #1 blocker
2. **Three competing state schemas exist in the DB** — stories are frozen in ghost states
3. **Artifact enforcement doesn't exist** — transitions happen without artifact verification
4. **LangGraph graphs may be out of sync with current `.claude` command logic** — a lot has changed since graphs were last worked on
5. **wint/kbar references in codebase** — dead schemas keep reappearing, suggesting live code still references them
6. **No scheduler/trigger exists** — BullMQ supervisor is built but nothing dispatches to it
7. **No operational visibility** — can't answer basic "what's running/blocked/failed" without manual reconstruction
8. **22 draft plans unaudited** — unknown which are load-bearing

### What Must NOT Be Touched

- KB schema (stories, plans, artifacts, plan_story_links, dependency graph)
- LangGraph orchestrator package structure
- BullMQ pipeline supervisor
- Completed stories in any feature (WISH, CDBE, PLATFORM)

### What Is Open for Redesign

- Story state enum and transition trigger
- Scheduler/dispatch logic
- Artifact enforcement mechanism
- Graph-to-command parity (dev, code review, QA)
- Ghost state migration strategy
- wint/kbar reference cleanup

---

## Canonical Story State Model

```
backlog → created → elab → ready → in_progress → needs_code_review
  → ready_for_review → in_review → ready_for_qa → in_qa → UAT
```

Plus terminal/recovery states: `cancelled`, `deferred`, `blocked`, `failed_code_review`, `failed_qa`

### Ghost State Mapping (migration required)

| Current (invalid)   | Maps to                             |
| ------------------- | ----------------------------------- |
| `ready_to_work`     | `ready`                             |
| `uat`               | `UAT`                               |
| `needs_code_review` | `needs_code_review` (add to schema) |

### Artifacts Required Per Stage

| Stage                           | Required Artifact    |
| ------------------------------- | -------------------- |
| elab → ready                    | Elaboration artifact |
| in_progress → needs_code_review | Dev proof artifact   |
| in_review → ready_for_qa        | Code review artifact |
| in_qa → UAT                     | QA artifact          |

---

## Audit Targets (Priority Order for MVP)

### AUDIT-1 — Fix Story State Schema _(CRITICAL)_

Three competing state models. Migration 002 has original states. Migration 022 has trigger with wrong model. 51 stories frozen in ghost states.

**Actions:**

- Find live DB's current story state enum
- Write migration adding missing states: `created`, `elab`, `needs_code_review`, `UAT`
- Update trigger in migration 022 with correct transition rules
- Write migration to move ghost-state stories to canonical equivalents

### AUDIT-2 — Enforce Atomic Artifact Transitions _(CRITICAL)_ ✓ Findings complete 2026-03-16

State transitions happen without artifact verification. Stories advance to states they haven't earned.

**Findings:** `packages/backend/orchestrator/plans/audit/FINDINGS-2026-03-16.yaml`

**Key findings:**

- `kb_update_story_status` has zero artifact pre-condition checks (only terminal-state guard exists)
- None of the three core LangGraph graphs (dev-implement, review, QA) ever call `kb_update_story_status` — state is fully disconnected from graph execution
- Dev-implement `execute` and `collect_evidence` nodes are stubs (WINT-9070/9080)
- Review graph writes REVIEW.yaml to filesystem only — no KB write, no state advance
- Artifact type mismatch: orchestrator uses `codeReview`/`qaVerify`, KB expects `review`/`qa_gate`
- Artifact tables correctly structured for precondition lookups — no schema changes needed

**Recommended enforcement:** Option B (application-level guard in `kb_update_story_status`)

**Implementation plan (5 steps):**

1. Add `ARTIFACT_GATES` map + precondition query to `kb_update_story_status` (critical)
2. Rename orchestrator artifact types `codeReview`→`review`, `qaVerify`→`qa_gate` (high)
3. Add composite index on `artifacts.story_artifacts(story_id, artifact_type)` (high)
4. Connect LangGraph graphs to `kb_update_story_status` — covered by AUDIT-3 (medium)
5. Make KB artifact write non-optional for gated types (medium)

**Actions:**

- ✓ Audited every KB MCP tool that mutates story state
- ✓ Confirmed artifact tables (elaboration, proof, review, qa_gate) are correctly structured
- ⬜ Implement precondition guard in `kb_update_story_status`
- ⬜ Fix artifact type name mismatch in orchestrator
- ⬜ Add composite index migration

### AUDIT-3 — LangGraph Graph Parity with `.claude` Commands _(HIGH)_

LangGraph has never run. Graphs may be out of sync with current command logic.

**Actions:**

- Read `/dev-implement-story`, `/dev-code-review`, `/qa-verify-story` command implementations
- Map each step to LangGraph nodes in the orchestrator package
- Identify gaps: missing nodes, wrong KB calls, stale prompts, outdated state fields
- Verify artifact write + state advance on success
- Verify failure paths: retry, Opus escalation, stuck state

### AUDIT-4 — Build Scheduler Dispatch Loop _(HIGH)_

BullMQ supervisor exists but nothing dispatches to it.

**Actions:**

- Scheduler polls KB for `ready` stories
- Filters to stories with all dependencies in `UAT` or `completed`
- Enforces finish-before-new-start (in-progress stories have priority)
- Dispatches to BullMQ queue
- LangGraph worker runs dev → code review → QA chain
- On completion: advances to `UAT`, re-evaluates queue
- On failure after escalation: moves to `blocked`

### AUDIT-5 — wint/kbar Reference Audit _(MEDIUM)_

Dead schemas keep reappearing. Something still references them.

**Actions:**

- Search all TS, SQL, prompt, config files for `wint.`, `kbar.`, `hitl_decisions`, `context_sessions`, `agent_invocations`
- Remove dead references or redirect to current KB equivalents

### AUDIT-6 — Plan Triage (22 Draft Plans) _(MEDIUM)_

Unknown which draft plans are load-bearing for MVP.

**Actions:**

- For each: does it contain stories that must complete before ORCH stories can run?
- Tag each: `MVP-prerequisite`, `post-MVP`, `superseded`, `unknown`
- Surface any dependencies on ORCH stories or the scheduler build

### AUDIT-7 — Operational Visibility Baseline _(MEDIUM)_

Zero operational visibility today. Need minimum viable ops view before first automated run.

**MVP UI targets:**

- Kanban by state, grouped by plan, auto-refreshing
- Blocked stories view with reason
- Active BullMQ jobs view
- Failed/stuck stories requiring human attention

### AUDIT-8 — Emergency Controls _(MEDIUM — must exist before first run)_

No way to pause, drain, or stop the pipeline.

**Actions:**

- Pause-all: stop BullMQ from dispatching (drain mode)
- Per-story quarantine: mark `blocked` to prevent re-dispatch
- Confirm iteration limits enforced in LangGraph nodes (not just prompts)
- Confirm BullMQ slot limit is configurable without redeployment

---

## Recommendation Priority Flags

| #   | Recommendation                | Priority       | Status                                                                             |
| --- | ----------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| 2   | Deterministic state machine   | **CRITICAL**   | AUDIT-1 ✓ complete (a88a8f54). AUDIT-2 ✓ findings done — guard not yet implemented |
| 1   | Real scheduler / orchestrator | **CRITICAL**   | Missing — dispatch loop does not exist                                             |
| 6   | Standardized agent contracts  | **HIGH**       | Unknown — audit required                                                           |
| 3   | Human interrupt layer         | **HIGH**       | Partially exists (stuck state), needs first-class pause                            |
| 4   | Story confidence score        | **MEDIUM**     | Elab gap analysis exists, not yet a score                                          |
| 9   | Observability layer           | **MEDIUM**     | Roadmap shell exists, needs minimum viable ops view                                |
| 15  | Runaway protection            | **MEDIUM**     | Must exist before first automated run                                              |
| 7   | Complexity budgeting          | **LOW-MEDIUM** | Elab handles this implicitly                                                       |
| 5   | Failure intelligence          | **POST-MVP**   | workflow_events exists, not connected                                              |
| 8   | Work token system             | **POST-MVP**   | BullMQ slots approximate this                                                      |
| 10  | Archive aggressively          | **POST-MVP**   | Plan triage sufficient for now                                                     |
| 11  | Version story templates       | **POST-MVP**   | Worth adding after schema stabilizes                                               |
| 12  | Simulation mode               | **POST-MVP**   | Valuable but not blocking                                                          |
| 13  | System memory                 | **POST-MVP**   | hitl_decisions infrastructure exists, not connected                                |
| 14  | Define true MVP               | **DONE**       | Defined in this session                                                            |

---

## Current State Snapshot (2026-03-16)

### What Is Built

- LangGraph orchestrator package with 23 graph types (never run)
- BullMQ pipeline supervisor with concurrency control (never dispatched to)
- KB MCP server with 50+ tools
- Multiple React frontends (roadmap app in progress)
- 50 plans in KB (4 in-progress, 22 draft, 13 archived)
- ~100+ stories across WISH, PLATFORM, CDBE, ORCH features
- State transition trigger in DB (migration 022 — wrong state model)
- Artifact tables in KB schema

### What Is Broken

- Story state schema: 3 competing models, 51 stories in ghost states
- No scheduler dispatch loop
- LangGraph graphs unverified against current command logic
- No artifact enforcement on transitions
- wint/kbar dead schema references persist

### What Is Missing

- Canonical state model migration
- Scheduler that polls KB and dispatches to BullMQ
- First successful LangGraph run (of any story)
- Emergency pause/drain controls
- Minimum viable operational Kanban

### Immediate Next Work (ORCH stories)

| Story     | Title                                             | State       |
| --------- | ------------------------------------------------- | ----------- |
| ORCH-1010 | Mock LLM Factory and Fixture Builders             | completed ✓ |
| ORCH-2010 | Unit Tests — Conditional Edge Routing             | backlog     |
| ORCH-2020 | Unit Tests — State Validation and Schema          | backlog     |
| ORCH-3010 | Integration Tests — Elaboration Delta Cluster     | backlog     |
| ORCH-3020 | Integration Tests — Story Creation Fanout         | backlog     |
| ORCH-3030 | Integration Tests — Persistence Round-Trip        | backlog     |
| ORCH-4010 | Full Graph Tests — Elaboration and Story Creation | backlog     |
| ORCH-4020 | E2E Pipeline Tests — Bootstrap to Elab            | backlog     |
