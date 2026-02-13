---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: REPA-005

## Reality Context

### Baseline Status
- Loaded: no (no baseline reality file found)
- Date: N/A
- Gaps: Proceeding with direct codebase analysis only

### Relevant Existing Features
Since no baseline was available, context was gathered from completed story files and direct codebase analysis:

| Feature Area | Status | Location |
|-------------|--------|----------|
| @repo/upload package structure | Completed (REPA-001) | packages/core/upload/ |
| Upload client functions | Completed (REPA-002) | @repo/upload/client/ |
| Upload hooks | Ready to Work (REPA-003) | In-progress migration |
| Image processing | UAT (REPA-004) | @repo/upload/image/ |
| Components directory | Empty | @repo/upload/src/components/index.ts (placeholder only) |

### Active In-Progress Work
| Story | Status | Potential Overlap |
|-------|--------|------------------|
| REPA-003 | ready-to-work (depends on REPA-002) | Migrating useUploadManager and useUploaderSession hooks - these are consumed by SessionProvider which is in scope for REPA-005 |
| REPA-004 | ready-for-qa | Migrating image processing - no component overlap |

### Constraints to Respect
From project structure (CLAUDE.md):
- Must use Zod schemas for all types (no TypeScript interfaces)
- Component directory structure: index.tsx, __tests__/, __types__/, utils/
- No barrel files - direct imports only
- Must import UI from @repo/app-component-library (not individual paths)
- Minimum test coverage: 45% global

---

## Retrieved Context

### Related Endpoints
No backend endpoints touched - this is purely frontend component migration.

### Related Components

**Duplicate Uploader Sub-Components (7 components across 2 apps):**

1. **ConflictModal** - 195 lines × 2 apps = 390 lines
   - Locations:
     - `apps/web/app-instructions-gallery/src/components/Uploader/ConflictModal/index.tsx`
     - `apps/web/main-app/src/components/Uploader/ConflictModal/index.tsx`
   - Purpose: Handle 409 Conflict errors (duplicate slug), suggest alternatives
   - Features: Focus management, ARIA attributes, suggested slug from API

2. **RateLimitBanner** - 144 lines × 2 apps = 288 lines (EXACT duplicates)
   - Locations:
     - `apps/web/app-instructions-gallery/src/components/Uploader/RateLimitBanner/index.tsx`
     - `apps/web/main-app/src/components/Uploader/RateLimitBanner/index.tsx`
   - Purpose: Handle 429 Rate Limit errors with countdown timer
   - Features: Countdown timer (MM:SS format), retry button, progress bar, reduced-motion support

3. **SessionExpiredBanner** - Similar to RateLimitBanner pattern
   - Purpose: Handle 401 Session Expired errors

4. **UnsavedChangesDialog** - Dialog with tests
   - Locations:
     - `apps/web/app-instructions-gallery/src/components/Uploader/UnsavedChangesDialog/`
     - `apps/web/main-app/src/components/Uploader/UnsavedChangesDialog/`
   - Tests exist: `__tests__/UnsavedChangesDialog.test.tsx`

5. **UploaderFileItem** - 235 lines
   - Locations:
     - `apps/web/app-instructions-gallery/src/components/Uploader/UploaderFileItem/index.tsx`
     - `apps/web/main-app/src/components/Uploader/UploaderFileItem/index.tsx`
   - Purpose: Display single file in upload queue with progress, status, actions
   - Features: File type icons, status badges, progress bars, cancel/retry/remove buttons
   - Uses types from: `@repo/upload/types` (UploaderFileItem, UploadStatus)

6. **UploaderList** - List container for file items
   - Locations:
     - `apps/web/app-instructions-gallery/src/components/Uploader/UploaderList/index.tsx`
     - `apps/web/main-app/src/components/Uploader/UploaderList/index.tsx`

7. **SessionProvider** - Context provider with divergent implementations
   - Locations:
     - `apps/web/app-instructions-gallery/src/components/Uploader/SessionProvider/index.tsx` (82 lines, no Redux)
     - `apps/web/main-app/src/components/Uploader/SessionProvider/index.tsx` (89 lines, Redux integration)
   - Purpose: Context provider combining session persistence + unsaved changes guard
   - Dependencies: useUploaderSession hook (REPA-003), useUnsavedChangesPrompt hook
   - Key difference: main-app version uses Redux for auth state, app-instructions-gallery does not

