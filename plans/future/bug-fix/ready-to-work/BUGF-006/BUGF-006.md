---
id: BUGF-006
title: "Replace Console Usage with @repo/logger Across Frontend Apps"
status: ready-to-work
priority: P2
phase: 2
experiment_variant: control
epic: bug-fix
story_type: tech_debt
points: 2
dependencies: []
created: "2026-02-11"
elaboration_completed: "2026-02-11"
elaboration_verdict: CONDITIONAL_PASS
tags:
  - logging
  - code-quality
  - infrastructure
  - good-first-issue
surfaces:
  frontend: true
  backend: false
  database: false
---

# BUGF-006: Replace Console Usage with @repo/logger Across Frontend Apps

## Context

The project has an established `@repo/logger` package that provides structured, environment-aware logging with proper log levels and formatting. CLAUDE.md explicitly mandates "Don't use console.log - use @repo/logger" across the codebase. However, 8 source files across 3 frontend applications still use console statements instead of the logger.

Console statements provide no structure, no log levels, no filtering, and no production-appropriate behavior. They bypass the configured logging infrastructure and violate project standards. While ESLint warns about console usage, several files have suppressions or haven't been updated.

## Goal

Systematically replace all console.log/error/warn/debug statements in application source files with appropriate @repo/logger calls. This ensures:
- Consistent structured logging across all frontend applications
- Compliance with CLAUDE.md standards
- Elimination of ESLint no-console warnings in source files
- Proper log level management and filtering
- Production-ready logging behavior

## Non-Goals

**Do NOT modify test files**: Test files (6 files with console usage) are intentionally excluded from no-console ESLint rules and should remain unchanged. Tests may legitimately use console for test runner output.

**Do NOT modify CI/CD workflows**: `.github/workflows/test-coverage.yml` legitimately uses console for GitHub Actions output and should not be changed.

**Do NOT modify backend files**: API/backend files in `apps/api/` are allowed to use console per ESLint config (line 269) for Node.js server logging.

**Do NOT create new logger infrastructure**: @repo/logger is complete and ready to use. No package changes, configuration changes, or new features required.

**Do NOT change logger configuration**: No changes to logger transports, levels, or setup required. Use logger as-is.

## Scope

### Applications Affected
1. **app-inspiration-gallery**: 1 file, 5 occurrences
2. **app-instructions-gallery**: 1 file, 2 occurrences
3. **main-app**: 2 source files, 4 occurrences (excluding test files and MSW handlers)

### Files to Modify (4 total)

#### app-inspiration-gallery (1 file)
- `src/pages/main-page.tsx` (lines 326, 333, 379, 599, 678)
  - All are TODO placeholders for unimplemented features
  - Replace with logger.info() or appropriate level

#### app-instructions-gallery (1 file)
- `src/DetailModule.tsx` (lines 88, 101)
  - Both have `// eslint-disable-next-line no-console` suppressions
  - Replace with logger calls and remove eslint-disable comments

#### main-app (2 files)
- `src/routes/admin/pages/AdminUserDetailPage.tsx` (lines 58, 67, 76)
  - 3 console.error statements for error handling
  - Replace with logger.error()

- `src/mocks/handlers.ts` (line 195)
  - MSW debugging statement
  - **Decision**: Keep console for MSW dev tooling (document as exception)

### Files Explicitly Excluded

**Test files (6 files, 8+ occurrences)** - intentionally excluded:
- `main-app/src/mocks/handlers.ts` - MSW dev tooling
- `main-app/src/components/Navigation/__tests__/setup.tsx`
- `main-app/src/components/Navigation/__tests__/NavigationProvider.test.tsx`
- `main-app/src/components/ErrorBoundary/__tests__/ErrorBoundary.test.tsx`

**CI/CD workflows (1 file, 4 occurrences)** - legitimate use:
- `.github/workflows/test-coverage.yml`

**Backend files** - console allowed per ESLint config:
- All files in `apps/api/**`

## Acceptance Criteria

- [ ] **AC-1**: All 5 console.log statements in `app-inspiration-gallery/src/pages/main-page.tsx` are replaced with `logger.info()` or appropriate level
- [ ] **AC-2**: All 2 console statements in `app-instructions-gallery/src/DetailModule.tsx` are replaced with logger calls
- [ ] **AC-3**: All `eslint-disable-next-line no-console` comments are removed from `app-instructions-gallery/src/DetailModule.tsx`
- [ ] **AC-4**: All 3 console.error statements in `main-app/src/routes/admin/pages/AdminUserDetailPage.tsx` are replaced with `logger.error()`
- [ ] **AC-5**: All affected files import `@repo/logger` using standard pattern: `import { logger } from '@repo/logger'`
- [ ] **AC-6**: `pnpm lint` passes with no console-related warnings in modified files
- [ ] **AC-7**: `pnpm check-types` passes for all modified files
- [ ] **AC-8**: Verify logger output appears correctly in browser console during development (log messages should still be visible and readable)
- [ ] **AC-9**: Test files remain unmodified (verify via git diff)
- [ ] **AC-10**: CI/CD workflows remain unmodified (verify via git diff)

