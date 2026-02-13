---
doc_type: stories_index
title: "REPA Stories Index"
status: active
story_prefix: "REPA"
created_at: "2026-02-09"
updated_at: "2026-02-11T20:30:00Z"
---

# REPA Stories Index

All stories in this epic use the `REPA-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 8 |
| uat | 4 |
| ready-for-qa | 2 |
| ready-to-work | 5 |
| in-elaboration | 0 |
| backlog | 0 |
| in-progress | 2 |
| pending | 2 |
| needs-work | 0 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| REPA-006 | Migrate Upload Types | — |
| REPA-007 | Add SortableGallery Component | — |
| REPA-008 | Add Gallery Keyboard Hooks | — |
| REPA-010 | Refactor app-inspiration-gallery | — |
| REPA-017 | Consolidate Component-Level Schemas | — |
| REPA-0520 | Migrate SessionProvider | — |


---

## REPA-001: Create @repo/upload Package Structure

**Status:** Completed
**Depends On:** none
**Feature:** Create the new @repo/upload package with proper structure to house all upload-related code. Set up package.json with dependencies, configure TypeScript/ESLint/Vitest, create barrel exports. Package structure includes: client/, hooks/, image/, components/, types/ directories.
**Goal:** Create the foundation package structure for all upload consolidation work.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-001/REPA-001.md
**Elaborated:** 2026-02-10
**Completed:** 2026-02-10

---

## REPA-002: Migrate Upload Client Functions

**Status:** Completed
**Depends On:** none
**Feature:** Consolidate XHR upload client code from @repo/upload-client and app-level implementations. Move @repo/upload-client contents to @repo/upload/client. Add finalizeClient functions. Delete duplicate finalizeClient.ts from app-instructions-gallery. Deprecate old @repo/upload-client package.
**Goal:** Single source of truth for upload client functions.
**Risk Notes:** Deprecated packages need deprecation period.
**Story File:** plans/future/repackag-app/UAT/REPA-002/REPA-002.md
**Elaborated:** 2026-02-10
**Verdict:** CONDITIONAL PASS
**Implemented:** 2026-02-10
**Completed:** 2026-02-10

---

## REPA-003: Migrate Upload Hooks

**Status:** completed
**Depends On:** REPA-002
**Feature:** Consolidate duplicate upload hooks into @repo/upload/hooks. Create single useUploadManager and useUploaderSession implementations supporting both authenticated and anonymous sessions.
**Goal:** Eliminate duplicate upload hook implementations across apps.
**Risk Notes:** Breaking changes during upload migration.
**Story File:** plans/future/repackag-app/UAT/REPA-003/REPA-003.md
**Elaborated:** 2026-02-10
**Implemented:** 2026-02-11
**Verdict:** PASS
**Qa Setup:** 2026-02-11
**Qa Verified:** 2026-02-11
**Completed:** 2026-02-11

---

## REPA-004: Migrate Image Processing

**Status:** uat
**Depends On:** none
**Feature:** Extract image compression and HEIC conversion from wishlist into shared package. Create @repo/upload/image modules for compression, HEIC conversion, and presets. Move useS3Upload hook to package. Includes 3 MVP-critical ACs: useUpload hook tests (AC-8), REPA-001 dependency verification (AC-9), presigned URL schema compatibility (AC-10).
**Goal:** Shared image processing available to all apps via @repo/upload.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-004/REPA-004.md
**Elaborated:** 2026-02-11
**Implemented:** 2026-02-11
**QA Verified:** 2026-02-11
**Verdict:** PASS

---

## REPA-0510: Migrate Core Upload Components

**Status:** uat
**Depends On:** REPA-004
**Split From:** REPA-005
**Story File:** plans/future/repackag-app/UAT/REPA-0510/REPA-0510.md
**Elaborated:** 2026-02-11
**Implementation Started:** 2026-02-11T17:27:32Z
**Implementation Complete:** 2026-02-11
**QA Verified:** 2026-02-12
**Verdict:** PASS (Phase 2: All 16 ACs verified, 469/471 tests passing, 99.6% pass rate)

### Scope

Migrate 8 core upload components to @repo/upload/components with no REPA-003 dependency. Includes 6 Uploader sub-components (ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog, UploaderFileItem, UploaderList) and 2 domain-specific components (ThumbnailUpload, InstructionsUpload). Also covers package structure exports, app migrations, and comprehensive testing.

### Acceptance Criteria (from parent)

AC-1 (ConflictModal), AC-2 (RateLimitBanner), AC-3 (SessionExpiredBanner), AC-4 (UnsavedChangesDialog), AC-5 (UploaderFileItem), AC-6 (UploaderList), AC-8 (ThumbnailUpload), AC-9 (InstructionsUpload), AC-10 (FileValidationResult duplication), AC-11 (package exports), AC-12 (main-app migration), AC-13 (app-instructions-gallery migration), AC-14 (test coverage 80%+), AC-15 (package isolation), AC-16 (app-level tests).

**Story Points:** 5
**Risk:** Low - No REPA-003 dependency, can start immediately after component divergence verification.

**Pre-Implementation Checklist (BLOCKING):**
- [ ] Run `diff` on all 7 Uploader sub-components between main-app and app-instructions-gallery
- [ ] Document findings in `_implementation/DIVERGENCE-NOTES.md`
- [ ] If divergence >10% LOC, add reconciliation sub-ACs or split further
- [ ] Choose canonical implementation source (prefer version with better tests)

**Elaboration Report:** plans/future/repackag-app/ready-to-work/REPA-0510/ELAB-REPA-0510.md

---

## REPA-0520: Migrate SessionProvider

**Status:** ready-to-work
**Depends On:** REPA-003, REPA-0510
**Split From:** REPA-005
**Story File:** plans/future/repackag-app/ready-to-work/REPA-0520/REPA-0520.md
**Elaborated:** 2026-02-11
**Elaboration Report:** plans/future/repackag-app/ready-to-work/REPA-0520/ELAB-REPA-0520.md
**Verdict:** PASS

### Scope

Migrate SessionProvider component to @repo/upload/components with dependency injection pattern for auth state. Supports both authenticated mode (Redux) and anonymous mode. This split isolates the REPA-003 dependency (useUploaderSession hook) from the rest of the upload components migration.

### Acceptance Criteria (from parent)

AC-7 only (SessionProvider migration with auth injection pattern, tests for both auth modes).

**Story Points:** 3
**Risk:** Low - REPA-003 verified as completed (2026-02-11), auth injection pattern clearly documented, blocking dependencies resolved.

**Implementation Ready:** Yes - REPA-003 (useUploaderSession) and REPA-0510 (core upload components) both completed and available.

---

## REPA-006: Migrate Upload Types

**Status:** Ready to Work
**Depends On:** none
**Feature:** Consolidate upload types and delete deprecated wrappers. Move @repo/upload-types schemas to @repo/upload/types. Delete deprecated wrapper files. Deprecate @repo/upload-types package.
**Goal:** Single source of truth for all upload type definitions.
**Risk Notes:** Deprecated packages need deprecation period.
**Story File:** plans/future/repackag-app/ready-to-work/REPA-006/REPA-006.md
**Elaborated:** 2026-02-10
**Verdict:** CONDITIONAL PASS
**Experiment Variant:** control

---

## REPA-007: Add SortableGallery Component

**Status:** Ready to Work
**Depends On:** none
**Feature:** Add drag-and-drop gallery support to @repo/gallery using dnd-kit. Create SortableGallery with onReorder callback, undo/redo flow, grid/list layouts, keyboard reordering, and accessibility support. This eliminates ~1000 LOC from wishlist and inspiration apps.
**Goal:** Reusable drag-and-drop gallery component available in @repo/gallery.
**Risk Notes:** API design may not cover all app needs. **Sizing Warning:** 5 SP with many features. **Split Recommendation:** Consider split into REPA-007a (core, 3 SP) + REPA-007b (advanced, 2 SP) for cleaner implementation.
**Story File:** plans/future/repackag-app/ready-to-work/REPA-007/REPA-007.md
**Elaborated:** 2026-02-10
**Verdict:** CONDITIONAL PASS

---

## REPA-008: Add Gallery Keyboard Hooks

**Status:** Ready to Work
**Depends On:** none
**Feature:** Extract and standardize keyboard navigation hooks for galleries. Move useRovingTabIndex to @repo/gallery/hooks, useAnnouncer to @repo/accessibility. Create useGalleryKeyboard and useGallerySelection hooks.
**Goal:** Shared keyboard navigation hooks for all gallery apps.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/REPA-008/REPA-008.md
**Elaborated:** 2026-02-10
**Verdict:** PASS

---

## REPA-009: Enhance GalleryCard with Selection & Drag

**Status:** uat
**Depends On:** REPA-007
**Feature:** Enhance GalleryCard to support selection mode (selectable, selected, onSelect, selectionPosition props) and drag handles (draggable, dragHandlePosition props). Add hoverOverlay prop. Simplify InspirationCard and AlbumCard to use enhanced GalleryCard.
**Goal:** GalleryCard natively supports selection and drag-and-drop modes.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-009/REPA-009.md
**Elaborated:** 2026-02-10
**Verdict:** PASS
**Implemented:** 2026-02-11
**QA Verified:** 2026-02-11
**Experiment Variant:** control

---

## REPA-010: Refactor app-inspiration-gallery to Use @repo/gallery

**Status:** ready-to-work
**Depends On:** none
**Feature:** Refactor inspiration gallery to use @repo/gallery. Replace DraggableInspirationGallery, InspirationCard, SortableInspirationCard, AlbumCard, GalleryLoadingSkeleton, and custom keyboard handling with shared components.
**Goal:** app-inspiration-gallery fully uses @repo/gallery with no custom gallery components.
**Risk Notes:** API design may not cover all app needs. **Sizing Warning:** 5 SP full app refactor.
**Note:** Dependencies REPA-007, REPA-008, REPA-009 all completed as of 2026-02-11.

---

## REPA-011: Standardize GalleryFilterBar Across Apps

**Status:** completed
**Depends On:** none
**Feature:** Make GalleryFilterBar extensible with customFilters slot. Create BuildStatusFilter for sets gallery. Refactor sets gallery to use shared GalleryFilterBar.
**Goal:** Single extensible GalleryFilterBar used across all gallery apps.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-011/REPA-011.md
**Elaborated:** 2026-02-10
**Verdict:** PASS
**Implemented:** 2026-02-10
**Completed:** 2026-02-10

---

## REPA-012: Create @repo/auth-hooks Package

**Status:** In Progress
**Depends On:** none
**Feature:** Create shared authentication hooks package. Implement useModuleAuth properly (replace 6 identical stubs). Move usePermissions and useTokenRefresh from main-app. Delete 6 duplicate stub files.
**Goal:** Real auth hook implementations shared across all 6 apps.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/in-progress/REPA-012/REPA-012.md
**Elaborated:** 2026-02-10
**Verdict:** CONDITIONAL PASS
**Experiment Variant:** control

---

## REPA-013: Create @repo/auth-utils Package

**Status:** In Progress
**Depends On:** none
**Feature:** Create shared authentication utilities. Move JWT utilities (122 lines) and route guard utilities (346 lines) from main-app.
**Goal:** Shared JWT and route guard utilities available to all apps.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/in-progress/REPA-013/REPA-013.md
**Elaborated:** 2026-02-11
**Verdict:** CONDITIONAL PASS

---

## REPA-014: Create @repo/hooks Package

**Status:** Completed
**Depends On:** none
**Feature:** Create general-purpose hooks package. Move useLocalStorage, useUnsavedChangesPrompt (both deduped), useDelayedShow, and useMultiSelect from various apps.
**Goal:** Single source for common hooks, no duplicates in apps.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-014/REPA-014.md
**Elaborated:** 2026-02-10
**Verdict:** PASS
**Completed:** 2026-02-10
**Experiment Variant:** control

---

## REPA-015: Extract Generic A11y Utilities to @repo/accessibility

**Status:** Completed
**Depends On:** none
**Feature:** Extract generic accessibility utilities from app-wishlist-gallery's a11y.ts to @repo/accessibility. Move focusRingClasses, keyboardShortcutLabels, getKeyboardShortcutLabel(), and ContrastRatioSchema (~50 LOC). Domain-specific ARIA generators stay in app. Note: useAnnouncer already completed by REPA-008.
**Goal:** Generic accessibility utilities available to all apps via @repo/accessibility.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-015/REPA-015.md
**Elaborated:** 2026-02-10
**Verdict:** CONDITIONAL PASS
**Implemented:** 2026-02-10
**Completed:** 2026-02-10
**Experiment Variant:** control

---

## REPA-016: Consolidate MOC Schemas into @repo/api-client

**Status:** Completed
**Depends On:** none
**Feature:** Consolidate MOC-related Zod schemas into @repo/api-client. Restructure schemas/instructions with form.ts, api.ts, utils.ts subdirectories. Move moc-form.ts (327 lines) from main-app. Delete exact duplicate from app-instructions-gallery.
**Goal:** Single source of truth for MOC type definitions in @repo/api-client.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-016/REPA-016.md
**Elaborated:** 2026-02-10
**Verdict:** PASS
**Experiment Variant:** control
**Implemented:** 2026-02-10
**Completed:** 2026-02-11

---

## REPA-017: Consolidate Component-Level Schemas

**Status:** Ready to Work
**Depends On:** none
**Feature:** Move duplicate component schemas to shared locations. Move FileValidationResultSchema from ThumbnailUpload and InstructionsUpload to @repo/upload/types.
**Goal:** No duplicate schemas in component __types__ directories.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/ready-to-work/REPA-017/REPA-017.md
**Elaborated:** 2026-02-11
**Verdict:** PASS
**Experiment Variant:** control

---

## REPA-018: Create @repo/auth-services Package

**Status:** Completed
**Depends On:** none
**Feature:** Create shared authentication services package. Move session service from main-app (162 lines). Make session management available to other apps.
**Goal:** Shared session management service for all apps.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-018/REPA-018.md
**Elaborated:** 2026-02-10
**Verdict:** CONDITIONAL PASS
**Implemented:** 2026-02-10
**Completed:** 2026-02-10
**Experiment Variant:** control

---

## REPA-019: Add Error Mapping to @repo/api-client

**Status:** Completed
**Depends On:** none
**Feature:** Move error handling utilities to @repo/api-client. Add errorMapping (494 lines) and authFailureHandler (138 lines) from main-app, refactored for dependency injection. Includes 2 MVP-critical ACs: error code accuracy (AC-11) and API reset coordination (AC-12).
**Goal:** Consistent error handling across all apps via @repo/api-client.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/UAT/REPA-019/REPA-019.md
**Implemented:** 2026-02-10
**QA Verified:** 2026-02-11
**Elaborated:** 2026-02-10
**Verdict:** PASS
**Experiment Variant:** control

---

## REPA-020: Create Domain Card Factories

**Status:** Completed
**Depends On:** REPA-009
**Feature:** Create factory functions for domain-specific cards in @repo/gallery. Create createInstructionCard, createSetCard, createWishlistCard, createInspirationCard factories. Document patterns in Storybook.
**Goal:** Consistent card creation pattern with Storybook documentation.
**Risk Notes:** REPA-009 already implemented with breaking changes; factories must use hoverOverlay API (enforced by AC-22)
**Story File:** plans/future/repackag-app/UAT/REPA-020/REPA-020.md
**Implemented:** 2026-02-11
**Elaborated:** 2026-02-11
**QA Verified:** 2026-02-11
**Verdict:** PASS
**Experiment Variant:** control

---

## REPA-021: Standardize Card Skeletons

**Status:** ready-for-qa
**Depends On:** none
**Feature:** Consolidate skeleton loading components. Move DashboardSkeleton and EmptyDashboard from main-app to @repo/app-component-library. Delete duplicates from app-dashboard. Create generic EmptyState component.
**Goal:** Single skeleton/empty state components in shared library.
**Risk Notes:** —
**Story File:** plans/future/repackag-app/ready-for-qa/REPA-021/REPA-021.md
**Elaborated:** 2026-02-10
**Implemented:** 2026-02-11
**Verdict:** PASS

---

## REPA-022: E2E Tests for Dashboard Skeleton and Empty States

**Status:** backlog
**Depends On:** REPA-021
**Feature:** Add Playwright E2E tests verifying DashboardSkeleton and EmptyDashboard render correctly in app-dashboard. Test loading state shows skeleton, empty state appears when totalMocs === 0, CTA button is clickable and navigates correctly. Use real services per ADR-006.
**Goal:** E2E verification of consolidated skeleton and empty state components.
**Risk Notes:** Requires test account with zero MOCs for empty state testing.
