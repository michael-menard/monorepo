---
doc_type: stories_index
title: REVI Stories Index
status: active
story_prefix: REVI
created_at: 2026-02-01T00:00:00Z
updated_at: 2026-02-01T20:00:00Z
---

# REVI Stories Index

All stories in this epic use the `REVI-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 15 |
| generated | 0 |
| in-progress | 0 |
| pending | 0 |

---

## Completed Stories

All 15 stories have been implemented.

---

## REVI-001: Synchronization Infrastructure

**Status:** completed
**Depends On:** none
**Phase:** 1
**Priority:** HIGH

**Feature:** Create pre-commit hook, CI check, and doc generation scripts to keep Claude workflow markdown and LangGraph TypeScript schemas synchronized

**Infrastructure:**
- `scripts/check-workflow-sync.ts`
- `scripts/generate-workflow-docs.ts`
- `.husky/pre-commit hook addition`
- `CI workflow for sync verification`

**Goal:** Ensure Claude and LangGraph never drift out of sync by automating validation and doc generation

**Risk Notes:** Foundation for all other stories - must be solid. Requires parsing markdown tables and comparing with Zod schemas.

---

## REVI-002: Error Contracts - LangGraph Schema

**Status:** completed
**Depends On:** REVI-001
**Phase:** 1
**Priority:** HIGH

**Feature:** Create workflow-errors.ts with Zod schemas for all error types (AGENT_SPAWN_FAILED, AGENT_TIMEOUT, MALFORMED_OUTPUT, PRECONDITION_FAILED, EXTERNAL_SERVICE_DOWN)

**Infrastructure:**
- `packages/backend/orchestrator/src/errors/workflow-errors.ts`

**Goal:** Define TypeScript error contracts as the single source of truth for workflow error handling

**Risk Notes:** Must define retry logic, max retries, and circuit breaker behavior in schema

---

## REVI-003: Error Contracts - Claude Documentation

**Status:** completed
**Depends On:** REVI-002
**Phase:** 1
**Priority:** HIGH

**Feature:** Add Error Handling section to FULL_WORKFLOW.md and update all command .md files with error handling contracts referencing error types from generated docs

**Infrastructure:**
- `docs/FULL_WORKFLOW.md § Error Handling`
- `.claude/commands/*.md error sections`

**Goal:** Document error handling contracts in Claude workflow system with references to authoritative TypeScript schemas

**Risk Notes:** Must update 10+ command files - could be tedious. Need to ensure circuit breaker behavior is consistent.

---

## REVI-004: Parallel Worker Synchronization - LangGraph Schema

**Status:** completed
**Depends On:** REVI-001
**Phase:** 1
**Priority:** HIGH

**Feature:** Create parallel-executor.ts with Zod schemas for ParallelConfig (timeout, threshold, fail_fast) and ParallelResult (worker status aggregation)

**Infrastructure:**
- `packages/backend/orchestrator/src/utils/parallel-executor.ts`

**Goal:** Define TypeScript schemas for parallel worker execution with timeout and partial failure handling

**Risk Notes:** Partial pass threshold logic must be clear - what happens with 5/6 PASS vs 4/6 PASS?

---

## REVI-005: Parallel Worker Synchronization - Claude Documentation

**Status:** completed
**Depends On:** REVI-004
**Phase:** 1
**Priority:** HIGH

**Feature:** Add Parallel Worker Configuration section to FULL_WORKFLOW.md and update dev-code-review.md with timeout and aggregation logic

**Infrastructure:**
- `docs/FULL_WORKFLOW.md § Parallel Worker Configuration`
- `.claude/commands/dev-code-review.md`

**Goal:** Document parallel worker semantics in Claude workflow including timeout handling and partial failure policy

**Risk Notes:** Code review command is complex - need to ensure 6-agent aggregation logic is well documented

---

## REVI-006: Complete State Machine - LangGraph Implementation

**Status:** completed
**Depends On:** REVI-001
**Phase:** 2
**Priority:** MEDIUM

**Feature:** Create story-state-machine.ts with all 17 statuses as Zod enum and validTransitions mapping showing all allowed transitions

**Infrastructure:**
- `packages/backend/orchestrator/src/state/story-state-machine.ts`
- `canTransition() validation function`

**Goal:** Implement complete state machine with all 17 statuses and valid transitions as TypeScript schema

**Risk Notes:** Must include all edge cases: blocked, cancelled, needs-split, etc. Ensure no invalid transitions possible.

---

## REVI-007: Complete State Machine - Claude Documentation

**Status:** completed
**Depends On:** REVI-006
**Phase:** 2
**Priority:** MEDIUM

**Feature:** Add State Transition Matrix to FULL_WORKFLOW.md showing all 17 statuses and valid transitions with triggers and blocked/cancelled status handling

**Infrastructure:**
- `docs/FULL_WORKFLOW.md § State Transition Matrix`

**Goal:** Document complete state machine in Claude workflow with all transitions and recovery paths

**Risk Notes:** Large table - need to ensure readability. Blocked/cancelled recovery must be clear.

---

## REVI-008: Token Budget Enforcement - LangGraph Schema

**Status:** completed
**Depends On:** REVI-001
**Phase:** 2
**Priority:** MEDIUM

**Feature:** Create token-budget.ts with budget config schema, phase limits, and enforcement levels (advisory, warning, soft_gate, hard_gate)

**Infrastructure:**
- `packages/backend/orchestrator/src/utils/token-budget.ts`
- `DEFAULT_LIMITS for all 5 phases`

**Goal:** Define TypeScript schemas for token budget enforcement with configurable thresholds and enforcement levels

**Risk Notes:** Must support multiplier config for per-story overrides. Enforcement levels must be clear.

---

## REVI-009: Token Budget Enforcement - Claude Documentation & /token-log Update

**Status:** completed
**Depends On:** REVI-008
**Phase:** 2
**Priority:** MEDIUM

**Feature:** Add Token Management section to FULL_WORKFLOW.md and update /token-log skill to support enforcement levels and budget checks

**Infrastructure:**
- `docs/FULL_WORKFLOW.md § Token Management`
- `.claude/commands/token-log.md enforcement logic`

**Goal:** Document token budget system and update token-log skill to enforce budget thresholds

**Risk Notes:** /token-log skill is used across many phases - need to ensure backward compatibility

---

## REVI-010: Idempotency Guarantees - LangGraph Schema

**Status:** completed
**Depends On:** REVI-001
**Phase:** 2
**Priority:** MEDIUM

**Feature:** Create idempotency.ts with schemas for idempotency modes, phase locks, and checkIdempotency() function

**Infrastructure:**
- `packages/backend/orchestrator/src/utils/idempotency.ts`
- `PhaseLock schema and lock file handling`

**Goal:** Define TypeScript schemas for idempotency modes and phase locking to prevent concurrent execution

**Risk Notes:** Lock timeout detection must be robust. Stale lock handling is critical.

---

## REVI-011: Idempotency Guarantees - Claude Documentation

**Status:** completed
**Depends On:** REVI-010
**Phase:** 2
**Priority:** MEDIUM

**Feature:** Add Idempotency section to FULL_WORKFLOW.md documenting command re-run behavior, force flags, and artifact locking

**Infrastructure:**
- `docs/FULL_WORKFLOW.md § Idempotency`
- `Command behavior table for 7+ commands`

**Goal:** Document idempotency behavior for all commands with clear re-run semantics and force flag usage

**Risk Notes:** Each command has different idempotency behavior - must document all clearly

---

## REVI-012: Centralized Model Assignments

**Status:** completed
**Depends On:** REVI-001
**Phase:** 3
**Priority:** LOW

**Feature:** Create model-assignments.yaml as source of truth and model-assignments.ts consumer, then add Model Assignments section to FULL_WORKFLOW.md

**Infrastructure:**
- `.claude/config/model-assignments.yaml`
- `packages/backend/orchestrator/src/config/model-assignments.ts`
- `docs/FULL_WORKFLOW.md § Model Assignments`

**Goal:** Centralize all agent-to-model assignments in a single config file with TypeScript consumer and documentation

**Risk Notes:** Need to audit all 20+ agent files to extract current model assignments. Migration path needed.

---

## REVI-013: Observability - LangGraph Implementation

**Status:** completed
**Depends On:** REVI-001
**Phase:** 3
**Priority:** LOW

**Feature:** Create tracer.ts and metrics.ts with Zod schemas for trace events (phase_start, agent_spawn, etc.) and phase metrics collection

**Infrastructure:**
- `packages/backend/orchestrator/src/observability/tracer.ts`
- `packages/backend/orchestrator/src/observability/metrics.ts`
- `WorkflowTracer and MetricsCollector classes`

**Goal:** Implement observability infrastructure for tracing workflow execution and collecting phase metrics

**Risk Notes:** JSONL trace format must be parseable by standard tools. Metrics aggregation logic must be correct.

---

## REVI-014: Observability - Claude Documentation

**Status:** completed
**Depends On:** REVI-013
**Phase:** 3
**Priority:** LOW

**Feature:** Add Observability section to FULL_WORKFLOW.md documenting TRACE.jsonl format, METRICS.yaml structure, and log levels

**Infrastructure:**
- `docs/FULL_WORKFLOW.md § Observability`

**Goal:** Document observability system in Claude workflow with trace event types and metrics collection

**Risk Notes:** Must show example trace events and metrics output. Log level guidance must be actionable.

---

## REVI-015: Testing Section - Test Fixtures & Documentation

**Status:** completed
**Depends On:** none
**Phase:** 3
**Priority:** LOW

**Feature:** Create test fixtures for agent testing, add agent testing CLI support, and document Testing Agents section in FULL_WORKFLOW.md

**Infrastructure:**
- `__tests__/fixtures/STORY-TEST/ example structure`
- `docs/FULL_WORKFLOW.md § Testing Agents`
- `Agent testing guide with unit, integration, and regression examples`

**Goal:** Provide testing guidance and fixtures for validating new agents before deployment

**Risk Notes:** Need to define what 'dry-run' means for agents. Fixture structure must be realistic.
