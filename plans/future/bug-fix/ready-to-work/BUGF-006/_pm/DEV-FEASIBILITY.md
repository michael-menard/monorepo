# Dev Feasibility Review: BUGF-006

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**:
  - @repo/logger is fully implemented and battle-tested (34+ files already using it)
  - Simple search-and-replace operation with clear patterns
  - No new infrastructure or dependencies required
  - Low risk - logging changes don't affect business logic
  - Clear scope with well-defined file list

## Likely Change Surface (Core Only)

### Source Files to Modify (4 files)
1. `apps/web/app-inspiration-gallery/src/pages/main-page.tsx` (5 replacements)
2. `apps/web/app-instructions-gallery/src/DetailModule.tsx` (2 replacements)
3. `apps/web/main-app/src/routes/admin/pages/AdminUserDetailPage.tsx` (3 replacements)
4. `apps/web/main-app/src/mocks/handlers.ts` (1 replacement - decision needed)

### Packages Involved
- **@repo/logger** (packages/core/logger/) - already exists, no changes needed
- Consumer apps already have `@repo/logger` in dependencies

### Critical Deploy Touchpoints
- None - logging changes are transparent to deployment
- No database migrations
- No API changes
- No infrastructure changes
- Standard frontend build/deploy process

## MVP-Critical Risks

**NONE** - This is an extremely low-risk change with no MVP-critical risks identified.

The following are considerations but do not block MVP:

### Consideration 1: Import Statement Placement
**Why it's not blocking MVP**:
- Standard ES6 import at top of file
- TypeScript will catch missing imports at build time
- Build fails fast if import is incorrect

**Mitigation**:
- Follow existing pattern: `import { logger } from '@repo/logger'`
- Review 34+ existing usages for reference
- TypeScript provides immediate feedback

### Consideration 2: ESLint Disable Comment Removal
**Why it's not blocking MVP**:
- Comments are metadata, not functionality
- Removing them improves code hygiene but doesn't affect runtime
- ESLint will warn if console statements remain

**Mitigation**:
- Remove eslint-disable-next-line comments after replacing console calls
- Verify with `pnpm lint` before committing

## Missing Requirements for MVP

**NONE** - Story is complete and implementable as written.

### Optional Decision: MSW Handler Console Usage
**Not MVP-blocking** but should be decided:
- `main-app/src/mocks/handlers.ts` has 1 console.log for MSW debugging
- Options:
  1. Replace with logger (consistent with policy)
  2. Keep console for MSW debugging (explicit exception for dev tooling)

**Recommendation**: Keep console for MSW handlers, document as intentional exception for development tooling. MSW is dev-only and console output may be more appropriate for mock debugging.

## MVP Evidence Expectations

### Proof Needed for Core Journey
1. **ESLint passes**: `pnpm lint` shows 0 console-related warnings in modified files
2. **Type check passes**: `pnpm check-types` succeeds
3. **Existing tests pass**: `pnpm test` confirms no regressions
4. **Logger output works**: Browser console shows structured logs in dev mode

### Critical CI/Deploy Checkpoints
- Pre-commit hooks pass (lint, type-check)
- All existing tests pass in CI
- Frontend builds successfully
- No deployment-specific risks

## Implementation Complexity

### Time Estimate
- **File changes**: 30 minutes (straightforward find/replace)
- **Testing**: 30 minutes (manual verification in browser)
- **Total**: 1-2 hours including review

### Skill Level Required
- **Junior-friendly**: Yes
- **Good first issue**: Yes
- **Prerequisites**: Basic TypeScript, familiarity with import statements

### Code Review Expectations
- Single review cycle expected
- Reviewer should verify:
  - All console calls replaced in scope
  - Test files NOT modified
  - ESLint disable comments removed
  - Logger import statements correct

## Architecture Alignment

### Reuse-First ✅
- Uses existing @repo/logger package
- Follows established patterns (34+ examples in codebase)
- No new abstractions needed

### Package Boundaries ✅
- Logger is in `packages/core/logger/` (correct location)
- Apps consume via workspace dependency
- No circular dependencies

### Standards Compliance ✅
- Aligns with CLAUDE.md mandate: "Don't use console.log - use @repo/logger"
- Fixes ESLint warnings in affected files
- Improves logging consistency across apps

## No New Infrastructure Required

- @repo/logger already exists and is stable
- No backend/API changes
- No database changes
- No new environment variables
- No deployment configuration changes
- No new dependencies to install

## Conclusion

**HIGHLY FEASIBLE** - This is a straightforward code improvement with:
- Clear scope (4 files, ~11 replacements)
- Low risk (logging infrastructure, not business logic)
- High confidence (established patterns, existing package)
- Good first issue candidate
- 1-2 hour implementation time
- Zero MVP-critical blockers
