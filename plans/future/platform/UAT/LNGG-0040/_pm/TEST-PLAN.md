# Test Plan: LNGG-0040 — Stage Movement Adapter

**Generated**: 2026-02-14
**Story**: LNGG-0040 — Stage Movement Adapter
**Context**: Flat directory structure (WINT-1020) with status in YAML frontmatter

---

## Scope Summary

**Endpoints touched**: None (file system adapter, not API endpoint)

**UI touched**: No

**Data/storage touched**: Yes
- Story YAML files (frontmatter status field)
- File system operations (reading story files)
- No database operations (file-based only)

**Components touched**:
- `packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts` (new)
- `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` (via LNGG-0010)
- `packages/backend/orchestrator/src/persistence/path-resolver.ts` (existing)

---

## Happy Path Tests

### Test 1: Move Story from Backlog to In-Progress

**Setup**:
- Create test story YAML file: `plans/future/test-epic/TEST-001.md`
- Frontmatter: `status: backlog`
- Ensure StoryFileAdapter (LNGG-0010) is available

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-001',
  featureDir: 'plans/future/test-epic',
  fromStage: 'backlog',
  toStage: 'in-progress'
})
```

**Expected Outcome**:
- Story file still at `plans/future/test-epic/TEST-001.md` (no directory move)
- Frontmatter updated: `status: in-progress`
- No errors thrown

**Evidence**:
- Read file, assert `status: in-progress` in YAML frontmatter
- Verify file path unchanged
- Check logs for stage movement event

### Test 2: Move Story Through Full Lifecycle

**Setup**:
- Create test story: `plans/future/test-epic/TEST-002.md`
- Initial status: `backlog`

**Action**:
```typescript
await stageMovementAdapter.moveStage({ /* backlog → elaboration */ })
await stageMovementAdapter.moveStage({ /* elaboration → ready-to-work */ })
await stageMovementAdapter.moveStage({ /* ready-to-work → in-progress */ })
await stageMovementAdapter.moveStage({ /* in-progress → ready-for-qa */ })
await stageMovementAdapter.moveStage({ /* ready-for-qa → UAT */ })
```

**Expected Outcome**:
- Each transition succeeds
- Status field updates at each stage
- Story remains at same file path

**Evidence**:
- Assert status field after each transition
- Verify logs show all 5 transitions
- Check no filesystem moves occurred

### Test 3: Batch Move Multiple Stories

**Setup**:
- Create 10 test stories: `TEST-010` through `TEST-019`
- All with `status: ready-to-work`

**Action**:
```typescript
await stageMovementAdapter.batchMoveStage({
  stories: [
    { storyId: 'TEST-010', featureDir: 'plans/future/test-epic' },
    // ... TEST-011 through TEST-019
  ],
  toStage: 'in-progress'
})
```

**Expected Outcome**:
- All 10 stories updated to `status: in-progress`
- Batch operation completes in <2 seconds
- All stories processed in parallel

**Evidence**:
- Assert all 10 stories have `status: in-progress`
- Measure elapsed time, assert <2s
- Check logs show 10 movement events

### Test 4: Auto-Locate Story Without Specifying Current Stage

**Setup**:
- Create story: `plans/future/test-epic/TEST-004.md`
- Status: `ready-for-qa`
- Do NOT provide `fromStage` parameter

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-004',
  featureDir: 'plans/future/test-epic',
  toStage: 'UAT'
  // fromStage omitted - adapter should search all stages
})
```

**Expected Outcome**:
- Adapter searches epic directory
- Finds story with `status: ready-for-qa`
- Updates to `status: UAT`

**Evidence**:
- Assert story updated to `status: UAT`
- Check logs for "auto-located story" message
- Verify no errors

---

## Error Cases

### Error 1: Story Not Found

