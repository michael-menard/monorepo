# Test Plan: LNGG-0070 - Integration Test Suite

**Story:** Integration Test Suite - End-to-End Validation
**Generated:** 2026-02-15
**Test Strategy:** Integration testing with real file operations

---

## Test Environment Setup

### Prerequisites
- Vitest configured with v8 coverage provider
- @repo/logger mocked in all tests
- Temporary directories for file isolation
- Existing adapter implementations (LNGG-0010 through LNGG-0060)

### Test Isolation
- Use `fs.mkdtemp()` for temporary test directories
- Clean up all temp files in `afterEach` hooks
- Mock @repo/logger to prevent console noise
- Reset all mocks between tests with `vi.clearAllMocks()`

---

## Test Scenarios

### Scenario 1: Story Lifecycle Workflow (AC-1)
**Objective:** Validate complete story lifecycle from backlog to UAT

**Test Cases:**
1. **TC-1.1: Sequential stage transitions**
   - Create story in backlog stage
   - Move to ready-to-work → verify index updated
   - Move to in-progress → verify status field updated
   - Move to UAT → verify final state
   - **Expected:** All transitions succeed, index metrics correct

2. **TC-1.2: Stage transition validation**
   - Attempt invalid transition (backlog → UAT directly)
   - **Expected:** StageTransitionError thrown

3. **TC-1.3: Index metric updates**
   - Verify status counts after each transition
   - Verify completion percentage calculation
   - **Expected:** Metrics match expected values

4. **TC-1.4: Rollback on failure**
   - Simulate file write failure during stage move
   - **Expected:** Story remains in original stage, index unchanged

**Adapters Used:** StoryFileAdapter, StageMovementAdapter, IndexAdapter

**Performance Target:** Stage movement <200ms p95

---

### Scenario 2: Checkpoint + Resume Workflow (AC-2)
**Objective:** Validate checkpoint save and resume functionality

**Test Cases:**
1. **TC-2.1: Checkpoint save at different phases**
   - Save checkpoint at phase: "setup"
   - Save checkpoint at phase: "execution"
   - Save checkpoint at phase: "qa-verify"
   - **Expected:** CHECKPOINT.yaml written with correct phase

2. **TC-2.2: Resume from checkpoint**
   - Create checkpoint with phase: "execution", last_step: 3
   - Resume workflow
   - **Expected:** Workflow continues from step 3

3. **TC-2.3: Token logging across checkpoint**
   - Save checkpoint with token usage
   - Resume and add more tokens
   - **Expected:** Token totals accumulate correctly

4. **TC-2.4: Partial completion state**
   - Checkpoint with completed_steps: [1, 2, 3]
   - Resume and verify skip logic
   - **Expected:** Only remaining steps execute

**Adapters Used:** CheckpointAdapter, StoryFileAdapter

**Performance Target:** Checkpoint read/write <50ms p95

---

### Scenario 3: Decision Callback Integration (AC-3)
**Objective:** Validate decision callback integration with file operations

**Test Cases:**
1. **TC-3.1: Auto-decision mode**
   - Register AutoDecisionCallback with rule: always approve
   - Trigger decision point
   - **Expected:** Decision made automatically, no user prompt

2. **TC-3.2: CLI callback with mocked input**
   - Mock inquirer.prompt() to return "approve"
   - Register CLIDecisionCallback
   - Trigger decision point
   - **Expected:** Mocked response used, workflow continues

3. **TC-3.3: Noop callback for CI**
   - Register NoopDecisionCallback
   - Trigger decision point
   - **Expected:** Decision skipped, workflow continues

4. **TC-3.4: Context propagation**
   - Set decision context with story metadata
   - Verify callback receives context
   - **Expected:** Context available to callback logic

**Adapters Used:** DecisionCallbackRegistry, StoryFileAdapter

**Performance Target:** Decision callback overhead <10ms

---

### Scenario 4: KB Writer Integration (AC-4)
**Objective:** Validate KB writer integration with story operations

**Test Cases:**
1. **TC-4.1: Deferred KB writes**
   - Execute workflow with KB writes
   - Verify DEFERRED-KB-WRITES.yaml created
   - **Expected:** KB entries queued, not blocking workflow

2. **TC-4.2: KB entry deduplication**
   - Write duplicate KB entry
   - **Expected:** Only one entry persisted

3. **TC-4.3: No-op writer mode**
   - Configure KBWriterAdapter in noop mode
   - Attempt KB write
   - **Expected:** Write skipped, no error thrown

4. **TC-4.4: KB write with story context**
   - Write KB entry with story_id metadata
   - **Expected:** Entry tagged correctly

**Adapters Used:** KBWriterAdapter, StoryFileAdapter

**Performance Target:** KB write <50ms p95

---

### Scenario 5: Real Story File Compatibility (AC-5)
**Objective:** Validate backward compatibility with real story files

**Test Cases:**
1. **TC-5.1: Legacy format compatibility**
   - Read legacy story file (pre-v2 format)
   - Verify all fields parsed correctly
   - **Expected:** No validation errors, passthrough fields preserved

2. **TC-5.2: V2 format compatibility**
   - Read v2 story file with experiment_variant
   - Verify new fields recognized
   - **Expected:** All v2 fields parsed correctly

3. **TC-5.3: Round-trip integrity**
   - Read story → modify field → write → read again
   - **Expected:** No data loss, all fields preserved

