# Dev Feasibility Review: LNGG-0040 — Stage Movement Adapter

**Generated**: 2026-02-14
**Story**: LNGG-0040 — Stage Movement Adapter
**Reviewer**: PM Dev Feasibility Agent
**Decision Context**: Option B (Flat Structure with Status Updates)

---

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- LNGG-0010 (Story File Adapter) is COMPLETE and provides `update()` method
- Flat directory structure (WINT-1020) is fully deployed
- No database operations required (file-based only)
- Clear acceptance criteria with testable outcomes
- PathResolver already exists for stage name mapping
- No UI surface (backend adapter only)
- Well-defined scope with clear non-goals

---

## Likely Change Surface (Core Only)

### New Files to Create

**Primary Adapter**:
- `packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts`
  - Main class: `StageMovementAdapter`
  - Methods: `moveStage()`, `batchMoveStage()`, `findStory()`

**Type Definitions** (Zod-first):
- `packages/backend/orchestrator/src/adapters/__types__/stage-types.ts`
  - `StageSchema` - Valid stage names enum
  - `StageTransitionSchema` - Transition graph definition
  - `MoveStageRequestSchema` - Move operation request
  - `MoveStageResultSchema` - Move operation result
  - `BatchMoveStageRequestSchema` - Batch operation request

**Utilities**:
- `packages/backend/orchestrator/src/adapters/utils/stage-validator.ts`
  - `validateTransition()` - Check if transition is valid
  - `isValidStage()` - Verify stage name
  - `getStageGraph()` - Return stage transition DAG

**Tests**:
- `packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.test.ts` (unit)
- `packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.integration.test.ts` (integration)
- `packages/backend/orchestrator/src/adapters/__tests__/fixtures/test-epic/*.md` (test data)

### Existing Files to Modify

**None** (no modifications to existing code required)

**Existing Files to Reuse**:
- `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` (LNGG-0010) - for read/write
- `packages/backend/orchestrator/src/persistence/path-resolver.ts` - for stage directory mapping
- `packages/backend/orchestrator/src/adapters/__types__/story-types.ts` - for StoryArtifactSchema

### Packages Touched

- `@repo/logger` - for structured logging
- `zod` - for type definitions (already in orchestrator)
- `path` (Node.js built-in) - for file path operations

---

## MVP-Critical Risks

### Risk 1: Stage Transition Graph Not Defined

**Why it blocks MVP**: Cannot validate transitions without knowing which are valid.

**Required Mitigation**:
- Define stage transition graph (DAG) in `stage-validator.ts`:
  ```typescript
  const STAGE_GRAPH = {
    'backlog': ['elaboration', 'ready-to-work'],
    'elaboration': ['ready-to-work', 'backlog'],
    'ready-to-work': ['in-progress', 'backlog'],
    'in-progress': ['ready-for-qa', 'backlog'],
    'ready-for-qa': ['UAT', 'in-progress'],
    'UAT': ['in-progress'] // allow rework
  }
  ```
- Document special case: UAT → in-progress (QA failure rework)
- Add validation tests for all valid/invalid transitions

**Decision Required**: PM must confirm stage transition rules before implementation.

### Risk 2: StoryFileAdapter API Contract Unclear

**Why it blocks MVP**: Adapter depends on LNGG-0010's `update()` method signature.

**Required Mitigation**:
- Read LNGG-0010 implementation to verify API:
  - `update(storyId, featureDir, updates)` method exists
  - `updates` parameter supports partial frontmatter updates
  - Returns updated story artifact
- Add integration test to verify API works as expected
- Document API contract in types

**Action**: Review LNGG-0010 code before starting implementation.

### Risk 3: Atomic Operation Guarantee

**Why it blocks MVP**: Concurrent moves to same story could corrupt state.

**Required Mitigation**:
- Verify StoryFileAdapter (LNGG-0010) uses atomic file operations
- Review fs operations: must use atomic writes (temp file + rename pattern)
- Add concurrency test to verify race condition handling
- Document atomicity guarantees in adapter comments

**Action**: Review LNGG-0010 file write implementation for atomicity.

---

## Missing Requirements for MVP

### Requirement 1: Stage Transition Rules

**Concrete Decision Text for PM**:
```markdown
## Stage Transition Rules

**Valid Forward Transitions**:
- backlog → elaboration
- backlog → ready-to-work (skip elaboration)
- elaboration → ready-to-work
- ready-to-work → in-progress
- in-progress → ready-for-qa
- ready-for-qa → UAT

**Valid Backward Transitions** (rework):
- UAT → in-progress (QA failure)
- Any stage → backlog (deprioritize)

**Lateral Transitions**:
- elaboration ↔ backlog (refinement loop)

**Blocked Transitions**:
- Any forward skip >1 stage (except backlog → ready-to-work)
- UAT → ready-for-qa (must return to in-progress for fixes)
```