**Domain-Specific Upload Components (app-instructions-gallery only):**

8. **ThumbnailUpload** - 288 lines
   - Location: `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`
   - Purpose: Upload thumbnail for MOC instructions (drag-and-drop + file picker)
   - Features: Client-side validation, preview with metadata, image resizing
   - Types: `__types__/index.ts` with FileValidationResult schema
   - Tests: `__tests__/ThumbnailUpload.test.tsx`

9. **InstructionsUpload** - 359 lines
   - Location: `apps/web/app-instructions-gallery/src/components/InstructionsUpload/index.tsx`
   - Purpose: Upload PDF instruction files (multi-file, sequential processing)
   - Features: File queue, sequential upload, progress tracking, upgrade hints
   - Types: `__types__/index.ts` with FileItem and FileValidationResult schemas
   - Tests: `__tests__/InstructionsUpload.test.tsx`

**Total LOC count:** ~1945 lines across all Uploader sub-components in both apps

### Reuse Candidates
- **@repo/app-component-library**: Dialog, Alert, Button, Progress, Card, Badge, Input, Label components
- **@repo/upload/types**: UploaderFileItem, UploadStatus (already migrated)
- **@repo/upload/hooks**: useUploadManager, useUploaderSession (REPA-003 - dependency)
- **@repo/hooks**: useUnsavedChangesPrompt (used by SessionProvider)
- **lucide-react**: Icon library used throughout

---

## Knowledge Context

### Lessons Learned
No knowledge base queries performed (lessons_loaded: false).

### Architecture Decisions (ADRs)
No ADR-LOG queries performed (adrs_loaded: false).

However, from CLAUDE.md:
- **ADR (implicit)**: Component directory structure must follow: index.tsx, __tests__/, __types__/, utils/
- **ADR (implicit)**: No barrel files - direct imports from source files
- **ADR (implicit)**: Zod-first types - all types must be Zod schemas with z.infer<>

### Patterns to Follow
From completed REPA stories:
- **REPA-002 pattern**: Create clear module structure with direct exports
- **REPA-003 pattern**: Use dependency injection for auth state (not direct Redux imports)
- **REPA-004 pattern**: Migrate tests alongside components, maintain 80%+ coverage

From CLAUDE.md:
- Functional components only (function declarations)
- Named exports preferred
- Semantic queries in tests: getByRole, getByLabelText
- Import UI from @repo/app-component-library (not individual paths)

### Patterns to Avoid
From CLAUDE.md:
- Don't create barrel files (index.ts re-exports)
- Don't import shadcn components from individual paths
- Don't hardcode colors - use Tailwind classes
- Don't use TypeScript interfaces - use Zod schemas

---

## Conflict Analysis

### Conflict: Dependency on In-Progress Work (REPA-003)
- **Severity**: warning
- **Description**: SessionProvider component depends on useUploaderSession hook from REPA-003, which is currently "ready-to-work" status. If REPA-003 is not completed first, SessionProvider migration will be blocked.
- **Resolution Hint**: Verify REPA-003 completion before starting REPA-005, or explicitly split SessionProvider migration to a separate follow-up task if REPA-003 is delayed.
- **Source**: stories index dependency analysis

---

## Story Seed

### Title
Migrate Upload Components to @repo/upload

### Description

**Context:**
The monorepo currently has 7 duplicate Uploader sub-components split across `main-app` and `app-instructions-gallery`, totaling ~1945 lines of duplicate code. Additionally, there are 2 domain-specific upload components (ThumbnailUpload and InstructionsUpload) in app-instructions-gallery that should be extracted to a shared package for reuse.

**Current State:**
- ConflictModal: 195 lines × 2 = 390 lines (EXACT duplicates)
- RateLimitBanner: 144 lines × 2 = 288 lines (EXACT duplicates)
- SessionExpiredBanner: Similar pattern to RateLimitBanner
- UnsavedChangesDialog: Dialog component with tests in both apps
- UploaderFileItem: 235 lines in both apps
- UploaderList: List container in both apps
- SessionProvider: 82 lines (app-instructions-gallery) vs 89 lines (main-app) with divergent auth integration
- ThumbnailUpload: 288 lines (app-instructions-gallery only)
- InstructionsUpload: 359 lines (app-instructions-gallery only)

