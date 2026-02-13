---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-006

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file exists at plans/baselines/

### Relevant Existing Features
| Feature | Location | Status |
|---------|----------|--------|
| @repo/logger package | packages/core/logger/ | Exists - fully implemented |
| Simple logger export | packages/core/logger/src/simple-logger.ts | Available - logger instance ready for use |
| Lambda logger export | packages/core/logger/src/lambda-logger.ts | Available - for serverless environments |
| All 3 apps have @repo/logger dependency | package.json files | Configured - workspace:* dependencies |

### Active In-Progress Work
No active in-progress work detected that would conflict with this story.

### Constraints to Respect
- CLAUDE.md explicitly mandates: "Don't use console.log - use @repo/logger"
- ESLint config has `'no-console': 'warn'` for frontend apps (line 163)
- ESLint config allows console in Node.js/backend (line 269)
- ESLint config allows console in test files (excluded via ignores at line 349-355)

---

## Retrieved Context

### Console Usage Found

**app-inspiration-gallery (1 file, 5 occurrences):**
- `src/pages/main-page.tsx` (lines 326, 333, 379, 599, 678)
  - All are TODO placeholders for unimplemented features
  - Related to: album management, MOC linking, context menus

**app-instructions-gallery (1 file, 2 occurrences):**
- `src/DetailModule.tsx` (lines 88, 101)
  - Both have `// eslint-disable-next-line no-console` suppressions
  - Related to: edit instruction, toggle favorite (fallback logging)

**main-app (6 files, 14+ occurrences):**
- `src/mocks/handlers.ts` (line 195) - MSW debugging
- `src/routes/admin/pages/AdminUserDetailPage.tsx` (lines 58, 67, 76) - Error handling (3x)
- `src/components/Navigation/__tests__/setup.tsx` (lines 179, 209) - Test utilities (2x)
- `src/components/Navigation/__tests__/NavigationProvider.test.tsx` (lines 71, 103) - Test mocks (2x)
- `src/components/ErrorBoundary/__tests__/ErrorBoundary.test.tsx` (lines 73-80) - Test setup (4x)
- `.github/workflows/test-coverage.yml` (lines 54-57) - CI workflow (4x)

**Total: 8 files, ~26 console statements across 3 apps**

### Related Components
| Component | App | Usage Pattern |
|-----------|-----|---------------|
| main-page.tsx | app-inspiration-gallery | TODO placeholders |
| DetailModule.tsx | app-instructions-gallery | Eslint suppression fallbacks |
| AdminUserDetailPage.tsx | main-app | Error logging |
| MSW handlers | main-app | Debug logging |
| Test files | All apps | Test infrastructure |

### Reuse Candidates
- **@repo/logger package**: Already imported in 34+ files across web apps
- **Simple logger pattern**: `import { logger } from '@repo/logger'` is the standard pattern
- **Logger methods**:
  - `logger.info()` for info/log statements
  - `logger.error()` for error statements
  - `logger.warn()` for warning statements
  - `logger.debug()` for debug statements

---

## Knowledge Context

### Lessons Learned
No lessons learned data available (no knowledge base access configured).

### Blockers to Avoid
Based on codebase analysis:
- **Test file console usage**: Test files are excluded from ESLint no-console rules by design
- **CI/CD workflow console usage**: GitHub Actions workflow files (.github/) should NOT be modified - they legitimately use console for CI output
- **MSW handler debugging**: Consider whether debug logging in MSW handlers should remain console or switch to logger

### Architecture Decisions (ADRs)
No ADR file found. No architecture constraints identified for this story.

### Patterns to Follow
From CLAUDE.md and existing usage:
1. Import logger from @repo/logger: `import { logger } from '@repo/logger'`
2. Replace console.log → logger.info()
3. Replace console.error → logger.error()
4. Replace console.warn → logger.warn()
5. Replace console.debug → logger.debug()
6. Remove eslint-disable-next-line comments after replacement

### Patterns to Avoid
- Do NOT modify test files (explicitly excluded from ESLint no-console rule)
- Do NOT modify CI/CD workflow files (.github/workflows/)
- Do NOT modify node_modules or generated files
- Do NOT modify backend/API files (console is allowed per ESLint config)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Replace Console Usage with @repo/logger Across Frontend Apps

### Description

