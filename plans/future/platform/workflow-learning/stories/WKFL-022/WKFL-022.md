---
story_id: WKFL-022
title: Parallelize Code Review Specialists and Story Fanout Workers
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: medium
depends_on:
  - LNGG-006  # blocked until LangGraph migration completes
---

# WKFL-022: Parallelize Code Review Specialists and Story Fanout Workers

## Context

The codebase has a well-established parallel spawn pattern (single message, `run_in_background: true`, collect via `TaskOutput`). The implementation phase already uses it correctly — backend and frontend coders spawn in parallel. PM story generation already parallelizes its four worker agents.

Two high-value phases have not adopted this pattern:

**Code Review Phase — 10 sequential specialists:**
The `review-aggregate-leader` spawns specialist reviewers — lint, typecheck, build, syntax, style-compliance, security, React patterns, reusability, TypeScript, accessibility — one after another. Each specialist reads the same set of `touched_files` and produces its own independent YAML output. There are zero data dependencies between them. Running them sequentially adds roughly 10–18 minutes to every story cycle (1–2 minutes per specialist × 10). Parallelizing reduces this to the time of the single longest check (~2–4 minutes).

**Story Fanout Phase — 3 sequential perspective workers:**
`pm-story-generation-leader` spawns the three fanout agents — PM perspective, UX perspective, QA perspective — to identify gaps from different angles. Each reads the same story seed and writes to an independent YAML file. Again, no data dependency. Currently spawned sequentially. Parallelizing saves 4–6 minutes per story generation cycle.

Neither change requires new tooling or architecture — only a refactor of the Task spawn order in two leader agent files.

## Goal

Refactor `review-aggregate-leader` to spawn all specialist reviewers in a single parallel message. Refactor `pm-story-generation-leader` to spawn all three fanout perspective workers in a single parallel message. Measure the time reduction with before/after checkpoint timestamps.

## Non-goals

- Parallelizing phases that have genuine sequential dependencies (contracts after backend, elaboration after PM generation)
- Adding new specialist reviewers (this story is spawn-order only)
- Changes to what individual specialist workers do internally

## Scope

### Change 1: Code Review Phase — Parallel Specialist Spawn

In `review-aggregate-leader.agent.md`, replace the sequential specialist spawn sequence with a single parallel message:

**Before (sequential):**
```
Step 2a: Spawn lint checker → wait → collect
Step 2b: Spawn typecheck → wait → collect
Step 2c: Spawn build verifier → wait → collect
... (10 separate spawns and waits)
```

**After (parallel):**
```
Step 2: Spawn ALL code review specialists (SINGLE MESSAGE)

Spawn in single message with run_in_background: true:
  1. code-review-lint         → task_id: lint_task
  2. code-review-typecheck    → task_id: typecheck_task
  3. code-review-build        → task_id: build_task
  4. code-review-syntax       → task_id: syntax_task
  5. code-review-style-compliance → task_id: style_task
  6. code-review-security     → task_id: security_task
  7. code-review-react        → task_id: react_task
  8. code-review-reusability  → task_id: reusability_task
  9. code-review-typescript   → task_id: ts_task
  10. code-review-accessibility → task_id: a11y_task

Step 3: Collect all results
Wait for all task IDs via TaskOutput.
For each: parse result, extract findings YAML, note COMPLETE | BLOCKED | FAILED.
Proceed to Step 4 (aggregate) once all collected.
```

If any specialist task fails, log a warning and continue — a single specialist failure should not block the review phase. Mark that specialist's output as `status: error` in the aggregate.

### Change 2: Story Fanout Phase — Parallel Perspective Spawn

In `pm-story-generation-leader.agent.md`, locate the fanout spawn sequence and consolidate into a single message:

**Before (sequential):**
```
Spawn story-fanout-pm → wait
Spawn story-fanout-ux → wait
Spawn story-fanout-qa → wait
```

**After (parallel):**
```
Spawn ALL fanout workers (SINGLE MESSAGE) with run_in_background: true:
  1. story-fanout-pm → FANOUT-PM.yaml
  2. story-fanout-ux → FANOUT-UX.yaml
  3. story-fanout-qa → FANOUT-QA.yaml

Collect all three via TaskOutput before proceeding to gap-hygiene-agent.
```

### Timing Instrumentation

Add checkpoint timestamps around both phases so the time saving is measurable:

```
# In review-aggregate-leader:
Log: "Code review specialists spawned at {timestamp}"
# ... after all TaskOutput collected:
Log: "Code review complete at {timestamp} — {elapsed}s total"
```

```
# In pm-story-generation-leader:
Log: "Fanout workers spawned at {timestamp}"
# ... after all collected:
Log: "Fanout complete at {timestamp} — {elapsed}s total"
```

These timestamps appear in CHECKPOINT.yaml via the token-log, enabling before/after comparison.

### Packages Affected

- `.claude/agents/review-aggregate-leader.agent.md` — consolidate 10 sequential spawns into single parallel message
- `.claude/agents/pm-story-generation-leader.agent.md` — consolidate 3 fanout spawns into single parallel message

## Acceptance Criteria

- [ ] The code review phase spawns all 10 specialist agents in a single message using `run_in_background: true`
- [ ] The code review phase collects all 10 results via `TaskOutput` before proceeding to aggregation
- [ ] A single specialist failure (e.g., lint checker crashes) does not block the overall code review phase — that specialist is marked `status: error` in the aggregate
- [ ] The story fanout phase spawns all 3 perspective workers in a single message
- [ ] The story fanout phase collects all 3 results before proceeding to the gap-hygiene-agent
- [ ] End-to-end code review phase wall-clock time is reduced by ≥ 40% versus sequential baseline (measured from checkpoint timestamps)
- [ ] End-to-end story generation wall-clock time is reduced by ≥ 3 minutes on stories with all three fanout workers active
- [ ] The aggregate output from both phases is identical in content to the sequential version — parallelization does not change what is produced
