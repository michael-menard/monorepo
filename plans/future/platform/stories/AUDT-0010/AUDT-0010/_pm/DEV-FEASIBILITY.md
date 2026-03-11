# Dev Feasibility Review: AUDT-0010

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is polish/housekeeping work on already-scaffolded components. Core infrastructure exists, we're adding exports and tests.

## Likely Change Surface (Core Only)

### Packages Touched

- `packages/backend/orchestrator/src/artifacts/`
  - audit-findings.ts (no changes)
  - __tests__/audit-findings.test.ts (NEW)
  - index.ts (UPDATE: add exports)

- `packages/backend/orchestrator/src/graphs/`
  - code-audit.ts (no changes)
  - __tests__/code-audit.test.ts (NEW)
  - index.ts (UPDATE: add exports)

- `packages/backend/orchestrator/src/nodes/audit/`
  - scan-scope.ts (no changes)
  - __tests__/scan-scope.test.ts (NEW)
  - index.ts (NEW: barrel export)

- `packages/backend/orchestrator/src/nodes/`
  - index.ts (UPDATE: add audit exports)

- `packages/backend/orchestrator/src/`
  - index.ts (UPDATE: add audit exports if needed)

### Endpoints Touched

None - backend package work only.

### Critical Deploy Touchpoints

- TypeScript compilation must pass
- Package build must succeed
- Vitest tests must pass (new tests added)
- pnpm check-types --filter orchestrator must pass

## MVP-Critical Risks

**None identified.** This is low-risk polish work.

## Missing Requirements for MVP

**None.** Story seed is comprehensive and well-specified.

## MVP Evidence Expectations

### Unit Tests

1. **Schema validation tests** (artifacts/__tests__/audit-findings.test.ts):
   - Valid fixture parsing
   - Invalid fixture rejection
   - All schema variations tested

2. **Graph compilation tests** (graphs/__tests__/code-audit.test.ts):
   - Graph compiles successfully
   - Pipeline routing verified
   - Roundtable routing verified

3. **scan-scope tests** (nodes/audit/__tests__/scan-scope.test.ts):
   - File discovery works
   - File categorization correct
   - Exclusion patterns work

### Type Checking

- `pnpm check-types --filter orchestrator` passes with no errors
- All exports properly typed
- JSDoc comments present

### Build Success

- `pnpm build --filter orchestrator` succeeds
- Package exports correctly registered
- No missing dependencies

## Implementation Notes

### Recommended Order

1. **Phase 1: Schema Tests** (1-2 hours)
   - Create fixtures
   - Write audit-findings.test.ts
   - Verify 90%+ coverage

2. **Phase 2: scan-scope Tests** (1-2 hours)
   - Create temp directory fixtures
   - Write scan-scope.test.ts
   - Verify file discovery + categorization

3. **Phase 3: Integration Tests** (2-3 hours)
   - Write code-audit.test.ts
   - Test graph compilation
   - Test routing logic (pipeline + roundtable modes)

4. **Phase 4: Export Registration** (1 hour)
   - Update artifacts/index.ts
   - Create nodes/audit/index.ts
   - Update nodes/index.ts
   - Update graphs/index.ts
   - Update src/index.ts if needed

### Reuse Patterns

- **Schema Testing**: Follow checkpoint.test.ts pattern
  - Valid/invalid fixtures
  - Edge case handling
  - Factory function tests

- **Graph Testing**: Follow elaboration.test.ts and metrics.test.ts patterns
  - Graph compilation check
  - Conditional routing tests
  - State transition verification

- **Export Pattern**: Follow existing index.ts conventions
  - JSDoc headers
  - Grouped exports
  - Type aliases for clarity

### Testing Challenges

1. **Dynamic imports**: createLensParallelNode uses dynamic imports for lens nodes
   - **Mitigation**: Test compiled graph instead of individual node loading
   - **Alternative**: Mock import mechanism if needed

2. **Filesystem access**: scan-scope reads from filesystem
   - **Mitigation**: Use os.tmpdir() + fixtures
   - **Cleanup**: Remove temp dirs in afterEach

3. **Conditional routing**: Two routing paths (pipeline vs roundtable)
   - **Mitigation**: Explicit test cases for each mode
   - **Verification**: Check state transitions through graph

### Time Estimate

- Schema tests: 1-2 hours
- scan-scope tests: 1-2 hours
- Integration tests: 2-3 hours
- Export registration: 1 hour
- **Total**: 5-8 hours

**T-shirt size**: M (Medium)

### Dependencies

**No new dependencies required.**

All imports already available:
- @langchain/langgraph (existing)
- zod (existing)
- vitest (existing)
- @repo/logger (existing)

### TypeScript Considerations

- All exports need JSDoc comments
- Use descriptive type aliases to avoid collisions
- Strict mode already enabled
- No `any` types expected

### Success Criteria

1. All new tests pass
2. pnpm check-types passes
3. pnpm build passes
4. Coverage targets met:
   - audit-findings.ts: 90%+
   - code-audit.ts: 80%+
   - scan-scope.ts: 80%+
5. All exports registered correctly
6. No runtime errors in graph compilation
