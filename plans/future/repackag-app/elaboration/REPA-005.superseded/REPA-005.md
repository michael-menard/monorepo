---
id: REPA-005
title: "Migrate Upload Components to @repo/upload"
status: needs-split
priority: P2
experiment_variant: control
epic: repackag-app
depends_on: [REPA-003, REPA-004]
story_points: 8
created_at: "2026-02-11"
updated_at: "2026-02-11T16:55:17Z"
generated_from_seed: true
---

# REPA-005: Migrate Upload Components to @repo/upload

## Context

The monorepo currently has **7 duplicate Uploader sub-components** split across `main-app` and `app-instructions-gallery`, totaling approximately **1,945 lines of duplicate code**. Additionally, there are **2 domain-specific upload components** (ThumbnailUpload and InstructionsUpload) in app-instructions-gallery that should be extracted to a shared package for reuse.

### Current State

**Duplicate Uploader Sub-Components** (2 apps):
1. **ConflictModal**: 195 lines × 2 apps = 390 lines (EXACT duplicates)
   - Handles 409 Conflict errors with suggested slug
   - Features: Focus management, ARIA attributes
2. **RateLimitBanner**: 144 lines × 2 apps = 288 lines (EXACT duplicates)
   - Handles 429 Rate Limit errors with countdown timer
   - Features: Countdown timer (MM:SS), retry button, progress bar, reduced-motion support
3. **SessionExpiredBanner**: Similar to RateLimitBanner
   - Handles 401 Session Expired errors
4. **UnsavedChangesDialog**: Dialog with tests
   - Prevents data loss on navigation
5. **UploaderFileItem**: 235 lines
   - Single file display with progress, status, actions
   - Uses types from @repo/upload/types
6. **UploaderList**: List container for file items
   - Supports batch operations
7. **SessionProvider**: 82 lines (app-instructions-gallery) vs 89 lines (main-app)
   - Divergent implementations: Redux auth in main-app, no auth in app-instructions-gallery
   - Depends on useUploaderSession hook (REPA-003)

**Domain-Specific Upload Components** (app-instructions-gallery only):
8. **ThumbnailUpload**: 288 lines
   - Drag-and-drop image upload with validation and preview
   - Has tests
9. **InstructionsUpload**: 359 lines
   - Multi-file PDF upload with sequential processing
   - Has tests

All components use @repo/app-component-library primitives (Dialog, Alert, Button, Progress, Card, Badge, Input, Label) and follow monorepo conventions (Zod types, accessibility-first design).

### Problems

1. **Maintenance Burden**: All bug fixes or enhancements must be applied to multiple locations (~1,945 LOC across apps)
2. **Code Duplication**: No shared upload UI patterns for new apps
3. **SessionProvider Divergence**: Redux vs non-Redux auth implementations have diverged between apps
4. **Limited Reusability**: Domain-specific components (ThumbnailUpload, InstructionsUpload) locked in app-instructions-gallery

### Solution

Extract all Uploader sub-components and domain-specific upload components into `@repo/upload/components/` with:
- Clear component structure following monorepo conventions
- Dependency injection for auth state (SessionProvider)
- Preserved test coverage (80%+ target)
- Backward-compatible APIs where possible
- Migration guide for consuming apps

---

## Goal

All upload components consolidated in @repo/upload with:
- Single source of truth for upload UI patterns
- No duplicate components in apps
- Reusable components available to all apps via @repo/upload
- Preserved test coverage and accessibility features
- main-app and app-instructions-gallery successfully migrated

---

## Non-Goals

- **Upload hook migration**: useUploadManager and useUploaderSession are being migrated in REPA-003 (dependency)
- **Image processing migration**: Already handled by REPA-004 (currently in UAT)
- **Upload types migration**: Deferred to REPA-006
- **Component-level schema consolidation**: FileValidationResult duplication deferred to REPA-017
- **Backend upload API changes**: No changes to presigned URLs or upload session endpoints
- **New component features**: Only consolidate existing functionality, no new features
- **Storybook documentation**: Deferred to follow-up work
- **Other apps adoption**: Only migrate main-app and app-instructions-gallery consumers in this story

