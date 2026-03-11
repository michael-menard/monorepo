# Dev Feasibility Review: LNGG-0070

**Story:** Integration Test Suite - End-to-End Validation
**Reviewer:** PM Feasibility Agent
**Date:** 2026-02-15
**Status:** ✅ FEASIBLE

---

## Executive Summary

**Verdict:** This story is technically feasible and all blockers are resolved. All six adapter dependencies (LNGG-0010 through LNGG-0060) are in UAT or Ready-for-QA stages with stable interfaces. The integration test suite can be implemented using existing test patterns and fixtures.

**Estimated Effort:** 8 hours (as specified in index)
**Complexity:** High (multiple adapter orchestration)
**Risk Level:** Medium (quality gate, performance measurement)

---

## Technical Feasibility

### ✅ Dependencies Available

All required adapter implementations are available:

| Adapter | Status | Stability |
|---------|--------|-----------|
| StoryFileAdapter | UAT | Stable API ✓ |
| IndexAdapter | UAT | Stable API ✓ |
| StageMovementAdapter | UAT | Stable API ✓ |
| CheckpointAdapter | Ready-for-QA | Stable API ✓ |
| DecisionCallbackRegistry | UAT | Stable API ✓ |
| KBWriterAdapter | UAT | Stable API ✓ |

**Assessment:** No blocking dependencies. All adapters have test-ready interfaces.

---

### ✅ Reuse Opportunities

**Existing Test Fixtures:**
- `src/adapters/__tests__/__fixtures__/*.yaml` - Checkpoint fixtures
- `src/adapters/__tests__/fixtures/*.yaml` - Story fixtures
- `src/adapters/__tests__/fixtures/stage-test-epic/TEST-*.md` - Stage movement fixtures

**Reuse Ratio:** ~60% (fixtures can be reused, integration scenarios are new)

**Existing Test Patterns:**
- `decision-callbacks/__tests__/integration.test.ts` - Workflow scenario patterns
- `story-file-adapter.integration.test.ts` - Real file testing patterns
- `index-adapter.integration.test.ts` - Real index file testing patterns
- `runner/__tests__/integration.test.ts` - Node execution patterns

**Pattern Applicability:** High - all patterns directly applicable

**Testing Utilities:**
- Vitest with v8 coverage provider (already configured ✓)
- `fs.mkdtemp()` for temp directories (established pattern ✓)
- `beforeEach`/`afterEach` cleanup (established pattern ✓)
- `vi.mock('@repo/logger')` (established pattern ✓)

---

### ✅ No New Dependencies Required

All required packages are already installed:
- `vitest` - Test framework
- `@vitest/coverage-v8` - Coverage provider
- `@types/node` - Node.js type definitions
- `gray-matter` - YAML frontmatter parsing
- `inquirer` - CLI prompts (for mocking)

**Package Installation:** None needed

---

## Implementation Approach

### Phase 1: Workflow Lifecycle Tests (2 hours) - AC-1
**Approach:**
1. Create `src/adapters/__tests__/integration/workflow-lifecycle.integration.test.ts`
2. Use temp directory pattern for isolation
3. Test sequential stage transitions: backlog → ready-to-work → in-progress → UAT
4. Validate index metrics after each transition
5. Test rollback on failure scenario

**Adapters Used:** StoryFileAdapter + StageMovementAdapter + IndexAdapter

**Complexity:** Medium - requires coordinating three adapters

**Risks:**
- Stage transition validation logic may be complex
- Index metric calculation accuracy critical

**Mitigation:**
- Use existing fixtures from stage-test-epic/
- Reference index-adapter unit tests for metric logic

---

### Phase 2: Checkpoint Resume Tests (1 hour) - AC-2
**Approach:**
1. Create `src/adapters/__tests__/integration/checkpoint-resume.integration.test.ts`
2. Test checkpoint save at different phases
3. Test resume from checkpoint with partial completion
4. Validate token accumulation across save/resume

**Adapters Used:** CheckpointAdapter + StoryFileAdapter

**Complexity:** Low - straightforward save/load patterns

**Risks:**
- Token logging accuracy across resume cycles

**Mitigation:**
- Use existing checkpoint fixtures from `__fixtures__/`
- Follow checkpoint-adapter unit test patterns

---

### Phase 3: Decision Callback Integration (1 hour) - AC-3
**Approach:**
1. Create `src/adapters/__tests__/integration/decision-callbacks.integration.test.ts`
2. Mock inquirer.prompt() for CLI callback testing
3. Test auto-decision mode with rule engine
4. Test noop callback for CI environments

**Adapters Used:** DecisionCallbackRegistry + StoryFileAdapter