**Setup**:
- No story file exists for `TEST-999.md`

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-999',
  featureDir: 'plans/future/test-epic',
  toStage: 'in-progress'
})
```

**Expected Outcome**:
- `StoryNotFoundError` thrown
- Error message: "Story TEST-999 not found in plans/future/test-epic"
- No partial state changes

**Evidence**:
- Assert error instanceof `StoryNotFoundError`
- Assert error.storyId === 'TEST-999'
- Check logs for error event

### Error 2: Invalid Stage Transition (Backward)

**Setup**:
- Create story: `TEST-020.md` with `status: UAT`

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-020',
  featureDir: 'plans/future/test-epic',
  toStage: 'backlog' // backward transition
})
```

**Expected Outcome**:
- `InvalidTransitionError` thrown
- Error message: "Invalid transition: UAT → backlog"
- Story status remains `UAT` (no partial update)

**Evidence**:
- Assert error instanceof `InvalidTransitionError`
- Assert story still has `status: UAT`
- Check logs for validation failure

### Error 3: Invalid Stage Name

**Setup**:
- Create story: `TEST-021.md` with `status: backlog`

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-021',
  featureDir: 'plans/future/test-epic',
  toStage: 'invalid-stage'
})
```

**Expected Outcome**:
- `InvalidStageError` thrown
- Error message: "Invalid stage: invalid-stage"
- Story status remains `backlog`

**Evidence**:
- Assert error instanceof `InvalidStageError`
- Assert story still has `status: backlog`
- Check error includes valid stage list

### Error 4: File System Permission Error

**Setup**:
- Create story: `TEST-022.md` with `status: backlog`
- Mock file system to simulate permission denied error

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-022',
  featureDir: 'plans/future/test-epic',
  toStage: 'in-progress'
})
```

**Expected Outcome**:
- `FileOperationError` thrown
- Error message includes original system error
- No partial state corruption

**Evidence**:
- Assert error instanceof `FileOperationError`
- Verify story file unchanged (read-verify)
- Check logs for filesystem error

---

## Edge Cases (Reasonable)

### Edge 1: Story Already in Target Stage

**Setup**:
- Create story: `TEST-030.md` with `status: in-progress`

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-030',
  featureDir: 'plans/future/test-epic',
  toStage: 'in-progress' // same as current
})
```

**Expected Outcome**:
- Operation succeeds (idempotent)
- Log warning: "Story already in target stage"
- Status remains `in-progress`

**Evidence**:
- Assert no error thrown
- Assert status still `in-progress`
- Check logs for idempotency warning

### Edge 2: Concurrent Stage Moves (Same Story)

**Setup**:
- Create story: `TEST-031.md` with `status: backlog`

**Action**:
```typescript
await Promise.all([
  stageMovementAdapter.moveStage({ /* backlog → in-progress */ }),
  stageMovementAdapter.moveStage({ /* backlog → elaboration */ })
])
```

**Expected Outcome**:
- One transition succeeds
- Other throws error or is skipped
- Story in consistent state (either `in-progress` or `elaboration`)

**Evidence**:
- Assert story status is valid (not corrupted)
- Check logs for race condition handling
- Verify atomic file operations (via StoryFileAdapter)

### Edge 3: Return to In-Progress from UAT (QA Failure)

**Setup**:
- Create story: `TEST-032.md` with `status: UAT`

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-032',
  featureDir: 'plans/future/test-epic',
  toStage: 'in-progress',
  allowBackward: true // special flag for QA failures
})
```

**Expected Outcome**:
- Transition succeeds (valid use case)
- Status updated to `in-progress`
- Log indicates "QA rework transition"

**Evidence**:
- Assert status updated to `in-progress`
- Check logs for rework flag
- Verify transition validation allows this path

### Edge 4: Large Batch with Mixed Success/Failure

**Setup**:
- Create 20 stories: 15 valid, 5 with invalid transitions

**Action**:
```typescript
await stageMovementAdapter.batchMoveStage({
  stories: [/* 15 valid + 5 invalid */],
  toStage: 'in-progress',
  continueOnError: true
})
```

**Expected Outcome**:
- 15 valid stories succeed
- 5 invalid transitions logged as warnings
- Batch operation completes without throwing
- Results object shows success/failure breakdown

**Evidence**:
- Assert 15 stories have `status: in-progress`
- Assert 5 stories unchanged
- Check results object: `{ succeeded: 15, failed: 5, errors: [...] }`
- Verify performance <3s for 20 stories

