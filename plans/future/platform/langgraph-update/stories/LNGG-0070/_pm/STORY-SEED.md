---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: LNGG-0070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None - baseline is active and comprehensive

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| Vitest test framework | Deployed | Already configured for unit and integration tests |
| Adapter implementations | UAT/Ready-for-QA | LNGG-0010, 0020, 0030, 0040, 0050, 0060 completed or in final stages |
| Test fixtures | Deployed | Existing fixtures in `__tests__/__fixtures__/` and `__tests__/fixtures/` |
| Integration test patterns | Deployed | Established patterns in decision-callbacks, kb-writer, runner modules |
| Zod validation | Deployed | All adapters use Zod-first schemas |

### Active In-Progress Work

| Story ID | Title | Stage | Potential Impact |
|----------|-------|-------|------------------|
| LNGG-0020 | Index Management Adapter | UAT | Integration tests must validate index updates |
| LNGG-0040 | Stage Movement Adapter | UAT | Integration tests must validate stage transitions |
| LNGG-0050 | KB Writing Adapter | UAT | Integration tests must validate KB writes |
| LNGG-0060 | Checkpoint Adapter | Ready-for-QA | Integration tests must validate checkpoint resume |

**Note:** All blockers (LNGG-0010, 0020, 0030, 0040) are in UAT or completed state. Story can proceed with final interfaces from these adapters.

### Constraints to Respect

1. **Test coverage requirement**: >80% per adapter (already met by dependencies)
2. **Zod-first validation**: All schema validation must use Zod
3. **No barrel files**: Import directly from source
4. **@repo/logger for logging**: No console.log statements
5. **Atomic operations**: File operations must be atomic (temp + rename pattern)
6. **TypeScript strict mode**: All code must compile with strict: true

---

## Retrieved Context

### Related Endpoints
- No API endpoints (backend testing infrastructure)

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| StoryFileAdapter | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | Read/write story YAML files |
| IndexAdapter | `packages/backend/orchestrator/src/adapters/index-adapter.ts` | Manage stories.index.md |
| StageMovementAdapter | `packages/backend/orchestrator/src/adapters/stage-movement-adapter.ts` | Move stories between stages |
| CheckpointAdapter | `packages/backend/orchestrator/src/adapters/checkpoint-adapter.ts` | Read/write checkpoints |
| DecisionCallbackRegistry | `packages/backend/orchestrator/src/adapters/decision-callbacks/registry.ts` | Decision system integration |
| KBWriterAdapter | `packages/backend/orchestrator/src/adapters/kb-writer/kb-writer-adapter.ts` | Knowledge base integration |

### Reuse Candidates

**Test Fixtures (existing):**
- `packages/backend/orchestrator/src/adapters/__tests__/__fixtures__/*.yaml` - Checkpoint fixtures
- `packages/backend/orchestrator/src/adapters/__tests__/fixtures/*.yaml` - Story fixtures
- `packages/backend/orchestrator/src/adapters/__tests__/fixtures/stage-test-epic/TEST-*.md` - Stage movement fixtures

**Test Patterns (existing):**
- Integration test structure from `decision-callbacks/__tests__/integration.test.ts` - Workflow patterns
- Integration test structure from `story-file-adapter.integration.test.ts` - Real file testing
- Integration test structure from `index-adapter.integration.test.ts` - Real index file testing
- Integration test structure from `runner/__tests__/integration.test.ts` - Node execution patterns

**Testing Utilities:**
- `vitest` with `v8` coverage provider (already configured)
- `fs.mkdtemp()` pattern for temporary test directories
- `beforeEach`/`afterEach` cleanup patterns
- `vi.mock('@repo/logger')` pattern for logger mocking

---

## Knowledge Context

### Lessons Learned

**From LNGG-0010 (Story File Adapter):**
- Backward compatibility is critical - support both legacy and v2 formats
- Integration tests with real files catch schema mismatches that unit tests miss
- Atomic write pattern (temp + rename) prevents file corruption
- Zod passthrough enables unknown field preservation
- **Time sink avoided**: Used existing gray-matter package instead of custom YAML parsing

**From LNGG-0030 (Decision Callbacks):**
- Integration tests should demonstrate workflow patterns, not just unit functionality
- Context propagation between callbacks is essential for real workflows
- AC-5 pattern: Integration tests can be complete even if actual graph integration is deferred
- **Pattern to follow**: Separate unit tests (functionality) from integration tests (workflow scenarios)

### Blockers to Avoid (from past stories)

1. **File path assumptions** - Always use absolute paths in tests, temp directories for isolation
2. **Schema validation failures** - Validate all YAML before write operations
3. **Race conditions in file operations** - Use atomic writes, proper cleanup in afterEach
4. **Test pollution** - Clean up all temp files, reset mocks between tests
5. **Coverage gaps** - Test error paths, not just happy paths

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks (not applicable to this infra story) |
| ADR-006 | E2E Tests in Dev | At least one E2E test per story (exempt for backend infra) |