---

## Scope

### Packages Modified

- `packages/core/upload/src/components/` - Add all 9 components
- `packages/core/upload/src/components/index.ts` - Export components (explicit exports, NOT barrel file)
- `apps/web/main-app/` - Update imports, pass auth props to SessionProvider
- `apps/web/app-instructions-gallery/` - Update imports, anonymous SessionProvider mode

### Components Migrated

**Core Uploader Sub-Components** (7):
- ConflictModal
- RateLimitBanner
- SessionExpiredBanner
- UnsavedChangesDialog
- UploaderFileItem
- UploaderList
- SessionProvider (depends on REPA-003)

**Domain-Specific Upload Components** (2):
- ThumbnailUpload
- InstructionsUpload

### Endpoints Touched

None - This is a pure frontend component migration.

---

## Acceptance Criteria

### Core Uploader Sub-Components

- [ ] **AC-1**: Migrate ConflictModal to `@repo/upload/components/ConflictModal/`
  - Single implementation replacing both app duplicates
  - Preserve focus management, ARIA attributes, suggested slug feature
  - Move tests to `__tests__/ConflictModal.test.tsx`
  - Component directory structure: index.tsx, __tests__/, __types__/

- [ ] **AC-2**: Migrate RateLimitBanner to `@repo/upload/components/RateLimitBanner/`
  - Single implementation replacing both app duplicates
  - Preserve countdown timer, retry logic, reduced-motion support
  - Add tests for countdown behavior
  - Component directory structure: index.tsx, __tests__/, __types__/

- [ ] **AC-3**: Migrate SessionExpiredBanner to `@repo/upload/components/SessionExpiredBanner/`
  - Follow RateLimitBanner pattern
  - Handle 401 session expiry with refresh prompt
  - Component directory structure: index.tsx, __tests__/, __types__/

- [ ] **AC-4**: Migrate UnsavedChangesDialog to `@repo/upload/components/UnsavedChangesDialog/`
  - Consolidate both app versions
  - Migrate existing tests to package
  - Component directory structure: index.tsx, __tests__/, __types__/

- [ ] **AC-5**: Migrate UploaderFileItem to `@repo/upload/components/UploaderFileItem/`
  - Single implementation replacing both app duplicates
  - Preserve file type icons, status badges, progress tracking
  - Already uses types from @repo/upload/types
  - Component directory structure: index.tsx, __tests__/, __types__/

- [ ] **AC-6**: Migrate UploaderList to `@repo/upload/components/UploaderList/`
  - List container for UploaderFileItem components
  - Support batch operations (cancel all, retry all)
  - Component directory structure: index.tsx, __tests__/, __types__/

### Session Provider (Special Handling)

- [ ] **AC-7**: Migrate SessionProvider to `@repo/upload/components/SessionProvider/`
  - **BLOCKING DEPENDENCY**: MUST verify REPA-003 completion before starting this AC
  - Use dependency injection for auth state:
    ```tsx
    type SessionProviderProps = {
      children: React.ReactNode
      isAuthenticated?: boolean  // Optional, for auth mode
      userId?: string            // Optional, for auth mode
    }
    ```
  - Do NOT import Redux directly
  - Support both authenticated and anonymous flows
  - Combine with useUnsavedChangesPrompt from @repo/hooks
  - Update main-app to pass Redux auth state as props
  - Update app-instructions-gallery to use anonymous mode (no auth props)
  - Zod prop validation required
  - Unit tests for BOTH auth modes (with props, without props)
  - Component directory structure: index.tsx, __tests__/, __types__/

### Domain-Specific Upload Components

- [ ] **AC-8**: Migrate ThumbnailUpload to `@repo/upload/components/ThumbnailUpload/`
  - Move from app-instructions-gallery
  - Preserve drag-and-drop, validation, preview features
  - Move __types__/index.ts schemas to component
  - Migrate tests from app-instructions-gallery
  - Component directory structure: index.tsx, __tests__/, __types__/, utils/

