# Future Opportunities - AUDT-0010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No test coverage for all scope types (delta, domain, story) | Low | Medium | AC-10 tests only scope='full'. Add tests for delta/domain/story scopes in AUDT-0020 or later. |
| 2 | scan-scope error handling not fully tested | Low | Low | Add tests for permission errors, symlink loops, corrupted directories. |
| 3 | No performance benchmarks for large file trees | Low | Medium | AC-11 edge case mentions 1000+ files but no benchmark test. Add performance test suite. |
| 4 | Graph timeout configuration not tested | Low | Low | CodeAuditConfig has nodeTimeoutMs but no test verifies timeout behavior. |
| 5 | Lens parallel execution not verified | Medium | Medium | Integration tests verify routing but not actual parallel execution timing. |
| 6 | No negative test for malformed state | Low | Low | Add test for state missing required fields (catches annotation bugs). |
| 7 | Factory function edge cases not covered | Low | Low | createAuditFindings, addLensFindings, calculateTrend could have more edge case tests. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add snapshot tests for graph structure | Medium | Low | Use Vitest snapshot testing to detect unintended graph structure changes. |
| 2 | Add integration test for full audit run | High | High | AC-5/6/7 test routing but not full execution. Add end-to-end test with mock lens nodes. |
| 3 | Add JSDoc examples to all exports | Medium | Low | Current exports have JSDoc comments but no usage examples. Add examples. |
| 4 | Extract common test fixtures to shared file | Low | Low | Schema tests will create fixtures. Extract to __fixtures__/ directory for reuse. |
| 5 | Add test coverage reporting to CI | Medium | Medium | Verify 45%+ global coverage in CI, fail if below threshold. |
| 6 | Add TypeScript strict mode test | Low | Low | Verify all exports work with strictest TypeScript settings. |
| 7 | Document graph visualization | Low | Medium | Add Mermaid diagram of graph structure to README or docs. |
| 8 | Add comparison test vs metrics/elaboration graphs | Low | Medium | Verify code-audit graph follows same patterns as existing graphs. |
| 9 | Create audit-findings fixture generator | Medium | Medium | Add utility to generate valid fixtures for testing (useful for AUDT-0020+). |
| 10 | Add schema migration test | Low | Medium | Test that schema version 1 → 2 upgrade path works (for future schema changes). |

## Categories

### Edge Cases
- Scope type variations (delta, domain, story) - tested only for 'full' scope
- Error handling: permission errors, symlink loops, corrupted directories
- Large file trees (1000+ files) - mentioned but not benchmarked
- Empty audit scope - tested in edge cases
- Malformed state - no negative test

### UX Polish
- JSDoc examples for all exports
- Graph visualization (Mermaid diagram)
- Fixture generator utility for downstream testing

### Performance
- Parallel lens execution timing verification
- Performance benchmarks for file discovery
- Timeout behavior validation

### Observability
- Test coverage reporting in CI
- Snapshot tests for graph structure changes
- Schema migration testing

### Testing Infrastructure
- Shared test fixtures in __fixtures__/ directory
- Full end-to-end integration test with mock nodes
- TypeScript strict mode compatibility test
- Pattern comparison with existing graphs (metrics, elaboration)

---

## Prioritization Recommendations

**High Priority** (consider for AUDT-0020 or AUDT-0030):
1. Full end-to-end integration test - validates entire audit pipeline
2. Parallel lens execution verification - ensures performance promise
3. Scope type variations (delta/domain/story) - needed for real usage

**Medium Priority** (consider for later AUDT stories):
1. Fixture generator utility - helps with AUDT-0020 lens testing
2. Snapshot tests for graph structure - prevents regressions
3. JSDoc examples - improves developer experience

**Low Priority** (defer to general platform improvements):
1. Performance benchmarks - premature optimization
2. Schema migration testing - YAGNI until schema v2 needed
3. CI coverage reporting - project-wide enhancement
4. Mermaid diagram - documentation polish

---

## Notes

This story is **foundation work** - the focus is on establishing patterns and getting basic tests in place. Many enhancements are deferred because:

1. **AUDT-0020 (9 Audit Lens Nodes)** will add lens-specific logic and may reveal new test needs
2. **AUDT-0030 (Audit Orchestration Nodes)** will polish orchestration and may add persistence tests
3. **Full E2E testing** should wait until lens nodes have real implementations (not just placeholders)
4. **Performance testing** is premature until we have real workloads to benchmark

The MVP (this story) correctly focuses on:
- Export infrastructure (enables downstream work)
- Graph compilation and routing (validates architecture)
- Schema validation (ensures data integrity)
- Basic file discovery (proves core scan-scope logic)

This is appropriate for a Wave 1 foundation story.