**Note:** ADR-005 and ADR-006 focus on frontend E2E/UAT testing. This story is backend infrastructure testing - not applicable.

### Patterns to Follow

1. **Integration test structure**: Use describe blocks for test grouping by scenario
2. **Fixture reuse**: Leverage existing fixtures, create minimal new ones only when needed
3. **Temp directory pattern**: Use `fs.mkdtemp()` with cleanup in `afterEach`
4. **Workflow scenarios**: Test adapter combinations, not just isolated adapters
5. **Real file testing**: Include at least one test with actual story files (e.g., LNGG-0010)
6. **Logger mocking**: Use `vi.mock('@repo/logger')` pattern consistently
7. **Error case coverage**: Test timeout, validation errors, file not found, etc.

### Patterns to Avoid

1. **Manual YAML parsing** - Use gray-matter or js-yaml packages
2. **Hardcoded file paths** - Use path.join() and temp directories
3. **Skipping cleanup** - Always clean up temp files in afterEach
4. **console.log debugging** - Use @repo/logger exclusively
5. **Shared test state** - Isolate test state with beforeEach/afterEach

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Integration Test Suite - End-to-End Validation

### Description

**Context:**
All six adapter stories (LNGG-0010 through LNGG-0060) have individual unit and integration tests, but there is no comprehensive test suite validating how these adapters work together in realistic workflow scenarios. The orchestrator needs confidence that:
- Multiple adapters can be used in sequence without conflicts
- State transitions (backlog → ready-to-work → in-progress → UAT) work correctly
- Decision callbacks integrate with file operations
- KB writes don't interfere with story/checkpoint operations
- Performance is acceptable when multiple adapters are used together

**Problem:**
Without integration tests validating adapter combinations:
- Workflow regressions could occur when individual adapters change
- Interaction bugs between adapters may only be caught in production
- No performance baseline for multi-adapter operations
- Quality comparison vs Claude Code baseline cannot be automated

**Solution Direction:**
Create a comprehensive integration test suite that:
1. Tests adapter combinations in realistic workflow scenarios
2. Validates complete story lifecycle (create → move stages → checkpoint → complete)
3. Validates decision callback integration with file operations
4. Tests with real story files to ensure backward compatibility
5. Establishes performance benchmarks for common operations
6. Provides automated quality comparison against Claude Code baseline

### Initial Acceptance Criteria

- [ ] **AC-1**: Integration tests validate story lifecycle workflow (create → backlog → ready-to-work → in-progress → UAT)
  - Uses StoryFileAdapter + StageMovementAdapter + IndexAdapter together
  - Tests sequential stage transitions with state verification
  - Validates index metrics update correctly after each stage move
  - Tests rollback behavior on stage movement failure

- [ ] **AC-2**: Integration tests validate checkpoint + resume workflow
  - Uses CheckpointAdapter + StoryFileAdapter together
  - Tests checkpoint save at different phases
  - Tests resume from checkpoint with partial completion
  - Validates token logging across checkpoint save/resume

- [ ] **AC-3**: Integration tests validate decision callback integration
  - Uses DecisionCallbackRegistry with StoryFileAdapter
  - Tests auto-decision mode in workflow scenario
  - Tests CLI callback pattern (mocked user input)
  - Tests noop callback for automated workflows

- [ ] **AC-4**: Integration tests validate KB writer integration
  - Uses KBWriterAdapter with StoryFileAdapter
  - Tests deferred KB writes during story execution
  - Tests KB entry deduplication
  - Tests no-op writer mode for CI environments

- [ ] **AC-5**: Integration tests use real story files for backward compatibility validation
  - Tests with actual LNGG-0010 story file (or similar real story)
  - Validates legacy format compatibility
  - Validates v2 format compatibility
  - Tests round-trip read → modify → write → read

- [ ] **AC-6**: Integration tests establish performance benchmarks
  - Measures p95 latency for common operations:
    - Story file read: <50ms
    - Story file write: <100ms
    - Stage movement: <200ms
    - Index update: <100ms
  - Benchmarks logged to EVIDENCE.yaml

- [ ] **AC-7**: Integration tests achieve >80% code coverage across all adapters
  - Measured via vitest coverage report
  - Includes error path testing
  - Validates Zod schema validation failures

- [ ] **AC-8**: Integration test suite includes quality comparison vs Claude Code
  - Manual comparison documented in EVIDENCE.yaml
  - Compares generated artifacts (story files, checkpoints, KB entries)
  - Validates output quality meets or exceeds Claude Code baseline

### Non-Goals

