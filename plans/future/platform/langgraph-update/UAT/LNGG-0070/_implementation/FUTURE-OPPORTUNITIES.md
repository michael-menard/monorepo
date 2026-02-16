# Future Opportunities - LNGG-0070

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Index adapter transaction rollback not tested in AC-1 | Medium | Low | Add test case for index update failure → rollback scenario |
| 2 | Concurrent checkpoint updates to same file not tested | Medium | Low | Add test case for file locking / race condition behavior |
| 3 | Resume from corrupted/incomplete checkpoint not tested | Low | Low | Add error recovery test case in AC-2 |
| 4 | Performance benchmarks depend on hardware - results may vary | Low | Zero | Document that targets are advisory, not strict requirements |
| 5 | Quality comparison (AC-8) methodology is manual and subjective | Medium | Medium | Future: Automate with schema validation + diff tooling |
| 6 | KB Writer real integration tests currently skipped | Medium | Medium | Future: Implement when test KB instance available (port 5433) |
| 7 | No test for StoryFileAdapter.update failure during stage transition | Low | Low | Add error scenario to AC-1 workflow tests |
| 8 | No specification of how many resume cycles to test in AC-2 | Low | Low | Clarify: Test 1 cycle? 3 cycles? Edge case: max_iterations reached? |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance profiling for bottleneck identification | High | Medium | Future: Add flame graphs / profiler integration to identify slow operations |
| 2 | Automated performance regression detection | High | High | Future: Store benchmarks in DB, compare against historical data, alert on >20% regression |
| 3 | Test coverage visualization dashboard | Medium | Medium | Future: Generate HTML coverage reports with interactive exploration |
| 4 | Parallel test execution optimization | Medium | Low | Future: Run all 6 integration test files in parallel (currently sequential) |
| 5 | Property-based testing for edge case discovery | High | High | Future: Use fast-check or similar for randomized input testing (e.g., story field combinations) |
| 6 | Mutation testing for test suite quality assessment | Medium | High | Future: Use Stryker mutator to verify tests catch intentional bugs |
| 7 | Integration with CI performance tracking | High | Medium | Future: Upload EVIDENCE.yaml to CI artifacts, track trends over time |
| 8 | Snapshot testing for generated file outputs | Medium | Low | Future: Use vitest snapshots to detect unintended output format changes |
| 9 | Load testing for concurrent operations | Medium | Medium | Future: Test 100+ concurrent stage moves, checkpoint updates |
| 10 | Memory leak detection in long-running tests | Low | Low | Future: Monitor heap usage during batch operations |
| 11 | Test data factory functions for less boilerplate | Low | Low | Future: Create `createTestStory()`, `createTestCheckpoint()` helpers |
| 12 | Integration test timing breakdown | Medium | Low | Future: Log timing for each sub-operation (read, validate, write, etc.) |

## Categories

### Edge Cases
- Corrupted checkpoint recovery
- Concurrent file updates (race conditions)
- Transaction rollback on partial failure
- Maximum iteration limits
- File system errors (disk full, permissions)

### UX Polish
- Coverage visualization dashboard
- Performance trend tracking
- Test data factory helpers
- Automated regression detection

### Performance
- Profiling / flame graphs
- Parallel test execution
- Load testing (100+ concurrent operations)
- Memory leak detection
- Sub-operation timing breakdown

### Observability
- CI integration for performance tracking
- EVIDENCE.yaml historical trends
- Coverage reports in HTML format
- Performance regression alerts

### Integrations
- Real KB instance integration (when available)
- Automated quality comparison tooling
- Snapshot testing for outputs
- Property-based testing frameworks
- Mutation testing for test quality

---

## Future Story Candidates

### LNGG-0071: Performance Profiling & Regression Detection
**Description:** Add automated performance regression detection to integration tests. Store benchmarks in database, compare against historical data, alert on >20% regression.

**Value:** High - prevents performance regressions from being deployed to production.

**Effort:** Medium - requires benchmark storage, comparison logic, CI integration.

**Dependencies:** LNGG-0070 (establishes baseline benchmarks)

---

### LNGG-0072: Property-Based Testing for Adapters
**Description:** Implement property-based testing using fast-check to discover edge cases in adapter behavior. Generate randomized story fields, checkpoint states, and stage transitions.

**Value:** High - discovers edge cases that manual tests miss.

**Effort:** High - requires learning fast-check, defining properties, interpreting failures.

**Dependencies:** LNGG-0070 (integration tests establish expected behavior)

---

### LNGG-0073: Real KB Integration Tests
**Description:** Implement skipped KB Writer integration tests with real KB instance. Verify end-to-end write, deduplication, embedding generation, and similarity search.

**Value:** Medium - validates KB integration works correctly.

**Effort:** Medium - requires test KB setup, OpenAI key management, cleanup logic.

**Dependencies:** LNGG-0050 (KB Writer Adapter), test KB instance available.

---

### LNGG-0074: Automated Quality Comparison Tooling
**Description:** Automate AC-8 quality comparison with schema validation, diff tooling, and concrete pass/fail criteria. Replace manual comparison with automated checks.

**Value:** Medium - makes quality comparison objective and repeatable.

**Effort:** Medium - requires identifying comparison criteria, building diff tooling, integrating with CI.

**Dependencies:** LNGG-0070 (establishes manual comparison baseline)

---

### LNGG-0075: Mutation Testing for Test Suite Quality
**Description:** Use Stryker mutator to verify integration tests catch intentional bugs. Identify gaps in test coverage (code covered but not properly tested).

**Value:** Medium - improves test suite confidence.

**Effort:** High - requires Stryker setup, interpreting results, fixing gaps.

**Dependencies:** LNGG-0070 (test suite must exist first)

---

## Technical Debt Opportunities

| # | Debt Item | Impact | Effort | Recommendation |
|---|-----------|--------|--------|----------------|
| 1 | KB Writer integration tests are skipped | Medium | Medium | Track as tech debt until test KB available |
| 2 | Performance targets are advisory only | Low | Low | Acceptable - environment variability is expected |
| 3 | Quality comparison is manual process | Medium | Medium | Acceptable for MVP - automate later |
| 4 | Test fixtures duplicated across adapter tests | Low | Low | Future: Consolidate into shared fixtures directory |

---

## Notes

### Why These Are Future Opportunities (Not MVP-Critical)

1. **Edge Cases:** All core workflows are tested. Edge cases (corrupted files, race conditions) are rare in practice.

2. **Performance Enhancements:** Baseline benchmarks are sufficient for MVP. Regression detection, profiling, and load testing provide incremental value.

3. **Observability:** Manual verification of EVIDENCE.yaml is sufficient for MVP. Automated tracking, dashboards, and alerts are nice-to-have.

4. **Test Quality Improvements:** Property-based testing and mutation testing improve confidence but are not required to ship adapters.

5. **Real KB Integration:** Deferred KB writes (DEFERRED-KB-WRITES.yaml) are sufficient for MVP. Real KB integration tests validate production behavior but aren't blocking.

### Prioritization Guidance

**High Impact, Low Effort (Do Next):**
- LNGG-0071: Performance regression detection
- Test data factory functions
- Parallel test execution

**High Impact, High Effort (Future Quarter):**
- LNGG-0072: Property-based testing
- LNGG-0073: Real KB integration tests
- LNGG-0074: Automated quality comparison

**Medium Impact, Medium Effort (Backlog):**
- LNGG-0075: Mutation testing
- Coverage visualization dashboard
- Load testing

**Low Priority (Tech Debt):**
- Memory leak detection
- Snapshot testing
- Test fixture consolidation