- [ ] **AC-9**: Migrate InstructionsUpload to `@repo/upload/components/InstructionsUpload/`
  - Move from app-instructions-gallery
  - Preserve multi-file queue, sequential upload, progress tracking
  - Move __types__/index.ts schemas to component
  - Migrate tests from app-instructions-gallery
  - Component directory structure: index.tsx, __tests__/, __types__/, utils/

### Shared Type Migration (DEFERRED)

- [ ] **AC-10**: Document FileValidationResult schema duplication
  - ThumbnailUpload and InstructionsUpload both define identical FileValidationResult schemas
  - Add note in @repo/upload README: "FileValidationResult duplication to be resolved in REPA-017"
  - For now, keep schemas local to each component
  - Add cross-reference comment in both component __types__/index.ts files

### Package Structure & Exports

- [ ] **AC-11**: Update @repo/upload/components/index.ts with explicit exports
  - NO barrel file pattern (violates CLAUDE.md)
  - Export each component explicitly:
    ```ts
    export { ConflictModal } from './ConflictModal'
    export { RateLimitBanner } from './RateLimitBanner'
    // ... etc for all 9 components
    ```
  - Document import paths in package README

### App Migration & Cleanup

- [ ] **AC-12**: Update main-app imports
  - Replace all `@/components/Uploader/*` imports with `@repo/upload/components/*`
  - Pass auth state props to SessionProvider from Redux:
    ```tsx
    <SessionProvider isAuthenticated={user.isAuthenticated} userId={user.id}>
    ```
  - Delete old Uploader/ directory after migration verified
  - Update tests to import from @repo/upload
  - Verify no imports from old paths remain

- [ ] **AC-13**: Update app-instructions-gallery imports
  - Replace all `@/components/Uploader/*` imports with `@repo/upload/components/*`
  - Replace ThumbnailUpload and InstructionsUpload imports with `@repo/upload/components/*`
  - SessionProvider uses anonymous mode (no auth props):
    ```tsx
    <SessionProvider>
    ```
  - Delete old component directories after migration verified
  - Update tests to import from @repo/upload
  - Verify no imports from old paths remain

### Testing & Quality

- [ ] **AC-14**: All migrated components have tests with 80%+ coverage
  - ConflictModal tests
  - RateLimitBanner countdown tests
  - SessionExpiredBanner tests
  - UnsavedChangesDialog tests (migrated)
  - UploaderFileItem tests
  - UploaderList tests
  - SessionProvider tests (both auth modes: with props, without props)
  - ThumbnailUpload tests (migrated)
  - InstructionsUpload tests (migrated)
  - Package-level coverage target: 80% (exceeds global 45% minimum)
  - Run `pnpm test --filter=@repo/upload --coverage` to verify
  - No component below 75% coverage

- [ ] **AC-15**: Package builds and tests pass in isolation
  - `pnpm build --filter=@repo/upload` succeeds
  - `pnpm test --filter=@repo/upload` passes (all component tests)
  - `pnpm check-types --filter=@repo/upload` passes
  - No imports from `apps/web/*` in package code (violates package boundary)

- [ ] **AC-16**: App-level tests pass after migration
  - `pnpm test --filter=main-app` passes (all existing tests)
  - `pnpm test --filter=app-instructions-gallery` passes (all existing tests)
  - Integration tests for uploader flows pass
  - Playwright E2E tests pass:
    - Instruction upload flow (main-app and app-instructions-gallery)
    - Thumbnail upload flow (app-instructions-gallery)
    - Rate limit error handling
    - Conflict error handling

---

## Reuse Plan

### UI Components (from @repo/app-component-library)

All upload components use @repo/app-component-library primitives via barrel export:
```tsx
import { Dialog, Alert, Button, Progress, Card, Badge, Input, Label } from '@repo/app-component-library'
```

**Critical**: Do NOT import from individual paths like `@repo/app-component-library/primitives/dialog`.

### Hooks & Types (from @repo packages)

