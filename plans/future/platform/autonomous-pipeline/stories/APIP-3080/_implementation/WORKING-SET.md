# APIP-3080 Working Set

**Story**: Parallel Story Concurrency (2-3 Worktrees)  
**Phase**: implementation  
**Iteration**: 0  
**Timestamp**: 2026-02-28

## Current State

### Story Setup Complete
- [x] Story status updated to `ready-to-work`
- [x] CHECKPOINT.yaml written (setup phase, iteration 0)
- [x] SCOPE.yaml written with full risk analysis
- [x] SETUP-LOG.md created with KB context

### Story Files
- `story.yaml` - Story metadata (updated status)
- `APIP-3080.md` - Full story requirements
- `_pm/STORY-SEED.md` - Story seed from PM
- `_pm/dev-feasibility.yaml` - Feasibility analysis
- `_pm/test-plan.yaml` - Test strategy
- `_pm/uiux-notes.yaml` - (N/A for backend)
- `_pm/risk-predictions.yaml` - Risk analysis
- `_implementation/ELAB.yaml` - Elaboration artifact
- `_implementation/CHECKPOINT.yaml` - Setup checkpoint (NEW)
- `_implementation/SCOPE.yaml` - Setup scope (NEW)
- `_implementation/SETUP-LOG.md` - This log (NEW)

## Branch Information

**Repository**: /Users/michaelmenard/Development/monorepo  
**Main Branch**: main  
**Worktree Path**: /Users/michaelmenard/Development/monorepo/tree/story/APIP-3080 (provided)

## Constraints & Standards

### Architectural Constraints
1. **Zod-First Types**: All types via Zod schemas, not TypeScript interfaces
2. **Conflict Policy**: Path-prefix based detection (not hash-based)
3. **Circuit Breaker Isolation**: Per-worktree NodeCircuitBreaker instances
4. **TokenBucket Safety**: Must test under real BullMQ Workers, not Promise.all
5. **Git Worktree Lifecycle**: Atomic creation/cleanup with race condition handling

### Code Standards (from CLAUDE.md)
- Use `@repo/logger` for logging (never console.log)
- Minimum 45% test coverage
- Named exports preferred
- No barrel files (index re-exports)
- Prettier formatting + ESLint passing

### Testing Standards
- Vitest for unit/integration tests
- Real Redis required for BullMQ integration tests (set REDIS_TEST_URL)
- Playwright for E2E (N/A for this story)
- MSW for API mocking (if needed)

## New Files to Create

1. **packages/backend/orchestrator/src/config/concurrency-config.ts**
   - ConcurrencyConfig Zod schema
   - maxWorktrees: number (1-3)
   - conflictPolicy: "path-prefix" | "hash-merge" | "sequential"
   - circuitBreaker: CircuitBreakerConfigSchema
   
2. **packages/backend/orchestrator/src/supervisor/concurrency-controller.ts**
   - ConcurrencyController class
   - Methods: tryAcquireSlot, releaseSlot, getStatus
   - Thread-safe slot management
   
3. **packages/backend/orchestrator/src/conflicts/worktree-conflict-detector.ts**
   - WorktreeConflictDetector class
   - Methods: detectConflict, resolveByPolicy
   
4. **packages/backend/orchestrator/src/__tests__/integration/concurrent-dispatch.test.ts**
   - Real Redis setup
   - 3-story concurrent dispatch test
   - Conflict detection scenarios
   - Circuit breaker isolation test

## Modified Files

1. **packages/backend/orchestrator/src/supervisor/pipeline-supervisor.ts**
   - Add concurrency parameter to createWorker()
   - Integrate ConcurrencyController
   - Verify dependencies: APIP-0020, APIP-0040

2. **.gitignore**
   - Add `.worktrees/` entry to ignore git worktree directories

## Read-Only References (Do Not Modify)

- `packages/backend/orchestrator/src/models/` (APIP-0040 output)
- `packages/backend/orchestrator/src/runner/` (APIP-0020 output)

## Reusable Code Patterns

### 1. ParallelConfigSchema (parallel-executor.ts)
```typescript
// Reference pattern for concurrent configuration
interface ParallelConfig {
  maxConcurrency: number
  strategy: "map" | "queue"
  errorHandling: "fail-fast" | "collect-all"
}
```

### 2. NodeCircuitBreaker (circuit-breaker.ts)
```typescript
// Per-worktree isolation pattern
class NodeCircuitBreaker {
  state: "closed" | "open" | "half-open"
  recordSuccess(): void
  recordFailure(): void
  canExecute(): boolean
}
```

### 3. Atomic Write Pattern (story-file-adapter.ts)
```typescript
// Apply this pattern to worktree creation/cleanup
// 1. Write to temp location
// 2. Atomic move to final location
// 3. Rollback on failure
```

## Next Phase: Planning

**Dev Plan Leader** will:
1. Read full story requirements (APIP-3080.md)
2. Create detailed PLAN.yaml
3. Break down 5 subtasks into implementation steps
4. Estimate complexity per subtask
5. Define success criteria per AC

**Expected Duration**: 30 minutes

## Acceptance Criteria (12 Total)

The 12 ACs will be verified during implementation and code review:
- AC-1 through AC-12: See APIP-3080.md for full details

**Key Critical ACs**:
- AC-7: TokenBucket concurrent safety under real BullMQ Workers
- AC-5: Git worktree isolation with path-prefix conflict detection
- AC-8: Circuit breaker prevents cascading failures across concurrent stories