**Complexity:** Medium - mocking CLI interactions requires care

**Risks:**
- Inquirer mocking may be fragile

**Mitigation:**
- Use patterns from decision-callbacks/__tests__/integration.test.ts
- Test with all three callback types (CLI, Auto, Noop)

---

### Phase 4: KB Writer Integration (1 hour) - AC-4
**Approach:**
1. Create `src/adapters/__tests__/integration/kb-writer.integration.test.ts`
2. Test deferred KB writes to DEFERRED-KB-WRITES.yaml
3. Test KB entry deduplication logic
4. Test no-op writer mode

**Adapters Used:** KBWriterAdapter + StoryFileAdapter

**Complexity:** Low - KB writer has simple interface

**Risks:**
- Deduplication logic edge cases

**Mitigation:**
- Use existing kb-writer unit tests as reference
- Test with duplicate entries explicitly

---

### Phase 5: Real File Compatibility (1 hour) - AC-5
**Approach:**
1. Create `src/adapters/__tests__/integration/real-story-compatibility.integration.test.ts`
2. Use actual LNGG-0010 story file (or similar UAT story)
3. Test legacy format compatibility
4. Test v2 format compatibility
5. Test round-trip read → modify → write → read

**Adapters Used:** StoryFileAdapter

**Complexity:** Low - leverages existing adapter

**Risks:**
- Real story files may have unexpected edge cases

**Mitigation:**
- Use stories from UAT/ directory (known-good files)
- Test both legacy and v2 formats explicitly

---

### Phase 6: Performance Benchmarking (1 hour) - AC-6
**Approach:**
1. Create `src/adapters/__tests__/integration/performance-benchmarks.integration.test.ts`
2. Use `performance.now()` for high-resolution timing
3. Measure p95 latency for:
   - Story file read: target <50ms
   - Story file write: target <100ms
   - Stage movement: target <200ms
   - Index update: target <100ms
4. Log results to EVIDENCE.yaml

**Complexity:** Medium - percentile calculation, result logging

**Risks:**
- Test environment variability may affect measurements
- p95 calculation accuracy

**Mitigation:**
- Run large sample sizes (100+ operations)
- Use stable test environment (CI may have different perf characteristics)
- Document measurement methodology in EVIDENCE.yaml

---

### Phase 7: Quality Comparison (1 hour) - AC-8
**Approach:**
1. Generate story files using adapters
2. Manually compare against Claude Code baseline stories
3. Document findings in EVIDENCE.yaml

**Evaluation Criteria:**
- Story structure completeness
- Checkpoint validity
- KB entry relevance
- Index metric accuracy

**Complexity:** Low - manual review task

**Risks:**
- Subjective quality assessment

**Mitigation:**
- Use concrete comparison checklist
- Compare multiple story samples
- Document specific differences, not just "good/bad"

---

## Test Organization Strategy

### Directory Structure
```
packages/backend/orchestrator/src/adapters/__tests__/
├── integration/                              (new directory)
│   ├── workflow-lifecycle.integration.test.ts
│   ├── checkpoint-resume.integration.test.ts
│   ├── decision-callbacks.integration.test.ts
│   ├── kb-writer.integration.test.ts
│   ├── real-story-compatibility.integration.test.ts
│   └── performance-benchmarks.integration.test.ts
├── __fixtures__/                             (existing - reuse)
│   ├── valid-checkpoint.yaml
│   ├── legacy-checkpoint-with-extras.yaml
│   └── ...
└── fixtures/                                 (existing - reuse)
    ├── minimal-story.yaml
    ├── full-story.yaml
    ├── stage-test-epic/
    │   ├── TEST-001.md
    │   └── ...
    └── ...
```

**File Naming Convention:** `{scenario}.integration.test.ts`

**Rationale:**
- Separates integration tests from unit tests
- Makes it clear these are multi-adapter scenarios
- Follows existing pattern from decision-callbacks/

---

## Constraints & Guardrails

### ✅ Test Coverage Requirement
**Constraint:** >80% code coverage
**Status:** Individual adapters already meet this
**Impact:** Integration tests focus on interactions, not re-testing units

### ✅ Zod-First Validation
**Constraint:** All validation must use Zod schemas
**Status:** All adapters use Zod
**Impact:** No new schemas needed for integration tests

### ✅ No Barrel Files
**Constraint:** Import directly from source files
**Status:** All adapters follow this pattern
**Impact:** Integration tests import from adapter files directly

### ✅ @repo/logger for Logging
**Constraint:** No console.log statements
**Status:** All adapters use @repo/logger
**Impact:** Mock @repo/logger in all integration tests

