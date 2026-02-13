# Future Opportunities - REPA-006

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No automated migration script for future similar migrations | Low | Medium | Create reusable migration script template for package consolidation stories (batch rename imports, verify grep, run tests) |
| 2 | Deprecation console.warn() lacks usage analytics | Low | Low | Add telemetry to deprecation warning (count imports) to know when safe to delete old package |
| 3 | No eslint rule to prevent imports from deprecated packages | Medium | Medium | Create custom eslint rule to flag @repo/upload-types imports after deprecation period |
| 4 | Test coverage threshold is global minimum (45%) not per-module | Low | Low | Consider package-specific coverage targets for types packages (suggest 80%+ for schema validation) |
| 5 | No Zod version compatibility CI check | Low | Medium | Add CI step to validate Zod schema compatibility across major versions (prevent future upgrade issues) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Type file organization could be improved | Medium | Low | Consider further subdividing types/ into session/, upload/, slug/, edit/ subdirectories for better organization (future refactor) |
| 2 | Barrel exports don't use named re-exports | Low | Low | Migrate from `export *` to explicit named re-exports in types/index.ts for better tree-shaking and IDE autocomplete |
| 3 | No schema documentation/examples in package README | Medium | Low | Add usage examples and schema documentation to @repo/upload README (help developers discover types) |
| 4 | Deprecated package lacks automated deletion trigger | Low | Medium | Add calendar reminder or GitHub issue template for post-deprecation cleanup (2 sprint cycles = specific date) |
| 5 | Migration guide in deprecated package is manual only | Low | Medium | Create codemod script for automated import path migration (reduce manual error risk) |
| 6 | No performance benchmarks for Zod schema validation | Low | High | Add benchmark suite for schema parsing/validation performance (useful for large file uploads) |
| 7 | Type exports don't specify export conditions (browser vs node) | Low | Medium | Add conditional exports in package.json for browser-specific vs node-specific types if needed |
| 8 | No JSDoc comments on exported types | Medium | Low | Add JSDoc comments to all exported types/schemas for better IDE hover documentation |

## Categories

### Edge Cases
- **Gap 3**: No eslint protection against deprecated imports after grace period
- **Gap 2**: No usage tracking for deprecated package (unknown when safe to delete)

### UX Polish
- **Enhancement 8**: JSDoc comments for better developer experience
- **Enhancement 3**: Schema documentation and usage examples
- **Enhancement 2**: Named re-exports for better IDE support

### Performance
- **Enhancement 6**: Schema validation performance benchmarks

### Observability
- **Gap 2**: Deprecation warning telemetry
- **Gap 5**: Zod compatibility CI checks

### Tooling
- **Gap 1**: Reusable migration script template
- **Enhancement 5**: Automated import migration codemod
- **Enhancement 4**: Post-deprecation cleanup automation

### Code Organization
- **Enhancement 1**: Further type file subdivisions
- **Gap 4**: Package-specific coverage thresholds
- **Enhancement 7**: Conditional exports for browser vs node

---

## Notes

All opportunities listed are explicitly non-blocking for MVP. The core migration story (REPA-006) delivers:
- Single source of truth for upload types ✓
- Comprehensive test coverage (559 LOC migrated) ✓
- Clean deprecation path with grace period ✓
- All consumers updated and verified ✓

The enhancements above represent polish, tooling improvements, and developer experience upgrades that can be addressed in future sprints as time permits or as patterns emerge for similar migration stories (REPA-003, REPA-005, etc.).

**Priority Recommendation**: If time permits after REPA-006 completion:
1. Enhancement 8 (JSDoc) - Low effort, high developer value
2. Enhancement 3 (Documentation) - Low effort, helps other teams discover types
3. Gap 3 (ESLint rule) - Medium effort, prevents regressions after deprecation period