- **@repo/upload/types**: UploaderFileItem, UploadStatus (already available from REPA-002)
- **@repo/upload/hooks**: useUploadManager, useUploaderSession (REPA-003 dependency)
- **@repo/hooks**: useUnsavedChangesPrompt (available from REPA-014)
- **lucide-react**: Icon library for file type icons, status icons

### Patterns from Prior Stories

- **REPA-002 pattern**: Create clear module structure with explicit exports (no barrel files)
- **REPA-003 pattern**: Use dependency injection for auth state (not direct Redux imports)
- **REPA-004 pattern**: Migrate tests alongside components, maintain 80%+ coverage

---

## Architecture Notes

### Component Directory Structure (REQUIRED)

All migrated components MUST follow monorepo structure per CLAUDE.md:

```
ComponentName/
  index.tsx              # Main component file (function declaration)
  __tests__/
    ComponentName.test.tsx
  __types__/
    index.ts             # Zod schemas only (no TypeScript interfaces)
  utils/                 # Optional, if component-specific utilities
    index.ts
```

### Zod-First Types (REQUIRED)

All component props MUST be validated with Zod schemas per CLAUDE.md:

```tsx
import { z } from 'zod'

const ConflictModalPropsSchema = z.object({
  open: z.boolean(),
  onClose: z.function(),
  conflictError: z.object({
    status: z.literal(409),
    message: z.string(),
    suggested_slug: z.string().optional()
  })
})

type ConflictModalProps = z.infer<typeof ConflictModalPropsSchema>

export function ConflictModal(props: ConflictModalProps) {
  // implementation
}
```

**Do NOT use TypeScript interfaces** - violates CLAUDE.md requirements.

### SessionProvider Dependency Injection Pattern

SessionProvider has divergent implementations (Redux vs non-Redux). Solution: Accept auth state as props instead of importing Redux directly.

**Component API**:
```tsx
type SessionProviderProps = {
  children: React.ReactNode
  isAuthenticated?: boolean  // Optional, for auth mode
  userId?: string            // Optional, for auth mode
}
```

**App usage**:
- main-app: `<SessionProvider isAuthenticated={user.isAuthenticated} userId={user.id}>`
- app-instructions-gallery: `<SessionProvider>` (no props, anonymous mode)

### Package Boundary Rules

**@repo/upload package CANNOT import from**:
- ❌ `apps/web/main-app/*`
- ❌ `apps/web/app-instructions-gallery/*`
- ❌ `@reduxjs/toolkit` or `react-redux`
- ❌ App-specific API clients

**@repo/upload package CAN import from**:
- ✅ `@repo/app-component-library`
- ✅ `@repo/upload/types`
- ✅ `@repo/upload/hooks` (after REPA-003)
- ✅ `@repo/hooks`
- ✅ `lucide-react`
- ✅ `react`, `react-dom`, `zod`

### Component Migration Order (Recommended)

**Phase 1 - Simple Components (Low Risk)**:
1. UnsavedChangesDialog
2. SessionExpiredBanner
3. UploaderList

**Phase 2 - Medium Complexity**:
4. RateLimitBanner
5. ConflictModal
6. UploaderFileItem

**Phase 3 - High Risk (REPA-003 Dependency)**:
7. SessionProvider (wait for REPA-003 completion)

**Phase 4 - Domain-Specific**:
8. ThumbnailUpload
9. InstructionsUpload

---

## Infrastructure Notes

### Package Publishing

- @repo/upload version bump (components added)
- No deprecated packages in this story (upload-client and upload-types deprecated in REPA-002 and REPA-006)

### Frontend Deployments

- main-app deploy (Vercel/Amplify) - Import path changes only
- app-instructions-gallery deploy (Vercel/Amplify) - Import path changes only

### No Backend Changes

This story does not touch backend APIs, presigned URLs, or upload session endpoints.

---

## HTTP Contract Plan

**N/A** - No backend endpoints modified in this story.

---

## Seed Requirements

### Implementation Prerequisites

Before starting migration:

