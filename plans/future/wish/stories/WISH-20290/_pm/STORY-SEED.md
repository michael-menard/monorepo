---
generated: "2026-02-08"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WISH-20290

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file found at expected path. Proceeding with codebase scanning and index context.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Test utility helpers | `apps/web/app-wishlist-gallery/src/test/utils/` | In UAT (WISH-2120) | Parent story - utilities exist and are tested |
| Vitest test infrastructure | `apps/web/app-wishlist-gallery/vitest.config.ts` | Active | Configuration target for this story |
| Test utilities tests | `src/test/utils/__tests__/` | Active | 34 passing tests with 100% coverage |
| MSW test infrastructure | `src/test/mocks/` | Active | Used by test utilities |

### Active In-Progress Work

| Story ID | Title | Status | Overlap Risk |
|----------|-------|--------|--------------|
| WISH-2120 | Test utility helpers | UAT | Low - parent story in UAT, utilities complete |
| WISH-2013 | File Upload Security Hardening | Blocked | None - different scope |
| WISH-2015 | Drag preview implementation | In Progress | None - different feature area |
| WISH-2032 | Backend pagination | In Progress | None - backend only |

### Constraints to Respect

1. **Parent Story Status**: WISH-2120 is in UAT status, meaning test utilities are implemented and passing all tests
2. **No New Dependencies**: Story must use existing Vitest infrastructure (`vitest` and `@vitest/coverage-v8` already installed)
3. **Configuration Only**: Story is explicitly marked as "Small (configuration only)" with 1 point effort
4. **Global Coverage Unchanged**: Existing 45% global coverage threshold must remain unchanged (per AC5)
5. **Test Infrastructure Quality**: Parent story achieved 100% coverage for utilities, this story enforces that standard going forward

---

## Retrieved Context

### Related Endpoints
- None (test infrastructure only)

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| createMockFile | `src/test/utils/createMockFile.ts` | Mock file factory for upload testing |
| mockS3Upload | `src/test/utils/mockS3Upload.ts` | S3 upload scenario mocking |
| Test utilities index | `src/test/utils/index.ts` | Exports for test utilities |
| Test utility tests | `src/test/utils/__tests__/` | 100% coverage tests (34 passing) |

### Reuse Candidates

| Pattern/Package | Source | Usage in This Story |
|----------------|--------|---------------------|
| Vitest coverage configuration | `vitest.config.ts` (existing) | Extend with per-directory thresholds |
| Per-directory thresholds | Vitest documentation | Use glob pattern matching for `src/test/utils/**/*.ts` |
| Test script commands | `package.json` scripts | Reuse existing `test:coverage` script |
| Coverage provider v8 | `@vitest/coverage-v8` (installed) | Already configured, no changes needed |

---

## Knowledge Context

### Lessons Learned
No lessons learned data loaded (no knowledge base query performed yet). However, based on parent story context:
- **[WISH-2120]** Test utilities require explicit test coverage to maintain quality (Enhancement Opportunity → WISH-20290)
  - *Applies because*: Parent story identified coverage enforcement as a gap during QA elaboration

### Blockers to Avoid (from past stories)
- No baseline data available to extract historical blockers
- However, parent story documentation is complete and clear

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | Minimum one happy-path E2E test per story |

**Note**: While ADR-005 and ADR-006 apply to testing strategy overall, they do not directly constrain this story since WISH-20290 is configuration-only and does not add new tests or modify test behavior.

### Patterns to Follow
- **Vitest coverage object extension**: Add thresholds object with glob patterns for per-directory coverage
- **Two-tier coverage strategy**: Maintain distinction between global thresholds (45%) and critical infrastructure thresholds (80%)
- **Configuration documentation**: Document all coverage requirements in README files

### Patterns to Avoid
- **Breaking existing tests**: Coverage thresholds must not cause currently passing tests to fail
- **Coverage enforcement on wrong files**: Ensure glob pattern matches only `src/test/utils/**/*.ts`, not other test files

---

## Conflict Analysis

No conflicts detected.

**Analysis performed**:
- ✓ No overlapping work with in-progress stories
- ✓ No protected features being modified (configuration only)
- ✓ No pattern violations detected
- ✓ No ADR violations detected
- ✓ Parent story (WISH-2120) in UAT with utilities complete and tested

---

## Story Seed

### Title
Coverage metrics integration for test utilities

### Description

**Context**:
WISH-2120 established test utility helpers (`createMockFile`, `mockS3Upload`) that reduce S3 upload test boilerplate. These utilities currently have 100% test coverage (verified: 34 passing tests in `src/test/utils/__tests__/`), but there is no automated enforcement to prevent future coverage regressions.

**Problem**:
Without coverage threshold enforcement in `vitest.config.ts`, developers might:
- Add new utility functions without corresponding tests
- Modify existing utilities and miss edge cases
- Reduce coverage accidentally through refactoring

