---
doc_type: agent-context
feature: repackag-app
story: REPA-0510
phase: bootstrap
created: "2026-02-11T18:02:00Z"
---

# AGENT-CONTEXT: REPA-0510 Bootstrap

## Story Summary

**REPA-0510: Migrate Core Upload Components to @repo/upload**

- **Status**: in-elaboration
- **Story Points**: 5
- **Risk**: Low (0.3 split probability)
- **Scope**: 8 upload components, 2 apps, 15 ACs
- **Split From**: REPA-005 (split 1 of 2)

## Key Facts

### Current State
- 8 upload components to migrate from apps to @repo/upload/components
- 7 duplicate Uploader sub-components across main-app and app-instructions-gallery
- ~1,945 lines of duplicate code
- 2 domain-specific components (ThumbnailUpload, InstructionsUpload)

### Components to Migrate
1. ConflictModal
2. RateLimitBanner
3. SessionExpiredBanner
4. UnsavedChangesDialog
5. UploaderFileItem
6. UploaderList
7. ThumbnailUpload
8. InstructionsUpload

### No Dependencies (Unlike Sibling REPA-0520)
- REPA-0520 (SessionProvider) depends on REPA-003 (useUploaderSession hook)
- This split isolates the 8 components that do NOT need REPA-003
- Can start immediately after component divergence verification

### Dependencies
- **REPA-004** (image processing) - currently in UAT, expected to complete before this starts
- **REPA-001** (package structure) - already completed
- **REPA-002** (upload client) - already completed

## Next Phase: Investigation

The bootstrap phase must complete:

1. **Component Divergence Verification** (BLOCKING PRE-IMPLEMENTATION)
   - Run `diff` on all 7 Uploader sub-components between main-app and app-instructions-gallery
   - Check if implementations are exact duplicates or have diverged
   - Document findings in `_bootstrap/DIVERGENCE-ANALYSIS.md`
   - If divergence >10% LOC, flag for reconciliation or further split

2. **Package Structure Validation**
   - Verify `packages/core/upload/src/components/` directory structure exists
   - Confirm @repo/upload exports are set up correctly
   - Check test setup in @repo/upload (MSW handlers, etc.)

3. **Dependency Status Check**
   - Verify REPA-004 (image processing) is complete or in UAT
   - Confirm useS3Upload hook available from REPA-004

## Critical Constraints

### Architecture Rules (from CLAUDE.md)
- Component directory structure REQUIRED: index.tsx, __tests__/, __types__/, utils/
- Zod-first types (NO TypeScript interfaces)
- Explicit exports (NO barrel files)
- Max 80 chars per line (Prettier: 100 char limit in this monorepo)

### Package Boundary Rules
- @repo/upload CAN import from: @repo/app-component-library, @repo/upload/*, @repo/hooks, lucide-react, react
- @repo/upload CANNOT import from: apps/web/*, @reduxjs/toolkit, app-specific APIs

### Quality Gates
- 80%+ test coverage (package-level, exceeds 45% global minimum)
- All app tests pass after migration
- TypeScript compilation succeeds
- ESLint passes on all new/changed code
- Prettier formatting enforced

## Pre-Implementation Blockers

Before starting implementation work, the following MUST be completed:

1. Component divergence analysis (see DIVERGENCE-ANALYSIS.md template below)
2. REPA-004 status confirmation
3. Migration order decision (recommended: simple → medium → complex)

## Files to Analyze

### Main-App Uploader Components
- `apps/web/main-app/src/components/Uploader/ConflictModal/`
- `apps/web/main-app/src/components/Uploader/RateLimitBanner/`
- `apps/web/main-app/src/components/Uploader/SessionExpiredBanner/`
- `apps/web/main-app/src/components/Uploader/UnsavedChangesDialog/`
- `apps/web/main-app/src/components/Uploader/UploaderFileItem/`
- `apps/web/main-app/src/components/Uploader/UploaderList/`

### App-Instructions-Gallery Uploader Components
- `apps/web/app-instructions-gallery/src/components/Uploader/ConflictModal/`
- `apps/web/app-instructions-gallery/src/components/Uploader/RateLimitBanner/`
- `apps/web/app-instructions-gallery/src/components/Uploader/SessionExpiredBanner/`
- `apps/web/app-instructions-gallery/src/components/Uploader/UnsavedChangesDialog/`
- `apps/web/app-instructions-gallery/src/components/Uploader/UploaderFileItem/`
- `apps/web/app-instructions-gallery/src/components/Uploader/UploaderList/`

### Domain-Specific Components (app-instructions-gallery only)
- `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/`
- `apps/web/app-instructions-gallery/src/components/InstructionsUpload/`

## Expected Outcomes

After bootstrap phase:
- Component divergence documented
- Migration strategy finalized
- DIVERGENCE-ANALYSIS.md completed
- Ready to transition to epic elaboration phase

## Notes for Next Agent

The story is clear and well-scoped. No surprises expected from precondition validation. The main investigation task is verifying component divergence - if implementations are exact duplicates, migration will be straightforward. If divergence exists, may need reconciliation strategy or further split.