1. **Verify REPA-003 Status**: Check `plans/future/repackag-app/stories.index.md` for REPA-003 status
   - Status must be "completed" or "ready-for-qa" (merged to main)
   - If REPA-003 is delayed, SPLIT story:
     - REPA-005a: AC-1 to AC-6, AC-8 to AC-16 (all except SessionProvider)
     - REPA-005b: AC-7 only (SessionProvider after REPA-003 completes)

2. **Verify REPA-004 Status**: Check that image processing migration is complete (currently in UAT)

3. **Run Component Duplication Verification**:
   ```bash
   # Diff all 7 Uploader sub-components between apps
   diff apps/web/main-app/src/components/Uploader/ConflictModal/index.tsx \
        apps/web/app-instructions-gallery/src/components/Uploader/ConflictModal/index.tsx
   # Repeat for RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog, UploaderFileItem, UploaderList, SessionProvider
   ```
   - Document findings in `_implementation/DIVERGENCE-NOTES.md`
   - If divergence >10% LOC, add reconciliation ACs
   - Choose canonical implementation source (prefer more complete version with better tests)

4. **Verify Package Structure**: Ensure `packages/core/upload/src/components/` directory exists (from REPA-001)

### Protected Features (Do Not Modify)

From seed reality context:
- @repo/upload package structure (REPA-001) - Do not restructure
- Upload client functions (REPA-002) - Do not modify
- Image processing (REPA-004) - Do not modify

---

## Test Plan

See `_pm/TEST-PLAN.md` for detailed test cases.

### Scope Summary

- **Endpoints Touched**: None (frontend only)
- **UI Touched**: Yes (9 upload components)
- **Data/Storage Touched**: No (components use existing hooks)

### Test Execution Order

1. **Phase 1**: Package tests in isolation
   - Migrate component code to @repo/upload
   - Migrate tests to package
   - Run `pnpm test --filter=@repo/upload` until 80%+ coverage achieved

2. **Phase 2**: App integration tests
   - Update imports in main-app
   - Run `pnpm test --filter=main-app` to catch regressions
   - Update imports in app-instructions-gallery
   - Run `pnpm test --filter=app-instructions-gallery` to catch regressions

3. **Phase 3**: E2E smoke tests
   - Run Playwright upload flows
   - Verify no visual regressions
   - Check error handling flows (rate limit, conflict)

4. **Phase 4**: Full test suite
   - `pnpm test:all` (all changed files)
   - `pnpm check-types:all` (all changed files)
   - `pnpm lint:all` (all changed files)

### Key Test Cases

**Happy Paths**:
- ConflictModal renders with suggested slug, focus management works
- RateLimitBanner countdown timer decrements correctly
- SessionProvider provides context with auth (Redux) and without auth (anonymous)
- ThumbnailUpload drag-and-drop works, validation passes
- InstructionsUpload sequential processing works (files upload one at a time)

**Error Cases**:
- ConflictModal handles missing suggested slug gracefully
- RateLimitBanner handles invalid retryAfter values
- SessionProvider handles hook dependency failure
- ThumbnailUpload rejects invalid file types
- InstructionsUpload handles upload failure mid-queue

**Edge Cases**:
- UnsavedChangesDialog prevents navigation on page unload
- SessionExpiredBanner auto-dismisses after refresh
- UploaderList with empty file queue shows empty state
- ThumbnailUpload with large image (10MB) applies compression
- RateLimitBanner with large retryAfter (3600 seconds = 1 hour)

### Blocking Conditions

Tests CANNOT proceed until:
1. ✅ REPA-003 (useUploaderSession hook) is completed and merged
2. ✅ REPA-004 (image processing) is completed (currently in UAT)
3. ✅ @repo/upload package structure exists (REPA-001, completed)
4. ✅ Component duplication verified (file diffs show exact/near-exact matches)

---

## UI/UX Notes

See `_pm/UIUX-NOTES.md` for detailed UI/UX guidance.

### Verdict

**PASS-WITH-NOTES**

This story is a pure consolidation/migration effort with NO new UI features. All components already exist and are well-tested. The migration should preserve existing UI/UX exactly as-is.

### MVP Accessibility (Blocking Only)