4. **TC-5.4: Real LNGG story file**
   - Use actual LNGG-0010 story file
   - Perform read/write operations
   - **Expected:** No errors, file remains valid

**Adapters Used:** StoryFileAdapter

**Test Data:** Use real story files from UAT/ready-for-qa directories

**Performance Target:** Read <50ms, Write <100ms p95

---

### Scenario 6: Performance Benchmarking (AC-6)
**Objective:** Establish performance baselines for common operations

**Test Cases:**
1. **TC-6.1: Story file read latency**
   - Read 100 story files
   - Measure p50, p95, p99 latency
   - **Expected:** p95 <50ms

2. **TC-6.2: Story file write latency**
   - Write 100 story files
   - Measure p50, p95, p99 latency
   - **Expected:** p95 <100ms

3. **TC-6.3: Stage movement latency**
   - Move 50 stories between stages
   - Measure end-to-end latency
   - **Expected:** p95 <200ms

4. **TC-6.4: Index update latency**
   - Update index 100 times
   - Measure write + metric recalculation time
   - **Expected:** p95 <100ms

**Measurement Approach:**
- Use `performance.now()` for high-resolution timing
- Calculate percentiles with simple array sort
- Log all benchmarks to EVIDENCE.yaml

---

### Scenario 7: Code Coverage (AC-7)
**Objective:** Achieve >80% code coverage across all adapters

**Coverage Strategy:**
- Run vitest with `--coverage` flag
- Focus on error paths and edge cases
- Test Zod schema validation failures

**Test Cases:**
1. **TC-7.1: Error path coverage**
   - Test file not found errors
   - Test invalid YAML errors
   - Test schema validation failures
   - **Expected:** All error types handled gracefully

2. **TC-7.2: Zod validation failures**
   - Pass invalid frontmatter to StoryFileAdapter
   - Pass invalid checkpoint to CheckpointAdapter
   - **Expected:** Zod errors thrown with clear messages

3. **TC-7.3: Edge cases**
   - Empty story files
   - Missing required fields
   - Circular dependencies in index
   - **Expected:** Graceful degradation or clear errors

**Coverage Target:** >80% line coverage, >80% branch coverage

---

### Scenario 8: Quality Comparison (AC-8)
**Objective:** Validate output quality vs Claude Code baseline

**Manual Comparison Process:**
1. Generate story files with new adapters
2. Compare against Claude Code generated stories
3. Evaluate:
   - Story structure completeness
   - Checkpoint validity
   - KB entry relevance
   - Index metric accuracy

**Comparison Criteria:**
- **Structure:** All required sections present
- **Validity:** YAML parses correctly, Zod validation passes
- **Completeness:** No missing fields or truncated content
- **Quality:** Content meets same standards as baseline

**Documentation:** Results logged to EVIDENCE.yaml

---

## Test Organization

### Directory Structure
```
src/adapters/__tests__/
├── integration/
│   ├── workflow-lifecycle.integration.test.ts      (AC-1)
│   ├── checkpoint-resume.integration.test.ts       (AC-2)
│   ├── decision-callbacks.integration.test.ts      (AC-3)
│   ├── kb-writer.integration.test.ts               (AC-4)
│   ├── real-story-compatibility.integration.test.ts (AC-5)
│   └── performance-benchmarks.integration.test.ts   (AC-6, AC-7)
└── fixtures/
    └── integration/
        ├── legacy-story.md
        ├── v2-story.md
        └── test-index.md
```

---

## Coverage Requirements

### Unit Tests (Already Met)
- StoryFileAdapter: >80% coverage ✓
- IndexAdapter: >80% coverage ✓
- StageMovementAdapter: >80% coverage ✓
- CheckpointAdapter: >80% coverage ✓
- DecisionCallbackRegistry: >80% coverage ✓
- KBWriterAdapter: >80% coverage ✓

### Integration Tests (This Story)
- Focus on adapter interactions
- Test workflow scenarios
- Validate error handling across adapters
- Establish performance baselines

---

## Performance Baselines

| Operation | Target p95 | Measurement Method |
|-----------|-----------|-------------------|
| Story file read | <50ms | performance.now() |
| Story file write | <100ms | performance.now() |
| Stage movement | <200ms | performance.now() |
| Index update | <100ms | performance.now() |
| Decision callback | <10ms overhead | performance.now() |
| KB write | <50ms | performance.now() |

---

## Risk Mitigation

### Test Pollution
- **Risk:** Shared state between tests
- **Mitigation:** Temp directories, afterEach cleanup

### File Corruption
- **Risk:** Partial writes during test failures
- **Mitigation:** Atomic operations, temp + rename pattern

### Performance Regression
- **Risk:** Adapter changes slow down operations
- **Mitigation:** Performance benchmarks as quality gate

### Flaky Tests
- **Risk:** Timing-dependent tests fail intermittently
- **Mitigation:** Use vi.useFakeTimers() where appropriate

---

## Success Criteria

- [ ] All 8 ACs have corresponding test scenarios
- [ ] All integration tests pass
- [ ] Code coverage >80% across all adapters
- [ ] Performance benchmarks meet targets
- [ ] Quality comparison documented
- [ ] No test pollution or cleanup issues
- [ ] Error paths tested for all adapter combinations
