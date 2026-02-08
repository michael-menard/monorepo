# Orchestration & Operations

This document covers error handling, parallel workers, state transitions, token management, idempotency, model assignments, and observability.

## Table of Contents

- [Error Handling](#error-handling)
- [Parallel Worker Configuration](#parallel-worker-configuration)
- [State Transition Matrix](#state-transition-matrix)
- [Token Management](#token-management)
- [Idempotency](#idempotency)
- [Model Assignments](#model-assignments)
- [Observability](#observability)
- [Planned Enhancements](#planned-enhancements)
- [Open Questions](#open-questions)
- [Known Gaps](#known-gaps)

---

## Error Handling

> **Source of Truth:** `packages/backend/orchestrator/src/errors/workflow-errors.ts`
> See also: `docs/generated/ERROR-TYPES.md`

### Error Types

| Error Type | Description | Recovery |
|------------|-------------|----------|
| `AGENT_SPAWN_FAILED` | Task tool failed to spawn agent | Retry once, then FAIL phase |
| `AGENT_TIMEOUT` | Agent exceeded time limit | Kill agent, mark phase TIMEOUT |
| `MALFORMED_OUTPUT` | Agent output doesn't match schema | Log error, retry with clarification |
| `PRECONDITION_FAILED` | Required input missing | FAIL with specific missing item |
| `EXTERNAL_SERVICE_DOWN` | KB, git, or other service unavailable | Use fallback or FAIL with advisory |

### Per-Phase Error Contracts

Each phase leader MUST handle:
1. Worker spawn failures (retry once)
2. Worker timeout (configurable, default 5 minutes)
3. Partial worker success (document policy)
4. Malformed artifacts (validate before accepting)

### Circuit Breaker Pattern

After 3 consecutive failures of the same type within a phase:
1. Stop retrying
2. Write `ERROR-LOG.yaml` to `_implementation/`
3. Set story status to `blocked`
4. Require manual intervention

### Retry Configuration

| Error Type | Retryable | Max Retries | Backoff |
|------------|-----------|-------------|---------|
| `AGENT_SPAWN_FAILED` | Yes | 1 | 2s fixed |
| `AGENT_TIMEOUT` | No | 0 | — |
| `MALFORMED_OUTPUT` | Yes | 2 | 1s fixed |
| `PRECONDITION_FAILED` | No | 0 | — |
| `EXTERNAL_SERVICE_DOWN` | Yes | 3 | Exponential (5s base, 60s max) |

---

## Parallel Worker Configuration

> **Source of Truth:** `packages/backend/orchestrator/src/utils/parallel-executor.ts`

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `worker_timeout_ms` | 300000 (5 min) | Max time per worker |
| `partial_pass_threshold` | 1.0 | Fraction of workers that must pass (1.0 = all) |
| `fail_fast` | false | Stop all workers on first failure |

### Partial Failure Policy

- **All 6 PASS** → Overall PASS
- **5/6 PASS, 1 TIMEOUT** → Overall PASS with warning (timeout worker logged)
- **4/6 PASS, 2 FAIL** → Overall FAIL (requires all to pass)
- **Any ERROR** → Overall ERROR (not FAIL), requires investigation

### Code Review Workers (6 Parallel)

```
/dev-code-review
    │
    ├─→ code-review-lint.agent.md ────────┐
    ├─→ code-review-syntax.agent.md ──────┤
    ├─→ code-review-style-compliance.agent.md ─┤  parallel
    ├─→ code-review-security.agent.md ────┤
    ├─→ code-review-typecheck.agent.md ───┤
    └─→ code-review-build.agent.md ───────┘
            │
            └─→ Aggregate to VERIFICATION.yaml
```

---

## State Transition Matrix

> **Source of Truth:** `packages/backend/orchestrator/src/state/story-state-machine.ts`
> See also: `docs/generated/STATUS-ENUM.md`

### All 17 Statuses

| Status | Directory | Description |
|--------|-----------|-------------|
| `pending` | `backlog/` | Not yet generated |
| `generated` | `backlog/` | Story file created by PM |
| `in-elaboration` | `elaboration/` | QA audit in progress |
| `needs-refinement` | `elaboration/` | Failed elab, needs PM fixes |
| `needs-split` | `elaboration/` | Too large, requires splitting |
| `ready-to-work` | `ready-to-work/` | Passed elab, awaiting development |
| `in-progress` | `in-progress/` | Dev actively implementing |
| `ready-for-code-review` | `in-progress/` | Implementation done, awaiting review |
| `code-review-failed` | `in-progress/` | Code review failed, needs fixes |
| `ready-for-qa` | `ready-for-qa/` | Dev complete, awaiting QA |
| `in-qa` | `UAT/` | QA verification in progress |
| `needs-work` | `in-progress/` | QA failed, needs dev fixes |
| `uat` | `UAT/` | QA passed, awaiting gate |
| `completed` | `UAT/` | QA gate passed, merged |
| `blocked` | `blocked/` | Waiting on external dependency |
| `cancelled` | `cancelled/` | No longer needed |
| `superseded` | `cancelled/` | Replaced by split stories |

### Valid Transitions

| From Status | Valid Transitions | Trigger |
|-------------|-------------------|---------|
| `pending` | `generated` | `/pm-story generate` |
| `generated` | `in-elaboration` | `/elab-story` starts |
| `in-elaboration` | `ready-to-work`, `needs-refinement`, `needs-split` | `/elab-story` verdict |
| `needs-refinement` | `generated` | `/pm-fix-story` completes |
| `needs-split` | `generated` (for splits), `superseded` | `/pm-story split` completes |
| `ready-to-work` | `in-progress` | `/dev-implement-story` starts |
| `in-progress` | `ready-for-code-review`, `ready-for-qa`, `blocked` | Implementation progress |
| `ready-for-code-review` | `ready-for-qa`, `code-review-failed` | Review verdict |
| `code-review-failed` | `in-progress` | `/dev-fix-story` starts |
| `ready-for-qa` | `in-qa` | `/qa-verify-story` starts |
| `in-qa` | `uat`, `needs-work` | Verification verdict |
| `needs-work` | `in-progress` | Developer starts fixing |
| `uat` | `completed`, `in-progress` | `/qa-gate` verdict |
| `completed` | _(terminal)_ | — |
| `blocked` | `in-progress`, `ready-to-work`, `cancelled` | Manual unblock |
| `cancelled` | _(terminal)_ | — |
| `superseded` | _(terminal)_ | — |

### Blocked Status Recovery

Stories enter `blocked` when:
- Max review iterations exceeded without `--force-continue`
- External dependency unavailable
- Manual block by user

To unblock:
1. Resolve the blocking condition
2. Run `/story-update {STORY} in-progress`
3. Resume with `/dev-implement-story {STORY}`

---

## Token Management

> **Source of Truth:** `packages/backend/orchestrator/src/utils/token-budget.ts`
> See also: `docs/generated/TOKEN-LIMITS.md`

### Budget Thresholds

| Phase | Warning Threshold | Hard Limit |
|-------|-------------------|------------|
| PM Story Generation | 50K tokens | 100K tokens |
| Elaboration | 30K tokens | 60K tokens |
| Dev Implementation | 200K tokens | 500K tokens |
| Code Review | 50K tokens | 100K tokens |
| QA Verification | 50K tokens | 100K tokens |

### Enforcement Levels

| Level | Behavior |
|-------|----------|
| `advisory` | Log to TOKEN-LOG.md, continue |
| `warning` | Log + display warning to user, continue |
| `soft_gate` | Log + require user confirmation to continue |
| `hard_gate` | Log + FAIL phase, require budget increase |

### Configuration

Set in story frontmatter:

```yaml
token_budget:
  enforcement: warning  # advisory | warning | soft_gate | hard_gate
  multiplier: 1.5       # Allow 1.5x default thresholds
```

### Tracking

Each phase leader MUST:
1. Call `/token-log` at phase completion
2. Check cumulative tokens against budget
3. Apply enforcement level if exceeded

---

## Idempotency

> **Source of Truth:** `packages/backend/orchestrator/src/utils/idempotency.ts`

### Command Behavior on Re-run

| Command | If Already Complete | Behavior |
|---------|---------------------|----------|
| `/pm-story generate` | Story exists | ERROR: "Story already exists. Use --force to overwrite." |
| `/elab-story` | ELAB file exists | SKIP: "Already elaborated. Use --force to re-run." |
| `/dev-implement-story` | PROOF exists | RESUME: Auto-detect stage, continue from there |
| `/dev-code-review` | VERIFICATION.yaml exists | RE-RUN: Always re-runs (code may have changed) |
| `/qa-verify-story` | Status is `uat` | SKIP: "Already verified." |
| `/qa-gate` | Gate file exists | RE-RUN: Always re-runs (may have new evidence) |
| `/wt-finish` | Branch merged | ERROR: "Already merged." |

### Force Flags

- `--force` — Overwrite existing artifacts, re-run from scratch
- `--skip-existing` — Skip phases that have artifacts, don't fail

### Artifact Locking

During execution, phases write a `.phase-lock` file to `_implementation/`:

```yaml
phase: dev-implementation
command: /dev-implement-story
startedAt: 2026-02-01T12:00:00Z
pid: 12345
```

- If lock exists and is < 1 hour old: Command fails with "Phase in progress"
- If lock is > 1 hour old: Considered stale and ignored

---

## Model Assignments

> **Source of Truth:** `.claude/config/model-assignments.yaml`
> **TypeScript Consumer:** `packages/backend/orchestrator/src/config/model-assignments.ts`
> See also: `docs/generated/MODEL-ASSIGNMENTS.md`

### Agent Model Matrix

| Agent Type | Model | Rationale |
|------------|-------|-----------|
| **Setup Leaders** | haiku | Simple validation, low complexity |
| **Work Leaders** | sonnet | Complex analysis and synthesis |
| **Workers (code review)** | haiku | Focused single-check validation |
| **Workers (code generation)** | sonnet | Code generation requires capability |
| **Completion Leaders** | haiku | Status updates, artifact writes |

### Model Selection Criteria

| Complexity | Model | Use Case |
|------------|-------|----------|
| Simple validation | haiku | Setup leaders, completion leaders, simple checks |
| Analysis/reasoning | sonnet | Workers that analyze code, make decisions |
| Complex judgment | opus | Reserved for critical decisions (rarely needed) |

---

## Observability

> **Source of Truth:** `packages/backend/orchestrator/src/observability/tracer.ts`, `metrics.ts`

### Trace Points

Each phase emits traces to `_implementation/TRACE.jsonl`:

```json
{"event": "phase_start", "phase": "dev-setup", "timestamp": "...", "storyId": "WISH-001"}
{"event": "agent_spawn", "agent": "dev-setup-leader", "model": "haiku", "timestamp": "..."}
{"event": "tool_call", "tool": "Read", "path": "/path/to/file", "timestamp": "..."}
{"event": "agent_complete", "agent": "dev-setup-leader", "tokensInput": 5000, "tokensOutput": 1234, "durationMs": 12340, "timestamp": "..."}
{"event": "phase_complete", "phase": "dev-setup", "status": "PASS", "durationMs": 15000, "timestamp": "..."}
```

### Metrics

Collected in `_implementation/METRICS.yaml`:

```yaml
story_id: WISH-001
started_at: 2026-02-01T12:00:00Z
completed_at: 2026-02-01T12:30:00Z
status: completed
totals:
  tokens: 125000
  duration_ms: 1800000
  agent_spawns: 15
  tool_calls: 234
phases:
  - name: dev-setup
    status: PASS
    duration_ms: 12340
    tokens_input: 5000
    tokens_output: 1234
    agent_spawns: 1
    tool_calls: 15
```

### Log Levels

- `DEBUG` — Tool calls, artifact reads/writes
- `INFO` — Phase transitions, verdicts
- `WARN` — Threshold exceeded, retries
- `ERROR` — Failures, blocked states

---

## Planned Enhancements

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| LangGraph orchestration | High | Planned | Automate workflow phases via `packages/orchestrator` (see `wrkf` epic) |
| Parallel story execution | Medium | Planned | Enable multiple stories to progress concurrently with dependency tracking |
| Evidence bundle schema | Medium | Planned | Formalize `EVIDENCE.md` format for cross-phase consumption |
| Token budget enforcement | Low | **Documented** | See [Token Management](#token-management) section |
| Metrics dashboard | Low | Planned | Aggregate story metrics (cycle time, token costs, gate pass rates) |
| Autonomous decision management | Medium | **Documented** | See [autonomous-decisions.md](./autonomous-decisions.md) |
| Context caching system | Medium | **Documented** | See [context-caching.md](./context-caching.md) |
| HiTL reduction | High | **Documented** | Decision classification + auto-accept logic reduces interrupts |
| Batch processing | Medium | **Documented** | `/workflow-batch` command for non-critical decisions |
| Preference learning | Low | **Documented** | System learns from user decisions over time |
| Expert Agent Intelligence | High | **Documented** | See [agent-system.md](./agent-system.md#expert-agent-intelligence) |
| Remaining agent enhancements | Medium | In Progress | Apply expert framework to remaining specialist agents |

---

## Open Questions

1. **How should cross-story dependencies be handled during parallel execution?**
   - Current: Manual dependency tracking in stories index
   - Proposed: Automated blocking based on story status

2. **Should elaboration be optional for trivial stories?**
   - Current: All stories require elaboration PASS
   - Consideration: Allow "fast-track" for < 3 AC stories

3. **How do we handle mid-implementation scope changes?**
   - Current: Return to PM phase, re-elaborate
   - Issue: Loses implementation progress and context
   - **New consideration:** Session cache could preserve partial context

4. **What triggers automated learnings extraction?**
   - Current: Manual append by Learnings agent
   - Proposed: Pattern detection from token summaries and gate decisions
   - **New consideration:** Auto-accept patterns could inform learnings

5. **Should code review and QA verify be parallelizable?**
   - Current: Sequential (code review → QA verify)
   - Consideration: Independent evidence gathering, merge at gate

6. **What is the optimal cache TTL for each tier?** *(New)*
   - Current: Static 24h, Domain 4h, Session 30min
   - Consideration: May need adjustment based on metrics

7. **How should preference conflicts be resolved?** *(New)*
   - Current: Most recent preference wins
   - Consideration: Could use confidence weighting or user preference

---

## Known Gaps

- [ ] No automated rollback on FAIL gate (manual revert required)
- [ ] No integration with external issue trackers (Jira, Linear)
- [ ] No PR auto-creation from gate PASS
- [ ] No Slack/Discord notifications for phase transitions
- [ ] No support for "hotfix" workflow bypassing full lifecycle
- [ ] Cache generators (`pnpm cache:generate:*`) not yet implemented
- [ ] Decision classifier TypeScript implementation pending
- [ ] Preference learning auto-update logic not yet implemented
- [ ] `/workflow-batch` command functional but not integrated with `dev-implement-story`
- [x] Expert intelligence framework documented and implemented for 6 agents
- [ ] Expert intelligence pending for remaining ~10 specialist agents