**Focus Management in Modals (WCAG 2.1 AA)**:
- ConflictModal: Focus MUST move to suggested slug input when modal opens
- UnsavedChangesDialog: Focus MUST move to primary action button
- Test: Tab key cycles within modal only, Escape closes modal and returns focus

**Keyboard Navigation**:
- ThumbnailUpload: Drag zone MUST be keyboard accessible (file picker fallback button)
- UploaderFileItem: Action buttons (Cancel, Retry, Remove) MUST be keyboard accessible

**Screen Reader Requirements**:
- RateLimitBanner: Countdown timer MUST announce updates (aria-live="polite")
- UploaderFileItem: Upload progress MUST be announced (aria-valuenow, aria-valuemin, aria-valuemax)
- ConflictModal: Suggested slug explanation MUST be announced (aria-describedby)

### MVP Design System Rules

**Token-Only Colors (Hard Gate)**:
- ✅ No hex colors (e.g., `#FF0000`)
- ✅ No RGB/RGBA colors
- ✅ Only Tailwind color classes (e.g., `bg-sky-500`, `text-gray-700`)

**_primitives Import Requirement**:
- ✅ Import from barrel: `import { Dialog } from '@repo/app-component-library'`
- ❌ NOT from individual files: `import { Dialog } from '@repo/app-component-library/primitives/dialog'`

### Preservation Requirements

**DO**:
- Preserve all existing Tailwind classes exactly as-is
- Preserve all ARIA attributes (role, aria-labelledby, aria-describedby, aria-live)
- Preserve focus management logic (focus traps, autofocus, focus return)
- Preserve reduced-motion support (prefers-reduced-motion media query checks)
- Preserve all existing component props and APIs (backward compatibility)

**DO NOT**:
- Change component visual appearance or layout
- Add new UI features (out of scope)
- Remove accessibility features
- Simplify or "clean up" existing implementations (risk of regression)

---

## Reality Baseline

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

From CLAUDE.md:
- Must use Zod schemas for all types (no TypeScript interfaces)
- Component directory structure: index.tsx, __tests__/, __types__/, utils/
- No barrel files - explicit exports only
- Must import UI from @repo/app-component-library barrel export
- Minimum test coverage: 45% global (80%+ target for this package)

### Conflicts Identified

**WARNING: Dependency on In-Progress Work (REPA-003)**
- **Severity**: warning (not blocking)
- **Description**: SessionProvider component (AC-7) depends on useUploaderSession hook from REPA-003, which is currently "ready-to-work" status. If REPA-003 is not completed first, SessionProvider migration will be blocked.
- **Resolution**: Verify REPA-003 completion before starting AC-7. If REPA-003 is delayed, split SessionProvider migration to separate follow-up story (REPA-005b).

---

## Risk Predictions

See `_pm/PREDICTIONS.yaml` for calculation details.

### Split Risk: 0.7 (High)

**Interpretation**: 70% probability this story will need to be split mid-implementation.

**Drivers**:
- Large scope: 16 ACs, 9 components, 2 apps (~1,945 LOC)
- Dependency on REPA-003 may cause delays
- Multi-component migration increases coordination complexity

**Mitigation**:
- Monitor progress closely in _implementation/PROGRESS.md
- Prioritize core Uploader sub-components (AC-1 to AC-6) first
- Be prepared to split if SessionProvider blocked or scope exceeds estimate

### Review Cycles: 3 (Medium)

**Interpretation**: Expect 3 code review iterations before merge.

**Drivers**:
- Large file count (estimated 40 files touched)
- Multi-component scope requires careful review
- Auth injection pattern needs verification

**Mitigation**:
- Break PRs into logical phases (Uploader sub-components → SessionProvider → domain-specific)
- Document migration decisions in PR descriptions
- Include before/after test coverage reports

### Token Estimate: 185,000

**Interpretation**: Expected total token cost for full implementation and review cycles.

**Confidence**: Low (no similar stories found, heuristic-based estimate)

**Mitigation**:
- Track token usage in _implementation/TOKENS.md
- Compare actual vs estimate for future story calibration

