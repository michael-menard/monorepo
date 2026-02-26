# PROOF-APIP-0020

**Generated**: 2026-02-26T00:30:00Z
**Story**: APIP-0020
**Evidence Version**: 1

---

## Summary

This implementation delivers the Supervisor Loop (Plain TypeScript) for the autonomous pipeline architecture. A new `apps/api/pipeline/` app with `PipelineSupervisor` class consumes BullMQ jobs, dispatches them to LangGraph graphs (elaboration/story-creation), enforces wall-clock timeouts, applies error classification, and protects with circuit breakers. All 15 acceptance criteria passed with 38/38 unit tests passing and zero TypeScript errors.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | apps/api/pipeline/package.json created with @repo/pipeline name |
| AC-2 | PASS | BullMQ Worker concurrency: 1 configured in PipelineSupervisor |
| AC-3 | PASS | Thread ID format {storyId}:{stage}:{attemptNumber} implemented (ADR) |
| AC-4 | PASS | Elaboration routes to runElaboration() with synthesized story payload |
| AC-5 | PASS | Story-creation routes to runStoryCreation() with story request payload |
| AC-6 | PASS | Wall-clock timeout via Promise.race() with WallClockTimeoutError |
| AC-7 | PASS | Error classification via isRetryableNodeError() from @repo/orchestrator |
| AC-8 | PASS | Circuit OPEN moves jobs to delayed queue, does not fail |
| AC-9 | PASS | Structured lifecycle events logged on all transitions |
| AC-10 | PASS | Unit tests cover all primary scenarios and error paths |
| AC-11 | PASS | Regression guard: orchestrator test suite 133/133 passing |
| AC-12 | PASS | All 38 unit tests passing, zero TypeScript errors |
| AC-13 | PASS | Zod discriminatedUnion on stage field in job payload schema |
| AC-14 | PASS | NodeCircuitBreaker imported from @repo/orchestrator |
| AC-15 | PASS | WallClockTimeoutError caught before error classifier (two-catch pattern) |

### Detailed Evidence

#### AC-1: Create pipeline app with package.json

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/package.json` - New app created with name @repo/pipeline
- **File**: `apps/api/pipeline/tsconfig.json` - TypeScript configuration

#### AC-2: BullMQ Worker configured

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/index.ts` - Worker concurrency: 1 hardcoded

#### AC-3: Thread ID derivation

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` - Thread ID: `${job.data.storyId}:${job.data.stage}:${job.data.attemptNumber}`

#### AC-4: Elaboration dispatcher

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` - Routes to runElaboration() with payload as SynthesizedStory

#### AC-5: Story-creation dispatcher

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` - Routes to runStoryCreation() with payload as StoryRequest

#### AC-6: Wall-clock timeout

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/wall-clock-timeout.ts` - WallClockTimeoutError and withWallClockTimeout() wrapper via Promise.race()
- **Test**: HP-6 timeout test passes with default 600_000ms timeout

#### AC-7: Error classification

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` - Uses isRetryableNodeError() from @repo/orchestrator
- **Test**: HP-4 PERMANENT and TRANSIENT classification tested

#### AC-8: Circuit breaker protection

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts` - Per-graph NodeCircuitBreaker instances
- **Test**: HP-8 circuit OPEN moves job to delayed, no fail

#### AC-9: Structured logging

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` - Events: job_received, dispatching, completed, timeout, failed, circuit_open
- **Test**: HP-9 event emission verified

#### AC-10: Unit test coverage

**Status**: PASS

**Evidence Items**:
- **Test**: 3 test files with 38/38 tests passing (dispatch-router.test.ts, wall-clock-timeout.test.ts, circuit-breakers.test.ts)

#### AC-11: Orchestrator regression

**Status**: PASS

**Evidence Items**:
- **Command**: `pnpm test --filter @repo/orchestrator` - 134 test files, 3352 tests total, 133 files passed (1 skipped), 3334 tests passed (18 skipped), 0 failures

#### AC-12: Build verification

**Status**: PASS

**Evidence Items**:
- **Command**: `pnpm run type-check --filter @repo/pipeline` - 0 TypeScript errors
- **Command**: `pnpm test --filter @repo/pipeline` - 38/38 tests passed

#### AC-13: Discriminated union schema

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/__types__/index.ts` - JobPayloadSchema uses z.discriminatedUnion('stage', [...])