### Edge 5: Empty Story File (Malformed YAML)

**Setup**:
- Create story file with no frontmatter: `TEST-033.md`

**Action**:
```typescript
await stageMovementAdapter.moveStage({
  storyId: 'TEST-033',
  featureDir: 'plans/future/test-epic',
  toStage: 'in-progress'
})
```

**Expected Outcome**:
- StoryFileAdapter throws parse error (LNGG-0010 responsibility)
- Stage movement adapter propagates error
- No partial writes

**Evidence**:
- Assert error thrown (parse or validation error)
- Verify file unchanged (read-verify)
- Check logs for YAML parse failure

---

## Required Tooling Evidence

### Backend Testing

**Unit Tests** (`stage-movement-adapter.test.ts`):
- Framework: Vitest
- Coverage target: >80% for core logic
- Mock StoryFileAdapter for unit tests
- Test transition validation logic in isolation
- Test stage graph (DAG) validation

**Integration Tests** (`stage-movement-adapter.integration.test.ts`):
- Framework: Vitest
- Use real story files from test fixtures
- Test with actual StoryFileAdapter (LNGG-0010)
- Test on WINT-1020 flattened structure
- Verify file operations are atomic

**Required Test Fixtures**:
```
packages/backend/orchestrator/src/adapters/__tests__/fixtures/
  test-epic/
    TEST-001.md  # backlog
    TEST-002.md  # in-progress
    TEST-003.md  # UAT
    TEST-004.md  # malformed YAML
```

**Assertions Required**:
- Status field value in YAML frontmatter
- File path unchanged (no directory moves)
- Error types and messages
- Log entries (use @repo/logger)
- Performance benchmarks (<100ms single, <2s batch of 10)

**Required npm Scripts**:
```bash
pnpm test:unit packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.test.ts
pnpm test:integration packages/backend/orchestrator/src/adapters/__tests__/stage-movement-adapter.integration.test.ts
```

### Frontend Testing

Not applicable - no UI surface.

---

## Risks to Call Out

### Risk 1: LNGG-0010 Dependency

**Risk**: StoryFileAdapter (LNGG-0010) must be complete with `update()` method for status field changes.

**Mitigation**:
- Verify LNGG-0010 completion status (now COMPLETE per user context)
- Review StoryFileAdapter API contract before implementation
- Add integration test to verify `update()` method works

### Risk 2: Stage Transition Graph Ambiguity

**Risk**: Valid stage transitions not explicitly defined in seed.

**Mitigation**:
- Define stage transition DAG in dev feasibility
- Document allowed transitions (forward, lateral, special cases like UAT → in-progress)
- Create transition validation tests

### Risk 3: Atomic Operation Guarantees

**Risk**: Concurrent moves to same story could corrupt state.

**Mitigation**:
- Rely on StoryFileAdapter's atomic operations (LNGG-0010)
- Add concurrency test (Edge 2)
- Document race condition handling

### Risk 4: Performance on Large Batches

**Risk**: Batch operations on 100+ stories may exceed 2s target.

**Mitigation**:
- Implement parallel processing with concurrency limit
- Benchmark with 10, 50, 100 stories
- Add performance regression test

### Risk 5: Backward Compatibility

**Risk**: If any stories still use lifecycle directories (pre-WINT-1020), adapter may fail.

**Mitigation**:
- Survey all epics for WINT-1020 migration status
- Add validation to check directory structure
- Log warning if lifecycle directories detected

---

## Test Execution Order

1. **Unit Tests** (fastest, run first):
   - Transition validation logic
   - Stage graph validation
   - Error handling

2. **Integration Tests** (slower, requires fixtures):
   - Happy path tests 1-4
   - Error cases 1-4
   - Edge cases 1-5

3. **Performance Tests** (benchmark):
   - Single move (<100ms)
   - Batch of 10 (<2s)
   - Batch of 50 (<5s)

---

## Success Criteria

- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass
- [ ] Performance benchmarks met (<100ms single, <2s batch of 10)
- [ ] No regressions in StoryFileAdapter tests
- [ ] All error types properly handled
- [ ] Structured logging verified