---

## Dev Feasibility Notes

See `_pm/DEV-FEASIBILITY.md` for detailed feasibility analysis.

### Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: Medium

**Key Risks**:
1. **REPA-003 Dependency Not Complete**: SessionProvider blocked until useUploaderSession hook available
2. **Component Divergence Not Documented**: Seed assumes exact duplicates, but divergence may exist
3. **Auth Injection Pattern Fragility**: SessionProvider must work for both Redux (main-app) and anonymous (app-instructions-gallery) modes
4. **Test Migration Breaking CI**: Package test setup must include all MSW handlers
5. **Import Path Churn**: 20-30 files per app need import updates

### Mitigation Strategies

1. Verify REPA-003 completion BEFORE starting AC-7
2. Run file diffs on all 7 Uploader sub-components before migration
3. Unit test SessionProvider in BOTH auth modes (with props, without props)
4. Create `packages/core/upload/src/test/setup.ts` with MSW handlers BEFORE migrating tests
5. Use find-and-replace for import updates, verify with TypeScript compilation

---

## Related Files

- **Test Plan**: `_pm/TEST-PLAN.md`
- **UI/UX Notes**: `_pm/UIUX-NOTES.md`
- **Dev Feasibility**: `_pm/DEV-FEASIBILITY.md`
- **Risk Predictions**: `_pm/PREDICTIONS.yaml`
- **Future UI/UX**: `_pm/FUTURE-UIUX.md`
- **Future Risks**: `_pm/FUTURE-RISKS.md`
- **Story Seed**: `_pm/STORY-SEED.md`

---

## Dependencies

**BLOCKING**:
- REPA-003 (useUploaderSession hook) MUST be completed before AC-7 (SessionProvider migration)
- REPA-004 (image processing) should be completed (currently in UAT)

**NON-BLOCKING**:
- REPA-001 (package structure) already completed
- REPA-002 (upload client) already completed

---

## Story Points Estimate

**8 SP** (Large)

**Justification**:
- 9 components to migrate
- 2 apps to update
- ~1,945 LOC total
- High split risk (0.7)
- Medium review cycles (3)
- SessionProvider dependency adds uncertainty

**Split recommendation**: If mid-implementation issues arise, consider splitting:
- REPA-005a: AC-1 to AC-6, AC-8 to AC-16 (all except SessionProvider)
- REPA-005b: AC-7 only (SessionProvider after REPA-003 completes)

---

## Experiment Variant

**control** (no active experiments)

This story was assigned to the control group because no active experiments were found in `.claude/config/experiments.yaml` at the time of story generation (2026-02-11).

---

## Completion Checklist

Before marking this story as complete:

- [ ] All 16 ACs verified and checked off
- [ ] Package builds in isolation: `pnpm build --filter=@repo/upload`
- [ ] Package tests pass with 80%+ coverage: `pnpm test --filter=@repo/upload --coverage`
- [ ] All app tests pass: `pnpm test:all`
- [ ] All TypeScript checks pass: `pnpm check-types:all`
- [ ] All ESLint checks pass: `pnpm lint:all`
- [ ] Playwright E2E tests pass: `pnpm playwright test --grep="upload"`
- [ ] No imports from old paths remain in main-app
- [ ] No imports from old paths remain in app-instructions-gallery
- [ ] Old component directories deleted from apps
- [ ] SessionProvider works in both auth modes (manual verification)
- [ ] No console errors in apps after migration (manual verification)
- [ ] Component duplication verification documented in _implementation/DIVERGENCE-NOTES.md
- [ ] Story updated in index: `/index-update plans/future/repackag-app/stories.index.md REPA-005 --status=Completed`
- [ ] Token usage logged: `/token-log REPA-005 pm-generate <input-tokens> <output-tokens>`

---

**Generated**: 2026-02-11
**Seed File**: `_pm/STORY-SEED.md`
**Generated From Seed**: true

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### Verdict: SPLIT REQUIRED