This represents technical debt that should be addressed before test utilities proliferate across the codebase (WISH-2121 for Playwright, potential future utility expansions).

**Solution**:
Add Vitest coverage threshold enforcement (minimum 80%) specifically for `src/test/utils/**/*.ts` files. This creates a two-tier coverage strategy:
1. **Global coverage (45%)**: Production code and existing tests maintain current thresholds
2. **Test utilities (80%)**: Higher bar for test infrastructure to ensure reliability

The 80% threshold is chosen to balance rigor with pragmatism, allowing some uncovered edge cases while preventing significant coverage drops.

### Initial Acceptance Criteria

**Coverage Threshold Enforcement:**
- [ ] **AC1:** `vitest.config.ts` defines coverage thresholds of 80% (lines, functions, branches, statements) for `src/test/utils/**/*.ts`
- [ ] **AC2:** Running `pnpm test:coverage` (or `pnpm vitest run --coverage`) fails if test utility coverage drops below 80%
- [ ] **AC3:** Coverage thresholds apply only to `src/test/utils/` directory, not global test files
- [ ] **AC4:** Coverage report shows test utility coverage separately in terminal output
- [ ] **AC5:** Existing global coverage configuration remains unchanged (no impact on current 45% global approach)

**Documentation:**
- [ ] **AC6:** Create `src/test/utils/README.md` documenting the 80% coverage requirement
- [ ] **AC7:** README includes command to run coverage checks locally: `pnpm test:coverage` or `pnpm vitest run src/test/utils --coverage`
- [ ] **AC8:** README explains how to view detailed coverage reports (HTML output in `coverage/index.html`)
- [ ] **AC9:** README provides guidance on maintaining coverage when adding new utilities

**Validation:**
- [ ] **AC10:** All test utilities from WISH-2120 (`createMockFile`, `mockS3Upload`) meet 80% threshold (verified: currently at 100%)
- [ ] **AC11:** CI pipeline enforces coverage thresholds and fails PR if violated
- [ ] **AC12:** Coverage report includes clear error messages when thresholds are not met

### Non-Goals

- **Coverage enforcement for production code**: Separate concern outside this story's scope
- **Coverage enforcement for E2E tests**: Playwright does not use Vitest coverage
- **Changing the test utilities themselves**: WISH-2120 scope only, utilities are complete
- **Retroactive coverage enforcement for existing non-utility test files**: Only applies to `src/test/utils/`
- **Modifying global coverage thresholds**: 45% global threshold remains unchanged

### Reuse Plan

**Components**: None (configuration only)

**Patterns**:
- Vitest per-directory threshold configuration (glob patterns)
- Two-tier coverage strategy pattern (global vs critical infrastructure)
- README documentation structure from existing app documentation

**Packages**:
- `vitest` (already installed and configured)
- `@vitest/coverage-v8` (already installed and configured)
- No new dependencies required

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Considerations**:
1. **Validation scenarios**: Test coverage pass/fail scenarios by temporarily modifying test files
2. **CI integration**: Verify that coverage failures properly fail the CI pipeline
3. **Error message clarity**: Ensure developers get actionable feedback when thresholds are not met
4. **HTML report generation**: Validate that `coverage/index.html` is generated and accessible
5. **Glob pattern accuracy**: Confirm pattern matches only intended files (`src/test/utils/**/*.ts`)

**Evidence Commands**:
```bash
# Run test utility coverage
pnpm --filter app-wishlist-gallery vitest run src/test/utils --coverage

# Run full coverage suite
pnpm --filter app-wishlist-gallery vitest run --coverage

# View HTML coverage report
open apps/web/app-wishlist-gallery/coverage/index.html
```

**Test Data Needed**:
- Current coverage baseline for test utilities (verified: 100%)
- Coverage report output showing per-directory breakdown
- CI pipeline logs showing coverage enforcement

### For UI/UX Advisor

Not applicable - configuration-only story with no UI/UX impact.

### For Dev Feasibility

**Implementation Notes**:
1. **Configuration simplicity**: Vitest supports per-directory thresholds via simple object notation
2. **Vitest version compatibility**: Project uses `vitest@3.0.5` which fully supports coverage thresholds
3. **Coverage provider**: Already using `v8` provider, no changes needed
4. **Test script integration**: Existing `test:coverage` script in package.json works without modification
5. **Documentation location**: Create new `src/test/utils/README.md` (does not exist yet)

**Example Configuration**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        // Per-directory threshold for test utilities
        'src/test/utils/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
})
```

**Risks**:
- **Low risk**: Configuration change only, no code modifications
- **Validation required**: Ensure existing tests still pass with new thresholds
- **CI integration**: May require updating CI configuration to fail on coverage violations

**Effort Validation**: 1 point effort is appropriate - this is a straightforward Vitest configuration change with documentation.