## Reuse Plan

### Package: @repo/logger
- **Location**: `packages/core/logger/`
- **Status**: Fully implemented and stable
- **Dependencies**: Already installed in all 3 apps via `workspace:*`

### Import Pattern (Standard)
```typescript
import { logger } from '@repo/logger'
```

### Logger Methods
```typescript
// Informational logs (replaces console.log)
logger.info('User action completed', { userId, action })

// Error logs (replaces console.error)
logger.error('Failed to load data', error, { context })

// Warning logs (replaces console.warn)
logger.warn('Deprecated feature used', { feature })

// Debug logs (replaces console.debug)
logger.debug('State change', { oldState, newState })
```

### Existing Examples
34+ files across the codebase already use logger correctly. Reference patterns from:
- `apps/web/main-app/src/hooks/useTokenRefresh.ts`
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- `packages/core/app-component-library/src/**/*.tsx`

### Replacement Patterns
| Console Call | Logger Replacement | Notes |
|--------------|-------------------|-------|
| `console.log(msg)` | `logger.info(msg)` | General information |
| `console.error(msg, err)` | `logger.error(msg, err)` | Errors with stack traces |
| `console.warn(msg)` | `logger.warn(msg)` | Warnings |
| `console.debug(msg)` | `logger.debug(msg)` | Debug information |

## Architecture Notes

### Package Boundaries
- Logger is correctly placed in `packages/core/logger/` (shared core package)
- Frontend apps consume via workspace dependency
- No circular dependencies
- No architectural changes required

### Standards Compliance
- **CLAUDE.md**: "Don't use console.log - use @repo/logger" ✅
- **ESLint**: Fixes all no-console warnings in source files ✅
- **Zod-First**: Logger package already uses Zod schemas ✅
- **Functional Components**: No component changes required N/A

### Logging Strategy
- **Development**: Logger outputs to browser console (human-readable)
- **Production**: Logger respects environment configuration
- **Structured Logging**: All logs include level, timestamp, context
- **Error Context**: Error objects automatically include stack traces

## Test Plan

Comprehensive test plan available at: `_pm/TEST-PLAN.md`

### Summary
- **Lint validation**: Verify no console warnings in modified files
- **Type checking**: Ensure TypeScript compilation succeeds
- **Manual verification**: Check logger output in browser console for each app
- **Regression testing**: Confirm existing tests pass unchanged

### Key Test Cases
1. Logger import and basic usage (verify output appears in console)
2. Error logging with stack traces (verify error details logged)
3. Different log levels (info, error, warn)
4. ESLint validation after changes (no warnings)
5. Edge case: logger with multiple arguments

### Evidence Required
- Screenshot of browser console showing logger output
- ESLint output showing 0 console-related warnings
- TypeScript compilation success
- Git diff showing only source files modified (not test files)

## Predictions

```yaml
predictions:
  split_risk: 0.3
  review_cycles: 1
  token_estimate: 80000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-11T17:37:20Z"
  model: haiku
  wkfl_version: "007-v1"
  notes: "Heuristics-only mode (KB and WKFL-006 unavailable). Very low risk story - simple search/replace operation with established patterns."
```

**Interpretation**:
- **Low split risk (0.3)**: Simple, well-scoped replacement task unlikely to require splitting
- **Single review cycle (1)**: Straightforward changes, clear acceptance criteria
- **Low token estimate (80K)**: Below average due to simplicity and clear patterns
- **Low confidence**: Predictions based on heuristics only (no similar story data available)

## Dev Feasibility

Comprehensive feasibility review available at: `_pm/DEV-FEASIBILITY.md`

### Summary
- **Feasible**: Yes (High confidence)
- **Complexity**: Very low (search-and-replace with clear patterns)
- **Time Estimate**: 1-2 hours (including testing)
- **Skill Level**: Junior-friendly, good first issue
- **MVP-Critical Risks**: None

### Change Surface
- 4 source files across 3 frontend apps
- ~11 console statement replacements
- Add logger imports where missing
- Remove eslint-disable comments

### Implementation Steps
1. Add logger import to each file (if not present)
2. Replace console.log → logger.info()
3. Replace console.error → logger.error()
4. Replace console.warn → logger.warn()
5. Remove eslint-disable-next-line comments
6. Run lint, type-check, tests
7. Manual verification in browser console

## MSW Handler Decision

**File**: `main-app/src/mocks/handlers.ts` (line 195)

**Decision**: **Keep console for MSW debugging** (document as exception)

**Rationale**:
- MSW handlers are development infrastructure, not application code
- Console output may be clearer for mock debugging
- Aligns with test file exclusion principle (dev tooling vs application code)
- MSW is dev-only and never runs in production

**Documentation**:
Add comment in handlers.ts:
```typescript
// Intentional console usage for MSW debugging (dev tooling exception)
// MSW handlers are development infrastructure, not application code
console.log('[MSW] Request intercepted:', req.url)
```

## Reality Baseline