- **Frontend E2E tests** - This story focuses on backend adapter integration only
- **LangGraph workflow execution** - Actual graph execution is out of scope; integration tests simulate workflow patterns
- **Database integration tests** - No database writes; file-based operations only
- **API endpoint testing** - No HTTP endpoints involved
- **Performance optimization** - Establish baseline only, optimization is future work
- **Load testing** - Focus on single-operation performance, not concurrency

### Reuse Plan

**Test Fixtures:**
- Reuse existing fixtures from `__tests__/__fixtures__/` and `__tests__/fixtures/`
- Extend with multi-adapter scenario fixtures if needed
- Leverage stage-test-epic fixtures for stage movement tests

**Test Patterns:**
- Reuse integration test structure from `decision-callbacks/__tests__/integration.test.ts`
- Reuse temp directory pattern from `story-file-adapter.integration.test.ts`
- Reuse real file testing pattern from `index-adapter.integration.test.ts`
- Reuse logger mocking from all existing test files

**Testing Utilities:**
- Vitest configuration from `vitest.config.ts` (already set up)
- Coverage reporting with v8 provider (already configured)
- Mock patterns from existing test files

**Validation Schemas:**
- Reuse all Zod schemas from adapter implementations
- No new schemas needed for integration tests

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Scenarios:**
1. **Happy path**: Complete story lifecycle from backlog to UAT
2. **Error handling**: Stage movement failure, validation errors, file not found
3. **Concurrency**: Multiple adapters operating on same story (should fail gracefully)
4. **Performance**: Benchmark common operations against target latencies
5. **Backward compatibility**: Test with real legacy and v2 format story files

**Test Environment:**
- Use temp directories for all file operations (no shared state)
- Mock @repo/logger to avoid console noise
- Use vi.useFakeTimers() if testing timeout behavior
- Clean up all temp files in afterEach hooks

**Coverage Targets:**
- Unit test coverage: >80% (already met by individual adapters)
- Integration test coverage: Focus on adapter interactions, not re-testing unit coverage
- Error path coverage: Test at least one error scenario per adapter combination

**Performance Baselines:**
- Story file read: <50ms p95
- Story file write: <100ms p95
- Stage movement: <200ms p95
- Index update: <100ms p95

### For UI/UX Advisor

**Not applicable** - This is a backend infrastructure story with no user-facing UI components.

### For Dev Feasibility

**Technical Considerations:**

1. **Test Organization:**
   - Create `src/adapters/__tests__/integration/` directory for multi-adapter tests
   - Keep individual adapter integration tests in their existing locations
   - Use descriptive test file names: `workflow-lifecycle.integration.test.ts`, `checkpoint-resume.integration.test.ts`, etc.

2. **Dependencies:**
   - All required dependencies already installed (vitest, @types/node, etc.)
   - No new npm packages needed
   - Reuse existing gray-matter, js-yaml, inquirer mocks

3. **Implementation Approach:**
   - Start with simplest workflow (story create → read → update)
   - Add stage movement integration
   - Add checkpoint integration
   - Add decision callback integration
   - Add KB writer integration
   - Add performance benchmarks
   - Add quality comparison

4. **Risk Mitigation:**
   - Use temp directories to avoid test pollution
   - Use atomic operations to prevent file corruption during tests
   - Mock @repo/logger to avoid console noise
   - Clean up all resources in afterEach hooks
   - Test error paths to ensure graceful degradation

5. **Performance Measurement:**
   - Use `performance.now()` for latency measurement
   - Log p95 values to EVIDENCE.yaml
   - Compare against target latencies from index

6. **Quality Comparison:**
   - Manual comparison against Claude Code output samples
   - Document findings in EVIDENCE.yaml
   - Focus on artifact quality (story structure, checkpoint validity, KB entry relevance)

**Estimated Complexity:** High
- Multiple adapters must be orchestrated
- Realistic workflow scenarios require careful setup
- Performance benchmarking adds measurement overhead
- Quality comparison requires manual review

**Estimated Effort:** 8 hours (as specified in index)
- 2 hours: Workflow lifecycle tests (AC-1)
- 1 hour: Checkpoint resume tests (AC-2)
- 1 hour: Decision callback integration (AC-3)
- 1 hour: KB writer integration (AC-4)
- 1 hour: Real file compatibility tests (AC-5)
- 1 hour: Performance benchmarking (AC-6)
- 1 hour: Quality comparison documentation (AC-8)

**Blockers:**
- None - all adapter dependencies are in UAT or completed state
- Can use current adapter interfaces for integration tests

**Recommendations:**
- Prioritize workflow lifecycle tests first (AC-1) - highest value
- Add performance benchmarking incrementally (don't block on perfect measurements)
- Quality comparison can be final step (manual review)
- Document any integration issues discovered for follow-up stories