### Requirement 2: Batch Operation Error Handling

**Concrete Decision Text for PM**:
```markdown
## Batch Move Error Handling

**Option A: Fail Fast** (recommended)
- Stop on first error
- Rollback any completed moves
- Return error immediately

**Option B: Continue on Error**
- Process all stories
- Log errors for failed stories
- Return results object: `{ succeeded: [...], failed: [...] }`

**Recommendation**: Use Option B for better UX (show all failures at once)
```

### Requirement 3: Performance Targets

**Concrete Decision Text for PM**:
```markdown
## Performance Targets

**Single Move**: <100ms
**Batch of 10**: <2s
**Batch of 50**: <5s

**Concurrency Limit**: 10 parallel file operations

If targets not met, implement:
- Parallel processing with concurrency pool
- Caching of StoryFileAdapter instances
```

---

## MVP Evidence Expectations

### Unit Test Coverage

**Target**: >80% line coverage

**Critical Paths to Test**:
- Stage transition validation (all valid/invalid combinations)
- Story location (find story in epic directory)
- Error handling (story not found, invalid stage, permission errors)
- Batch operation logic (parallel processing, error handling)

**Evidence Required**:
```bash
pnpm test:coverage packages/backend/orchestrator/src/adapters/stage-movement-adapter.test.ts
# Output: >80% coverage report
```

### Integration Test Coverage

**Required Tests**:
1. Move story through full lifecycle (6 transitions)
2. Batch move 10 stories (<2s performance)
3. Error cases (not found, invalid transition, permission denied)
4. Edge case: concurrent moves to same story
5. Verify status field updated in YAML frontmatter

**Evidence Required**:
```bash
pnpm test:integration packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.integration.test.ts
# Output: All tests pass, performance assertions met
```

### Structured Logging

**Required Log Events**:
- Stage movement start: `{ storyId, fromStage, toStage }`
- Stage movement success: `{ storyId, toStage, elapsedMs }`
- Stage movement error: `{ storyId, error, errorType }`
- Batch operation summary: `{ totalStories, succeeded, failed }`

**Evidence Required**:
```typescript
// Check logs contain structured data
logger.info('Stage movement completed', {
  storyId: 'TEST-001',
  toStage: 'in-progress',
  elapsedMs: 45
})
```

### API Contract Verification

**Required**: Read LNGG-0010 code and verify:
- `StoryFileAdapter.update()` method signature
- Accepts `{ status: string }` in updates parameter
- Returns updated `StoryArtifact`
- Handles atomic file writes

**Evidence Required**: Link to LNGG-0010 implementation showing API contract.

---

## Implementation Estimates

**Story Points**: 5

**Rationale**:
- Medium complexity (adapter pattern, file operations)
- Clear requirements with Option B decision
- Dependency on LNGG-0010 (complete)
- Well-defined acceptance criteria
- Requires 80%+ test coverage
- Integration tests with real file fixtures

**Time Estimate**: 1-2 days for experienced developer

**Breakdown**:
- 4h: Core adapter implementation
- 3h: Transition validation logic
- 2h: Unit tests (>80% coverage)
- 2h: Integration tests (with fixtures)
- 1h: Documentation and logging

**Confidence**: High (clear scope, no unknowns)

---

## Reuse Plan

### Components to Reuse

**StoryFileAdapter** (LNGG-0010):
```typescript
import { StoryFileAdapter } from './story-file-adapter'

const adapter = new StoryFileAdapter()
await adapter.update(storyId, featureDir, { status: 'in-progress' })
```

**PathResolver**:
```typescript
import { PathResolver } from '../persistence/path-resolver'

const resolver = new PathResolver()
const epicDir = resolver.getEpicDirectory('platform')
```

**StoryArtifactSchema** (from LNGG-0010):
```typescript
import { StoryArtifactSchema } from './__types__/story-types'

// Use for type validation
const story = StoryArtifactSchema.parse(yamlData)
```

### Patterns to Follow

**Adapter Pattern** (from LNGG-0010):
- Pure I/O adapter, no business logic
- Transport-agnostic by design
- Typed error handling
- Structured logging

**Zod-First Types** (CLAUDE.md requirement):
```typescript
import { z } from 'zod'

const StageSchema = z.enum([
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'UAT'
])

type Stage = z.infer<typeof StageSchema>
```

**Component Directory Structure**:
```
stage-movement-adapter/
  index.ts              # Main adapter class
  __types__/
    index.ts            # Zod schemas
  __tests__/
    stage-movement-adapter.test.ts
    stage-movement-adapter.integration.test.ts
    fixtures/           # Test story files
  utils/
    stage-validator.ts  # Transition validation
```