These components are well-tested (tests exist for UnsavedChangesDialog, ThumbnailUpload, InstructionsUpload) and use consistent patterns (Zod types, accessibility-first, @repo/app-component-library components).

**Problem:**
1. All bug fixes or enhancements must be applied to multiple locations
2. Code duplication creates maintenance burden (~1945 LOC across apps)
3. No shared upload UI patterns for new apps
4. SessionProvider has diverged between apps (Redux vs non-Redux auth)
5. Domain-specific components (ThumbnailUpload, InstructionsUpload) are locked in app-instructions-gallery

**Solution Direction:**
Extract all Uploader sub-components and domain-specific upload components into `@repo/upload/components/` with:
- Clear component structure following monorepo conventions
- Dependency injection for auth state (SessionProvider)
- Preserved test coverage
- Backward-compatible APIs where possible
- Migration guide for consuming apps

### Initial Acceptance Criteria

#### Core Uploader Sub-Components
- [ ] **AC-1:** Migrate ConflictModal to `@repo/upload/components/ConflictModal/`
  - Single implementation replacing both app duplicates
  - Preserve focus management, ARIA attributes, suggested slug feature
  - Move tests to `__tests__/ConflictModal.test.tsx`

- [ ] **AC-2:** Migrate RateLimitBanner to `@repo/upload/components/RateLimitBanner/`
  - Single implementation replacing both app duplicates
  - Preserve countdown timer, retry logic, reduced-motion support
  - Add tests for countdown behavior

- [ ] **AC-3:** Migrate SessionExpiredBanner to `@repo/upload/components/SessionExpiredBanner/`
  - Follow RateLimitBanner pattern
  - Handle 401 session expiry with refresh prompt

- [ ] **AC-4:** Migrate UnsavedChangesDialog to `@repo/upload/components/UnsavedChangesDialog/`
  - Consolidate both app versions
  - Migrate existing tests to package

- [ ] **AC-5:** Migrate UploaderFileItem to `@repo/upload/components/UploaderFileItem/`
  - Single implementation replacing both app duplicates
  - Preserve file type icons, status badges, progress tracking
  - Already uses types from @repo/upload/types

- [ ] **AC-6:** Migrate UploaderList to `@repo/upload/components/UploaderList/`
  - List container for UploaderFileItem components
  - Support batch operations (cancel all, retry all)

#### Session Provider (Special Handling)
- [ ] **AC-7:** Migrate SessionProvider to `@repo/upload/components/SessionProvider/`
  - **Depends on REPA-003 completion** (useUploaderSession hook)
  - Use dependency injection for auth state (accept isAuthenticated, userId props)
  - Do NOT import Redux directly
  - Support both authenticated and anonymous flows
  - Combine with useUnsavedChangesPrompt from @repo/hooks
  - Update main-app to pass Redux auth state as props
  - Update app-instructions-gallery to use anonymous mode (no auth props)

#### Domain-Specific Upload Components
- [ ] **AC-8:** Migrate ThumbnailUpload to `@repo/upload/components/ThumbnailUpload/`
  - Move from app-instructions-gallery
  - Preserve drag-and-drop, validation, preview features
  - Move __types__/index.ts schemas to component
  - Migrate tests from app-instructions-gallery

- [ ] **AC-9:** Migrate InstructionsUpload to `@repo/upload/components/InstructionsUpload/`
  - Move from app-instructions-gallery
  - Preserve multi-file queue, sequential upload, progress tracking
  - Move __types__/index.ts schemas to component
  - Migrate tests from app-instructions-gallery

#### Shared Type Migration (DEFERRED to REPA-017)
- [ ] **AC-10:** Document FileValidationResult schema duplication
  - ThumbnailUpload and InstructionsUpload both define identical FileValidationResult schemas
  - Add note to migrate to @repo/upload/types in REPA-017
  - For now, keep schemas local to each component

#### Package Structure & Exports
- [ ] **AC-11:** Update @repo/upload/components/index.ts with direct exports
  - NO barrel file pattern (violates CLAUDE.md)
  - Export each component explicitly
  - Document import paths in package README

