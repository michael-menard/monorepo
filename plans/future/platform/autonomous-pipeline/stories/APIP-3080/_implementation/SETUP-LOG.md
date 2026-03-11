# APIP-3080 Setup Log

**Timestamp**: 2026-02-28  
**Phase**: Setup (Iteration 0)  
**Mode**: implement (gen_mode: false)

## Story Overview

**Title**: Parallel Story Concurrency (2-3 Worktrees)  
**Goal**: Extend PipelineSupervisor to dispatch 2-3 concurrent stories via isolated git worktrees and BullMQ Worker concurrency  
**Points**: 5  
**Risk**: High (0.9) - cross-domain complexity, 12 ACs, dependency coordination

## Pre-Setup Checks

- [x] Story status updated to `ready-to-work` (was `elaboration`)
- [x] Elaboration artifact (ELAB.yaml) exists
- [x] Story in `in-progress/APIP-3080/` directory
- [x] No prior checkpoint (fresh setup)
- [x] Dependencies verified: APIP-0020, APIP-0040 available

## Scope Analysis

### Touches
- **Backend**: BullMQ Worker concurrency integration, ConcurrencyController
- **Packages**: orchestrator package (config, supervisor, conflicts)
- **Infrastructure**: Git worktree lifecycle, .gitignore configuration
- **Contracts**: Zod schema for ConcurrencyConfig

### Risk Flags
- **Performance** (HIGH): Concurrent throughput under BullMQ Workers, TokenBucket contention
- **Security** (MEDIUM): Git worktree isolation, path-prefix based conflict detection
- **External APIs** (HIGH): BullMQ real Redis dependency, git subprocess calls

### Dependencies
- **APIP-0020**: PipelineModelRouter, TokenBucket rate limiting, per-story circuit breaker
- **APIP-0040**: PipelineModel data structure, story file I/O patterns

## Critical Constraints

Per CLAUDE.md project guidelines:

1. **Zod-First Types**: All configuration and contract types must use Zod schemas with `z.infer<>`
2. **No Barrel Files**: Import directly from source, not index re-exports
3. **Logging**: Use `@repo/logger`, never `console`
4. **Test Coverage**: Minimum 45% coverage required
5. **Named Exports**: Preferred over default exports
6. **Circuit Breaker Pattern**: Reuse NodeCircuitBreaker from APIP-0020 (per-worktree isolation)
7. **Atomic Writes**: Apply story-file-adapter pattern for git worktree creation/cleanup

## KB Context Applied

### Setup Blockers (from knowledge base queries)
- Real Redis instance required for BullMQ integration tests
  - Set `REDIS_TEST_URL` environment variable
  - Tests must use real Redis, not mocked
  
- Git worktree lifecycle management
  - Concurrent creation/cleanup requires atomic locking
  - Cleanup must handle partial failures gracefully
  
- TokenBucket concurrent safety
  - Verified only under real BullMQ Worker concurrency
  - Promise.all testing is insufficient for AC-7 verification
  
- NodeCircuitBreaker per-worktree isolation
  - Each worktree gets isolated circuit breaker instance
  - Prevents cascading failures across concurrent stories

## Implementation Plan

### Subtask ST-1: Config + Controller
1. Create ConcurrencyConfig Zod schema
   - maxWorktrees: 1-3 (configurable)
   - conflictPolicy: "path-prefix" | "hash-merge" | "sequential"
   - circuitBreaker: reuse CircuitBreakerConfigSchema from APIP-0020
2. Create ConcurrencyController class
   - Slot management: tryAcquireSlot / releaseSlot
   - Thread-safe slot tracking
   - Per-story worktree path registry

### Subtask ST-2: BullMQ Wiring
1. Update PipelineSupervisor.createWorker()
   - Add concurrency parameter to Worker constructor
   - Integrate ConcurrencyController
2. Verify TokenBucket passes concurrency to PipelineModelRouter
3. Integration test with real Redis

### Subtask ST-3: Conflict Detector
1. Create WorktreeConflictDetector class
   - Path-prefix based detection algorithm
   - Conflict resolution policy enforcer
2. Test with simulated concurrent writes

### Subtask ST-4: Circuit Breaker Isolation
1. Instantiate NodeCircuitBreaker per worktree
2. Connect to PipelineSupervisor error handling
3. Verify isolated failures don't trip global breaker

### Subtask ST-5: Integration Tests
1. Real Redis setup validation
2. Concurrent dispatch test (3 stories, real git worktrees)
3. Conflict detection test scenarios
4. Circuit breaker failure isolation test

## Reusable Code References

- **ParallelConfigSchema**: packages/backend/orchestrator/src/utils/parallel-executor.ts
- **NodeCircuitBreaker**: packages/backend/orchestrator/src/runner/circuit-breaker.ts
- **CircuitBreakerConfigSchema**: packages/backend/orchestrator/src/runner/types.ts
- **Atomic Write Pattern**: packages/backend/orchestrator/src/adapters/story-file-adapter.ts

## Next Steps

1. Read full story requirements (APIP-3080.md)
2. Verify APIP-0020 and APIP-0040 are merged
3. Create implementation plan (dev-plan-leader)
4. Execute subtasks in order (dev-execute-leader)
5. Run integration tests with real Redis
6. Code review + verification before QA

## Estimated Duration

- Planning: 30 min (2 stories × complexity)
- Implementation: 2-3 hours
- Testing & Verification: 2 hours
- **Total**: 4.5-5.5 hours

**Risk**: High complexity + dependency coordination may require additional iterations