### ✅ Atomic File Operations
**Constraint:** Temp + rename pattern for writes
**Status:** All file adapters use atomic writes
**Impact:** Tests can validate atomicity guarantees

### ✅ TypeScript Strict Mode
**Constraint:** All code must compile with strict: true
**Status:** Monorepo enforces strict mode
**Impact:** No type errors allowed

---

## Risk Assessment

### Risk 1: Test Pollution (MEDIUM)
**Description:** Shared state between tests causes failures
**Likelihood:** Medium
**Impact:** High (flaky tests)
**Mitigation:**
- Use `fs.mkdtemp()` for isolated temp directories
- Clean up all files in `afterEach` hooks
- Reset all mocks with `vi.clearAllMocks()`

### Risk 2: Performance Variability (MEDIUM)
**Description:** Test environment affects benchmark measurements
**Likelihood:** High
**Impact:** Medium (inconsistent baselines)
**Mitigation:**
- Use large sample sizes (100+ operations)
- Document measurement environment
- Accept variance within reason (CI slower than local)

### Risk 3: Adapter API Changes (LOW)
**Description:** Adapter interfaces change during implementation
**Likelihood:** Low (adapters in UAT/Ready-for-QA)
**Impact:** High (test rewrites needed)
**Mitigation:**
- Review adapter interfaces before starting
- Monitor LNGG-0010 through LNGG-0060 for changes
- Coordinate with adapter implementers

### Risk 4: Quality Comparison Subjectivity (LOW)
**Description:** Manual quality assessment may be inconsistent
**Likelihood:** Medium
**Impact:** Low (advisory only)
**Mitigation:**
- Use concrete checklist for comparison
- Compare multiple story samples
- Document specific differences in EVIDENCE.yaml

---

## Blockers & Dependencies

### ✅ No Blockers
All adapter dependencies are in UAT or Ready-for-QA with stable interfaces.

### Active Work (No Impact)
- LNGG-0020 (Index Adapter) - UAT ✓
- LNGG-0040 (Stage Adapter) - UAT ✓
- LNGG-0050 (KB Writer) - UAT ✓
- LNGG-0060 (Checkpoint Adapter) - Ready-for-QA ✓

**Assessment:** Integration tests can use current adapter APIs. No coordination needed.

---

## Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Workflow lifecycle tests (AC-1) | 2 hours |
| 2 | Checkpoint resume tests (AC-2) | 1 hour |
| 3 | Decision callback integration (AC-3) | 1 hour |
| 4 | KB writer integration (AC-4) | 1 hour |
| 5 | Real file compatibility tests (AC-5) | 1 hour |
| 6 | Performance benchmarking (AC-6) | 1 hour |
| 7 | Quality comparison documentation (AC-8) | 1 hour |

**Total Estimated Effort:** 8 hours (matches index estimate)

**Contingency:** +1 hour for debugging/polish

---

## Recommendations

### 1. Prioritize Workflow Lifecycle Tests (AC-1)
**Rationale:** Highest value - validates end-to-end story flow
**Impact:** Catches integration bugs early

### 2. Add Performance Benchmarking Incrementally
**Rationale:** Don't block on perfect measurements
**Impact:** Baseline established even if not comprehensive

### 3. Quality Comparison as Final Step
**Rationale:** Manual review can be done after all tests pass
**Impact:** Doesn't block test development

### 4. Document Integration Issues
**Rationale:** Adapter interactions may reveal edge cases
**Impact:** Follow-up stories can address gaps

### 5. Use Existing Fixtures First
**Rationale:** Minimize new fixture creation
**Impact:** Faster implementation, less maintenance

---

## Success Criteria

- [ ] All 8 ACs have corresponding integration tests
- [ ] All integration tests pass locally and in CI
- [ ] Code coverage >80% (via vitest coverage report)
- [ ] Performance benchmarks meet targets (logged to EVIDENCE.yaml)
- [ ] Quality comparison documented (in EVIDENCE.yaml)
- [ ] No test pollution or cleanup issues
- [ ] Error paths tested for all adapter combinations
- [ ] Integration test suite runs in <2 minutes

---

## Conclusion

**Status:** ✅ **FEASIBLE - READY TO IMPLEMENT**

This story is ready for implementation. All dependencies are available, reuse opportunities are identified, and the implementation approach is clear. The 8-hour estimate is realistic given the existing test patterns and fixtures.

**Next Steps:**
1. Create `src/adapters/__tests__/integration/` directory
2. Start with workflow lifecycle tests (highest value)
3. Add performance benchmarking incrementally
4. Document findings in EVIDENCE.yaml as tests are completed
