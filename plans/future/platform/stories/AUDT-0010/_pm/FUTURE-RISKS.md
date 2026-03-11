# Future Risks: AUDT-0010

## Non-MVP Risks

### Risk 1: Incomplete Test Coverage for All Lens Nodes

**Impact**: Only scan-scope is getting comprehensive tests. The 9 lens nodes (security, duplication, react, etc.) are not tested in this story.

**Recommended timeline**: AUDT-0020 should add lens-specific tests when polishing lens logic.

---

### Risk 2: No End-to-End Audit Execution Test

**Impact**: Integration tests verify graph compilation and routing, but don't run a full audit against real codebase files.

**Recommended timeline**: AUDT-0030 should add E2E test with real file fixtures after orchestration nodes are polished.

---

### Risk 3: No Performance Benchmarks for Large Codebases

**Impact**: scan-scope may be slow on large repos (10K+ files). No baseline performance metrics.

**Recommended timeline**: Add performance tests in future story if audit runtime becomes a concern.

---

### Risk 4: Missing CLI Integration

**Impact**: /code-audit command spec exists but isn't tested or integrated with the graph.

**Recommended timeline**: Separate story for CLI integration after AUDT-0030 completes.

---

### Risk 5: No Validation for FINDINGS.yaml Format

**Impact**: persist-findings writes YAML but no schema validation on read-back.

**Recommended timeline**: Add round-trip validation tests in AUDT-0030.

---

## Scope Tightening Suggestions

1. **Defer lens node tests**: AUDT-0020 is explicitly for polishing lenses, tests can be added then.

2. **Defer CLI wiring**: Focus on package exports and core infrastructure tests first.

3. **Defer orchestration node tests**: AUDT-0030 is explicitly for orchestration logic, defer comprehensive tests.

---

## Future Requirements

1. **Performance monitoring**: Add telemetry for scan-scope file discovery timing.

2. **Lens node mocking**: Create comprehensive mocks for all 9 lens nodes to support integration tests.

3. **FINDINGS.yaml versioning**: Add schema version field for backward compatibility.

4. **Delta audit testing**: Test delta scope mode with previous findings detection.

5. **Error handling documentation**: Document error scenarios for each node.