This story has been analyzed by autonomous elaboration and exceeds multiple "too large" indicators:
- **16 ACs** (limit: 8) - exceeds by 100%
- **9 components** across 2 apps
- **~1,945 LOC** total
- **8 SP** (Large)
- **REPA-003 blocking dependency** for SessionProvider
- **0.7 split risk** disclosed in story

**Audit Check #8 (Story Sizing) FAILED with High severity.**

### Split Recommendation

The story MUST be split into two independent stories before implementation:

| Split | ACs | SP | Dependency | Risk | Status |
|-------|-----|-----|------------|------|--------|
| **REPA-005a** | 15 (AC-1 to AC-6, AC-8 to AC-16) | 5 | REPA-004 (UAT, non-blocking) | **Low** | Ready to start immediately |
| **REPA-005b** | 1 (AC-7 only) | 3 | **REPA-003 (BLOCKING)** | **Medium** | Ready to start after REPA-003 completion |

**REPA-005a: Migrate Core Upload Components (No Dependency)**
- Scope: ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog, UploaderFileItem, UploaderList, ThumbnailUpload, InstructionsUpload
- Plus: Package structure exports (AC-11), app migrations (AC-12, AC-13), testing (AC-14, AC-15, AC-16)
- Can start immediately - no hook dependencies
- Risk: Low

**REPA-005b: Migrate SessionProvider (REPA-003 Dependent)**
- Scope: SessionProvider only with auth injection pattern
- Depends on: REPA-003 (useUploaderSession hook) - currently "ready-to-work", not completed
- Must wait for REPA-003 completion before starting
- Risk: Medium - auth mode testing needs careful verification

### MVP-Critical Pre-Implementation Item (BLOCKING)

Before REPA-005a or REPA-005b can start, the following pre-implementation checklist item MUST be completed:

**Component Divergence Verification** (Status: Not Yet Started)

- [ ] Run `diff` on all 7 Uploader sub-components between main-app and app-instructions-gallery
- [ ] Document findings in `_implementation/DIVERGENCE-NOTES.md`
- [ ] If divergence >10% LOC, add reconciliation sub-ACs to affected splits
- [ ] Choose canonical implementation source (prefer version with better tests)

**Why This Matters**: Seed requirements (line 437-445) document this step, but it's critical for choosing which app's implementation to migrate. This verification will inform the migration strategy for each component.

### Non-Blocking KB Entries Created (Autonomous Mode)

15 KB entries have been created for future reference:

**Gaps (Schema Consolidation & Testing)**:
1. FileValidationResult schema duplication (deferred to REPA-017)
2. No explicit per-component coverage floor (80%+ package level recommended)
3. SessionProvider auth mode tests implicit (recommend test matrix)
4. Import path migration verification manual (suggest ESLint rule)
5. Storybook documentation deferred (nice-to-have)

**Enhancement Opportunities (UX Polish & Observability)**:
6. Batch operations accessibility for UploaderList (keyboard shortcuts, undo)
7. Drag-and-drop enhancements for ThumbnailUpload (multi-file drop, visual feedback)
8. Progress streaming for InstructionsUpload (WebSocket, time estimates)
9. Rate Limit Banner auto-dismiss (auto-retry on countdown complete)
10. Conflict Modal slug preview (real-time preview, validation)
11. Session Expired Banner refresh integration (auto-refresh hook)
12. UnsavedChangesDialog content preview (file count display, draft saving)
13. Component-level error boundaries (fallback UI, telemetry)
14. Accessibility audit beyond WCAG AA (high contrast, voice control)
15. Upload component analytics (usage tracking, metrics)

**All KB entries are for future roadmap consideration - not MVP-blocking.**

### Summary

- **ACs added**: 0
- **ACs deferred by split**: 0 (split does not lose ACs, only reorganizes)
- **Pre-implementation checklist items added**: 1 (BLOCKING - component divergence verification)
- **KB entries created**: 15 (non-blocking, future reference)
- **Mode**: Autonomous decision
- **Next Action**: Orchestrator MUST spawn `pm-story-split-leader` to formalize REPA-005a and REPA-005b