### Existing Features Used
| Feature | Location | Status |
|---------|----------|--------|
| @repo/logger package | packages/core/logger/ | Exists - fully implemented |
| Simple logger export | packages/core/logger/src/simple-logger.ts | Available |
| Lambda logger export | packages/core/logger/src/lambda-logger.ts | Available (not used in this story) |
| All 3 apps have @repo/logger dependency | package.json files | Configured |

### Console Usage Inventory
**Total**: 8 files, ~26 console statements across 3 apps

**In Scope (4 files, 11 occurrences)**:
- app-inspiration-gallery/src/pages/main-page.tsx (5)
- app-instructions-gallery/src/DetailModule.tsx (2)
- main-app/src/routes/admin/pages/AdminUserDetailPage.tsx (3)
- main-app/src/mocks/handlers.ts (1) - **keep as exception**

**Out of Scope (4+ files, 15+ occurrences)**:
- Test files (6 files, 8+ occurrences) - intentionally excluded
- CI workflows (1 file, 4 occurrences) - legitimate use

### ESLint Configuration
- **Line 163**: `'no-console': 'warn'` for frontend apps
- **Line 269**: Console allowed in Node.js/backend
- **Lines 349-355**: Test files excluded from no-console rules

### Constraints Respected
- CLAUDE.md mandate: "Don't use console.log - use @repo/logger"
- ESLint warnings should be addressed (but don't break builds)
- Test files have different logging needs (excluded by design)
- CI/CD workflows legitimately use console for output

### No Conflicts Detected
No active in-progress work conflicts with this story. All apps can be modified independently.

## Related Documentation

- Test Plan: `_pm/TEST-PLAN.md`
- Dev Feasibility: `_pm/DEV-FEASIBILITY.md`
- Future Risks: `_pm/FUTURE-RISKS.md`
- Story Seed: `_pm/STORY-SEED.md`
- CLAUDE.md: `/CLAUDE.md` (logging standards)
- ESLint Config: `/eslint.config.js` (no-console rules)

## Story Metadata

**Created**: 2026-02-11
**Epic**: bug-fix
**Phase**: 2 (Cross-App Infrastructure)
**Points**: 2
**Priority**: P2
**Type**: tech_debt
**Good First Issue**: Yes
**Experiment Variant**: control

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-SEED.md | input | 9,452 | ~2,363 |
| Read: pm-spawn-patterns.md | input | 3,398 | ~850 |
| Read: experiments.yaml | input | 2,668 | ~667 |
| Read: pm-draft-test-plan.agent.md | input | 1,907 | ~477 |
| Read: pm-dev-feasibility-review.agent.md | input | 2,287 | ~572 |
| Read: pm-story-risk-predictor.agent.md | input | 14,442 | ~3,611 |
| Read: stories.index.md | input | 18,758 | ~4,690 |
| Read: _token-logging.md | input | 2,762 | ~691 |
| Write: TEST-PLAN.md | output | 6,660 | ~1,665 |
| Write: DEV-FEASIBILITY.md | output | 4,873 | ~1,218 |
| Write: FUTURE-RISKS.md | output | 5,621 | ~1,405 |
| Write: BUGF-006.md | output | 12,339 | ~3,085 |
| Edit: stories.index.md (3 updates) | output | ~600 | ~150 |
| **Total Input** | — | 55,674 | **~13,921** |
| **Total Output** | — | 30,093 | **~7,523** |
| **Grand Total** | — | 85,767 | **~21,444** |

**Actual token usage**: 45,975 tokens consumed (input + output combined from system tracking)

**Notes**:
- Executed all worker tasks directly (test plan, dev feasibility, risk predictor) in single agent session
- No sub-agent spawning (Task tool not available)
- Experiment variant assignment: control (no active experiments in experiments.yaml)
- KB persistence: skipped (KB unavailable, graceful degradation)
- Index update: completed successfully

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps identified | Story well-formed and complete | 0 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry |
|---|---------|----------|----------|
| 1 | app-sets-gallery and app-wishlist-gallery not included | future-work | BUGF-006-KB-001 |
| 2 | Test file console usage not audited | edge-case | BUGF-006-KB-002 |
| 3 | No automated prevention mechanism | code-quality | BUGF-006-KB-003 |
| 4 | Logger context/correlation not utilized | observability | BUGF-006-KB-004 |
| 5 | Error objects may lose stack traces | edge-case | BUGF-006-KB-005 |
| 6 | Structured logging not fully leveraged | observability | BUGF-006-KB-006 |
| 7 | Log levels could be more semantic | ux-polish | BUGF-006-KB-007 |
| 8 | MSW handler exception not enforced | code-quality | BUGF-006-KB-008 |
| 9 | No log aggregation or filtering strategy | observability | BUGF-006-KB-009 |
| 10 | Performance logging not utilized | performance | BUGF-006-KB-010 |
| 11 | Logger configuration not customized per app | code-quality | BUGF-006-KB-011 |

### Summary

- **ACs added**: 0
- **KB entries created**: 11
- **Mode**: autonomous
- **Audit status**: All 8 checks passed or resolved
- **Minor issues**: 4 (all non-blocking, informational only)
- **Ready for work**: YES