---

## Technical Architecture

### Class Design

```typescript
export class StageMovementAdapter {
  constructor(
    private storyFileAdapter: StoryFileAdapter,
    private pathResolver: PathResolver,
    private logger: Logger
  ) {}

  async moveStage(request: MoveStageRequest): Promise<MoveStageResult> {
    // 1. Validate stage transition
    // 2. Find story (if fromStage not provided)
    // 3. Update status field via StoryFileAdapter
    // 4. Log result
    // 5. Return result
  }

  async batchMoveStage(request: BatchMoveStageRequest): Promise<BatchMoveStageResult> {
    // 1. Validate all requests
    // 2. Process in parallel (concurrency limit: 10)
    // 3. Collect results
    // 4. Log summary
    // 5. Return aggregated results
  }

  private async findStory(storyId: string, featureDir: string): Promise<Story> {
    // Search epic directory for story file
    // Parse YAML frontmatter to get current status
  }
}
```

### Stage Transition Validation

```typescript
// stage-validator.ts
export function validateTransition(from: Stage, to: Stage): boolean {
  const STAGE_GRAPH = {
    'backlog': ['elaboration', 'ready-to-work'],
    'elaboration': ['ready-to-work', 'backlog'],
    'ready-to-work': ['in-progress', 'backlog'],
    'in-progress': ['ready-for-qa', 'backlog'],
    'ready-for-qa': ['UAT', 'in-progress'],
    'UAT': ['in-progress']
  }

  return STAGE_GRAPH[from]?.includes(to) ?? false
}
```

### Error Handling

```typescript
// Custom error classes
export class StoryNotFoundError extends Error {
  constructor(public storyId: string, public featureDir: string) {
    super(`Story ${storyId} not found in ${featureDir}`)
    this.name = 'StoryNotFoundError'
  }
}

export class InvalidTransitionError extends Error {
  constructor(public from: Stage, public to: Stage) {
    super(`Invalid transition: ${from} → ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

export class InvalidStageError extends Error {
  constructor(public stage: string) {
    super(`Invalid stage: ${stage}`)
    this.name = 'InvalidStageError'
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Mock Dependencies**:
- Mock `StoryFileAdapter` for isolated testing
- Mock `PathResolver` for path operations
- Mock `Logger` for log verification

**Test Coverage**:
- Transition validation (all combinations)
- Story finding logic
- Error handling (all error types)
- Batch operation logic

### Integration Tests (Vitest)

**Real Dependencies**:
- Use real `StoryFileAdapter` (LNGG-0010)
- Use real file system operations
- Create test fixtures in `__tests__/fixtures/`

**Test Coverage**:
- Full lifecycle moves (backlog → UAT)
- Batch operations (10 stories)
- Performance benchmarks
- Edge cases (concurrent moves, malformed YAML)

### Test Fixtures

```
packages/backend/orchestrator/src/adapters/__tests__/fixtures/
  test-epic/
    TEST-001.md      # status: backlog
    TEST-002.md      # status: in-progress
    TEST-003.md      # status: UAT
    TEST-004.md      # malformed YAML (no frontmatter)
    TEST-005.md      # empty file
```

---

## Implementation Phases

### Phase 1: Core Implementation (4h)
1. Create `stage-movement-adapter.ts` with main class
2. Implement `moveStage()` method
3. Add stage transition validation
4. Implement error handling

### Phase 2: Batch Operations (2h)
1. Implement `batchMoveStage()` method
2. Add parallel processing with concurrency limit
3. Implement error aggregation

### Phase 3: Unit Tests (3h)
1. Mock StoryFileAdapter and PathResolver
2. Test transition validation
3. Test error handling
4. Achieve >80% coverage

### Phase 4: Integration Tests (2h)
1. Create test fixtures
2. Test full lifecycle moves
3. Test batch operations with performance benchmarks
4. Test edge cases

### Phase 5: Documentation (1h)
1. Add JSDoc comments
2. Document API contract
3. Add usage examples
4. Update adapter README

---

## Success Criteria

- [ ] All 6 acceptance criteria pass
- [ ] Unit test coverage >80%
- [ ] All integration tests pass
- [ ] Performance benchmarks met (<100ms single, <2s batch of 10)
- [ ] Structured logging implemented
- [ ] Error handling verified for all error types
- [ ] Code review passes (no blocking feedback)
- [ ] Documentation complete

---

## Dependencies Verified

- [x] LNGG-0010 (Story File Adapter) - COMPLETE
- [x] PathResolver - exists and deployed
- [x] WINT-1020 (Flat Directory Structure) - COMPLETE
- [x] @repo/logger - available
- [x] Zod - available in orchestrator package

**Conclusion**: All dependencies met, ready to implement.