#### App Migration & Cleanup
- [ ] **AC-12:** Update main-app imports
  - Replace all `@/components/Uploader/*` imports with `@repo/upload/components/*`
  - Pass auth state props to SessionProvider from Redux
  - Delete old Uploader/ directory after migration
  - Update tests to import from @repo/upload

- [ ] **AC-13:** Update app-instructions-gallery imports
  - Replace all `@/components/Uploader/*` imports with `@repo/upload/components/*`
  - Replace ThumbnailUpload and InstructionsUpload imports with `@repo/upload/components/*`
  - SessionProvider uses anonymous mode (no auth props)
  - Delete old component directories after migration
  - Update tests to import from @repo/upload

#### Testing & Quality
- [ ] **AC-14:** All migrated components have tests with 80%+ coverage
  - ConflictModal tests
  - RateLimitBanner countdown tests
  - SessionExpiredBanner tests
  - UnsavedChangesDialog tests (migrated)
  - UploaderFileItem tests
  - UploaderList tests
  - SessionProvider tests (both auth modes)
  - ThumbnailUpload tests (migrated)
  - InstructionsUpload tests (migrated)

- [ ] **AC-15:** Package builds and tests pass in isolation
  - `pnpm build --filter=@repo/upload` succeeds
  - `pnpm test --filter=@repo/upload` passes (all component tests)
  - `pnpm check-types --filter=@repo/upload` passes
  - No imports from `apps/web/*` in package code

- [ ] **AC-16:** App-level tests pass after migration
  - `pnpm test --filter=main-app` passes
  - `pnpm test --filter=app-instructions-gallery` passes
  - Integration tests for uploader flows pass
  - Playwright E2E tests pass (upload-page, instructions workflows)

### Non-Goals
- **Upload hook migration:** useUploadManager and useUploaderSession are being migrated in REPA-003 (dependency)
- **Image processing migration:** Already handled by REPA-004
- **Upload types migration:** Deferred to REPA-006
- **Component-level schema consolidation:** FileValidationResult duplication deferred to REPA-017
- **Backend upload API changes:** No changes to presigned URLs or upload session endpoints
- **New component features:** Only consolidate existing functionality, no new features
- **Storybook documentation:** Deferred to follow-up work
- **Other apps adoption:** Only migrate main-app and app-instructions-gallery consumers in this story

### Reuse Plan
- **Components**: All components use @repo/app-component-library (Dialog, Alert, Button, Progress, Card, Badge, Input, Label)
- **Patterns**: Follow REPA-002 and REPA-004 migration patterns (clear module structure, test migration, dependency injection)
- **Packages**:
  - @repo/upload/types for UploaderFileItem, UploadStatus types (already available)
  - @repo/upload/hooks for useUploaderSession (REPA-003 dependency)
  - @repo/hooks for useUnsavedChangesPrompt
  - lucide-react for icons

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on integration testing between SessionProvider and useUploaderSession hook (REPA-003 dependency)
- Verify countdown timers in RateLimitBanner and SessionExpiredBanner
- Test focus management in ConflictModal (WCAG AA requirement)
- Ensure drag-and-drop works in ThumbnailUpload across browsers
- Test sequential upload flow in InstructionsUpload with progress tracking
- Verify both authenticated and anonymous SessionProvider modes work correctly

### For UI/UX Advisor
- No UI changes expected - this is a pure consolidation/migration story
- Verify accessibility features are preserved:
  - Focus management in modals
  - ARIA labels and roles
  - Keyboard navigation
  - Reduced-motion support in progress indicators
- Consider adding visual regression tests for component consistency

### For Dev Feasibility
- **Critical dependency:** REPA-003 must complete before SessionProvider can be migrated
- SessionProvider auth injection is the key technical risk:
  - main-app uses Redux for auth state
  - app-instructions-gallery has no auth
  - Solution: Accept isAuthenticated and userId as props (dependency injection pattern)
- Component duplication verification:
  - Run diff on all 7 Uploader sub-components to confirm they are truly identical
  - If differences exist, document in implementation notes
- Test migration strategy:
  - Move tests to package first
  - Update imports in apps
  - Run tests at each step to avoid breaking changes
- Size warning: 9 components + 7 with tests + 2 app migrations = large scope (consider 8 SP estimate)