**Context:**
The project has an established `@repo/logger` package that provides structured, environment-aware logging with proper log levels and formatting. CLAUDE.md explicitly mandates "Don't use console.log - use @repo/logger" across the codebase. However, 8 source files across 3 frontend applications still use console statements instead of the logger.

**Problem:**
Console statements provide no structure, no log levels, no filtering, and no production-appropriate behavior. They bypass the configured logging infrastructure and violate project standards. While ESLint warns about console usage, several files have suppressions or haven't been updated.

**Proposed Solution:**
Systematically replace all console.log/error/warn/debug statements in application source files with appropriate @repo/logger calls. This excludes test files (intentionally), CI workflows (legitimate use), and backend files (console allowed by ESLint config).

**Scope:**
- app-inspiration-gallery: 1 file (5 occurrences)
- app-instructions-gallery: 1 file (2 occurrences)
- main-app: 3 source files (4 occurrences) - excluding test files and CI workflows

**Out of Scope:**
- Test files (6 files, 8+ occurrences) - intentionally excluded per ESLint config
- CI/CD workflows (1 file, 4 occurrences) - legitimate console usage for GitHub Actions
- Backend/API files - console allowed per ESLint config line 269
- MSW mock handlers - decision needed, but likely acceptable for local development debugging

### Initial Acceptance Criteria

- [ ] **AC-1**: All console.log statements in `app-inspiration-gallery/src/pages/main-page.tsx` are replaced with `logger.info()` or appropriate level
- [ ] **AC-2**: All console statements in `app-instructions-gallery/src/DetailModule.tsx` are replaced with logger calls and eslint-disable comments removed
- [ ] **AC-3**: All console.error statements in `main-app/src/routes/admin/pages/AdminUserDetailPage.tsx` are replaced with `logger.error()`
- [ ] **AC-4**: MSW handler console statement in `main-app/src/mocks/handlers.ts` is evaluated and either replaced or documented as intentional
- [ ] **AC-5**: All affected files import `@repo/logger` using the standard pattern: `import { logger } from '@repo/logger'`
- [ ] **AC-6**: All eslint-disable-next-line no-console comments are removed after replacement
- [ ] **AC-7**: `pnpm lint` passes with no console-related warnings in modified files
- [ ] **AC-8**: Verify logger output appears correctly in browser console during development (log messages should still be visible)

### Non-Goals

- **Do NOT modify test files**: Test files (6 files with console usage) are intentionally excluded from no-console ESLint rules and should remain unchanged
- **Do NOT modify CI/CD workflows**: `.github/workflows/test-coverage.yml` legitimately uses console for GitHub Actions output
- **Do NOT modify backend files**: API/backend files in `apps/api/` are allowed to use console per ESLint config
- **Do NOT create new logger infrastructure**: @repo/logger is complete and ready to use
- **Do NOT change logger configuration**: No changes to logger transports, levels, or setup required

### Reuse Plan

- **Package**: `@repo/logger` (already installed in all 3 apps)
- **Import pattern**: `import { logger } from '@repo/logger'` (standard across codebase)
- **Logger methods**:
  - `logger.info(message, ...args)` - for informational logs
  - `logger.error(message, error, ...args)` - for error logs
  - `logger.warn(message, ...args)` - for warnings
  - `logger.debug(message, ...args)` - for debug logs
- **Existing examples**: 34+ files already using logger correctly (see retrieved context)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Verify logger output appears in browser console during development
- Confirm no console-related lint warnings remain in modified files
- Test that error logging includes proper error objects and stack traces
- Consider smoke testing each app after changes to ensure no runtime errors

### For UI/UX Advisor
- No UI changes expected - this is internal logging infrastructure
- Logger should be transparent to end users in production
- Development experience: developers should still see logs in browser console

### For Dev Feasibility
- **Very low complexity**: Simple search-and-replace operation
- **Risk**: Very low - @repo/logger is well-tested and used extensively
- **Estimated effort**: 1-2 hours for all replacements + testing
- **Dependencies**: None - logger package already available
- **Testing approach**: Manual verification + lint checks
- **Recommendation**: Good first issue candidate, straightforward implementation

---

STORY-SEED COMPLETE WITH WARNINGS: 1 warning

**Warning 1**: No baseline reality file found. Continued with codebase scanning only. Some context about active stories and protected features may be missing.