#### AC-14: Circuit breaker source

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts` - Imports NodeCircuitBreaker from @repo/orchestrator

#### AC-15: Two-catch error handling

**Status**: PASS

**Evidence Items**:
- **File**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` - WallClockTimeoutError caught in try-catch, isRetryableNodeError() in else branch
- **Test**: HP-5 timeout priority over classifier verified

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `apps/api/pipeline/package.json` | create | 25 |
| `apps/api/pipeline/tsconfig.json` | create | 18 |
| `apps/api/pipeline/vitest.config.ts` | create | 12 |
| `apps/api/pipeline/src/supervisor/__types__/index.ts` | create | 85 |
| `apps/api/pipeline/src/supervisor/index.ts` | create | 95 |
| `apps/api/pipeline/src/supervisor/dispatch-router.ts` | create | 240 |
| `apps/api/pipeline/src/supervisor/wall-clock-timeout.ts` | create | 28 |
| `apps/api/pipeline/src/supervisor/graph-circuit-breakers.ts` | create | 35 |
| `apps/api/pipeline/src/supervisor/graph-types.ts` | create | 18 |
| `apps/api/pipeline/src/supervisor/graph-loader.ts` | create | 22 |
| `apps/api/pipeline/src/supervisor/__tests__/dispatch-router.test.ts` | create | 320 |
| `apps/api/pipeline/src/supervisor/__tests__/wall-clock-timeout.test.ts` | create | 95 |
| `apps/api/pipeline/src/supervisor/__tests__/circuit-breakers.test.ts` | create | 110 |
| `apps/api/pipeline/src/supervisor/__tests__/integration/supervisor.integration.test.ts` | create | 85 |

**Total**: 14 files, 1168 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm run type-check --filter @repo/pipeline` | 0 TypeScript errors | 2026-02-25T23:55:00Z |
| `pnpm test --filter @repo/pipeline` | 38/38 passed | 2026-02-25T23:56:30Z |
| `pnpm test --filter @repo/orchestrator` | 3352 tests (3334 passed, 18 skipped), 0 failures | 2026-02-25T23:58:00Z |
| `pnpm build --filter @repo/pipeline` | Build succeeded | 2026-02-25T23:59:00Z |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 38 | 0 |
| Integration | 1 | 0 |
| Orchestrator Regression | 3334 | 0 |

**Coverage**: dispatch-router.ts, wall-clock-timeout.ts, circuit-breakers.ts all exercised across unit and integration tests.

---

## Implementation Notes

### Notable Decisions

- **Thread ID Format (ADR)**: {storyId}:{stage}:{attemptNumber} provides irreversible audit trail for job processing chains.
- **Two-Catch Pattern**: WallClockTimeoutError caught first (highest priority), then isRetryableNodeError() for all other failures ensures timeouts are not misclassified.
- **Zod Discriminated Union**: Job payload schema uses discriminatedUnion on 'stage' field (elaboration|story-creation) for type-safe routing.
- **Per-Graph Circuit Breakers**: One NodeCircuitBreaker per graph (elaboration/story-creation) prevents cascade failures without cascading circuit breaker state.
- **BullMQ Concurrency: 1**: Single job processor at a time enforces sequential processing to maintain thread ID ordering and prevent race conditions.

### Known Deviations

None.

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Setup | 18000 | 8500 | 26500 |
| Plan | 45000 | 22000 | 67000 |
| Execute | 120000 | 58000 | 178000 |
| Proof | 35000 | 12500 | 47500 |
| **Total** | **218000** | **101000** | **319000** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
