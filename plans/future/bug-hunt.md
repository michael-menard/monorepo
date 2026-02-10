# Bug Hunt & Missing Functionality Plan

## Overview

This plan documents bugs, missing functionality, test gaps, accessibility issues, and technical debt identified through a comprehensive audit of all web applications.

**Created:** 2026-02-08
**Status:** Planning
**Epic:** BUGHUNT

---

## Summary Statistics

| App | Critical | High | Medium | Low | Total |
|-----|----------|------|--------|-----|-------|
| app-dashboard | 5 | 3 | 14 | 12 | 34 |
| app-inspiration-gallery | 2 | 6 | 16 | 8 | 32 |
| app-instructions-gallery | 3 | 5 | 35 | 12 | 55 |
| app-sets-gallery | 2 | 4 | 8 | 9 | 23 |
| app-wishlist-gallery | 1 | 3 | 7 | 8 | 19 |
| main-app | 2 | 8 | 15 | 20 | 45 |
| reset-password | 0 | 2 | 8 | 12 | 22 |
| lego-moc-instructions-app | 0 | 0 | 0 | 3 | 3 (deprecated) |
| **TOTAL** | **15** | **31** | **103** | **84** | **233** |

---

## App: app-dashboard

### Critical Issues

#### BUGHUNT-DASH-001: Test/Implementation Mismatch - App.test.tsx
**Severity:** CRITICAL
**File:** `/apps/web/app-dashboard/src/App.test.tsx`
**Lines:** 22, 27, 31-32

**Description:**
Test expects content that doesn't exist in implementation:
- Expects "App Dashboard" heading (line 22)
- Expects "Welcome to the App Dashboard module" message (line 27)
- Expects "Getting Started" card and "Customize this module" text (lines 31-32)

Actual App component only renders `AppDashboardModule > ModuleLayout > MainPage` with none of these texts.

**Action:** Fix tests to match actual implementation OR update implementation to match expected behavior

---

#### BUGHUNT-DASH-002: Test/Implementation Mismatch - QuickActions.test.tsx
**Severity:** HIGH
**File:** `/apps/web/app-dashboard/src/components/__tests__/QuickActions.test.tsx`
**Lines:** 21-26, 32, 35-36

**Description:**
- Test expects 3 buttons: "Add MOC", "Browse Gallery", "View Wishlist"
- Actual component only renders single "Add MOC" button
- Test expects hrefs to '/gallery' and '/wishlist' but component doesn't have these

**Action:** Update QuickActions component to match test expectations or fix tests

---

#### BUGHUNT-DASH-003: Test/Implementation Mismatch - EmptyDashboard.test.tsx
**Severity:** HIGH
**File:** `/apps/web/app-dashboard/src/components/__tests__/EmptyDashboard.test.tsx`
**Lines:** 43-58

**Description:**
Test expects feature highlights (Organize MOCs, Gallery View, Wishlist, Instructions) that don't exist in actual EmptyDashboard component.

**Action:** Implement feature highlights or update tests

---

#### BUGHUNT-DASH-004: Test/Implementation Mismatch - RecentMocsGrid.test.tsx
**Severity:** HIGH
**File:** `/apps/web/app-dashboard/src/components/__tests__/RecentMocsGrid.test.tsx`
**Lines:** 75-79

**Description:**
Test expects `container.firstChild` to be null when mocs array is empty. Actual component returns a Card with "No MOCs match your filters" message.

**Action:** Fix test to expect the empty state Card

---

#### BUGHUNT-DASH-005: Test/Implementation Mismatch - MainPage.test.tsx
**Severity:** HIGH
**File:** `/apps/web/app-dashboard/src/pages/__tests__/main-page.test.tsx`
**Lines:** 50, 86

**Description:**
- Test expects "App Dashboard" text but DashboardHeader renders "Dashboard"
- Test expects "Failed to load dashboard" error message but MainPage has no error handling

**Action:** Add error handling to MainPage and fix test expectations

---

### High Priority

#### BUGHUNT-DASH-006: MainPage Missing Error Handling
**Severity:** HIGH
**File:** `/apps/web/app-dashboard/src/pages/main-page.tsx`

**Description:**
MainPage doesn't handle API errors. Uses mock data instead of actual API. No error state UI when API fails.

**Action:** Implement error boundary and error state UI

---

#### BUGHUNT-DASH-007: Module Auth Hook Not Connected
**Severity:** MEDIUM
**File:** `/apps/web/app-dashboard/src/hooks/use-module-auth.ts`
**Lines:** 59, 74, 87

**Description:**
Three TODO comments indicating stub implementation:
- Line 59: "Connect to your auth system"
- Line 74: "Implement permission checking logic"
- Line 87: "Implement auth refresh logic"

Returns hardcoded auth state (hasAccess: true, canEdit: true, canDelete: false).

**Action:** Connect to actual auth system or create shared auth hook

---

### Medium Priority - Missing Tests

#### BUGHUNT-DASH-008: Components Without Tests
**Severity:** MEDIUM

Components missing test coverage:
- `DashboardHeader/index.tsx`
- `BuildStatusChart/index.tsx`
- `ThemeChart/index.tsx`
- `PartsCoverageCard/index.tsx`
- `PartsTable/index.tsx`
- `ActivityFeed/index.tsx`
- `FilterBar/index.tsx`
- `module-layout.tsx`

**Action:** Create test files for each component

---

### Low Priority

#### BUGHUNT-DASH-009: Duplicate Component Files
**Severity:** LOW
**Files:**
- `DashboardSkeleton.tsx` AND `DashboardSkeleton/index.tsx`
- `EmptyDashboard.tsx` AND `EmptyDashboard/index.tsx`

**Description:** Two files with similar names but potentially different content. Unclear which is used.

**Action:** Consolidate to single implementation

---

#### BUGHUNT-DASH-010: Missing Null Checks
**Severity:** LOW
**Files:**
- `BuildStatusChart/index.tsx` line 26
- `ThemeChart/index.tsx` lines 17-23
- `PartsCoverageCard/index.tsx` line 16

**Description:** Assume data fields exist without null checks.

**Action:** Add defensive null checks

---

#### BUGHUNT-DASH-011: Hardcoded Activity Limit
**Severity:** LOW
**File:** `/apps/web/app-dashboard/src/components/ActivityFeed/index.tsx`
**Line:** 83

**Description:** `activities.slice(0, 5)` hardcodes limit of 5. Should be configurable prop.

**Action:** Add `limit` prop with default value

---

#### BUGHUNT-DASH-012: Interface Instead of Zod Schema
**Severity:** LOW
**File:** `/apps/web/app-dashboard/src/hooks/use-module-auth.ts`
**Lines:** 30-35

**Description:** Uses `interface` for `UseModuleAuthReturn` instead of Zod schema (violates CLAUDE.md).

**Action:** Convert to Zod schema with `z.infer<>`

---

---

## App: app-inspiration-gallery

### Critical Issues

#### BUGHUNT-INSP-001: No Tests for Main Page
**Severity:** CRITICAL
**File:** `/apps/web/app-inspiration-gallery/src/pages/main-page.tsx`

**Description:** Main page component (most important) has NO test file. This is a critical test coverage gap.

**Action:** Create comprehensive main-page.test.tsx

---

#### BUGHUNT-INSP-002: Album Membership Data Hardcoded
**Severity:** CRITICAL
**File:** `/apps/web/app-inspiration-gallery/src/pages/main-page.tsx`
**Lines:** 776-777

**Description:**
```typescript
// TODO: Get album membership info
albumCount: 0,
albumNames: [],
```
Users can't see which albums an inspiration is in before deleting.

**Action:** Implement album membership API integration

---

### High Priority

#### BUGHUNT-INSP-003: Missing API Implementations
**Severity:** HIGH
**File:** `/apps/web/app-inspiration-gallery/src/pages/main-page.tsx`

**Lines and Issues:**
- Line 325-326: `handleAddToAlbum` not implemented - "Implement when album membership API is ready"
- Line 332-333: `handleLinkToMoc` not implemented - "Implement when MOC linking API is ready"
- Line 395: Bulk delete for inspirations not implemented
- Line 862: Bulk delete for inspirations not implemented
- Line 875: Bulk delete for albums not implemented

**Action:** Implement API integrations for album membership and MOC linking

---

#### BUGHUNT-INSP-004: Console.log Debug Statements
**Severity:** MEDIUM
**File:** `/apps/web/app-inspiration-gallery/src/pages/main-page.tsx`
**Lines:** 326, 333, 379, 599, 678

**Description:** Multiple `console.log()` calls left in production code.

**Action:** Remove or replace with @repo/logger

---

#### BUGHUNT-INSP-005: Auth Module Stubbed
**Severity:** HIGH
**File:** `/apps/web/app-inspiration-gallery/src/hooks/use-module-auth.ts`
**Lines:** 59, 74, 87

**Description:** Same stub implementation as other apps with TODO comments.

**Action:** Connect to shared auth system

---

#### BUGHUNT-INSP-006: Silent Error Handling in Modals
**Severity:** MEDIUM
**Files:**
- `LinkToMocModal/index.tsx` lines 118-119
- `AddToAlbumModal/index.tsx` lines 108-109

**Description:** Empty catch blocks silently swallow errors:
```typescript
} catch {
  // Error handled by parent
}
```

**Action:** Add proper error logging and user feedback

---

### Medium Priority - Test Gaps

#### BUGHUNT-INSP-007: 19 Components Without Tests
**Severity:** MEDIUM

Components missing tests:
- AddToAlbumModal
- AlbumContextMenu
- AlbumDragPreview
- CreateAlbumModal
- DeleteAlbumModal
- DeleteInspirationModal
- DraggableInspirationGallery
- EditInspirationModal
- EmptyState
- GalleryLoadingSkeleton
- InspirationCardSkeleton
- InspirationContextMenu
- InspirationDragPreview
- LinkToMocModal
- SortableAlbumCard
- SortableInspirationCard
- UploadModal
- AlbumCardSkeleton

**Action:** Create test files for critical components (modals, drag gallery)

---

#### BUGHUNT-INSP-008: Memory Leak - Preview URL
**Severity:** MEDIUM
**File:** `/apps/web/app-inspiration-gallery/src/components/UploadModal/index.tsx`
**Line:** 126

**Description:** `URL.createObjectURL(file)` creates blob URL but never calls `URL.revokeObjectURL()` on cleanup.

**Action:** Add cleanup in useEffect or when file is removed

---

### Low Priority

#### BUGHUNT-INSP-009: z.any() in Props Schema
**Severity:** LOW
**File:** `/apps/web/app-inspiration-gallery/src/components/BulkActionsBar/index.tsx`
**Lines:** 26-34

**Description:** Uses `z.any()` for callback props which defeats type safety.

**Action:** Create proper Zod schemas for callback signatures

---

#### BUGHUNT-INSP-010: Hardcoded Limits
**Severity:** LOW
**Files:**
- `UploadModal/index.tsx` line 165: `tags.length < 20` hardcoded
- `UploadModal/index.tsx` line 68: 10MB max file size hardcoded
- `main-page.tsx` lines 121, 134: `limit: 50` pagination hardcoded

**Action:** Extract to configuration constants

---

---

## App: app-instructions-gallery

### Critical Issues

#### BUGHUNT-INST-001: Missing Presigned URL API Integration
**Severity:** CRITICAL
**File:** `/apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
**Line:** 157

**Description:**
```typescript
// TODO: In real implementation, call API to get presigned URLs
```
Currently creates mock file items for UI demonstration. Uploader cannot actually upload files.

**Action:** Implement presigned URL API integration

---

#### BUGHUNT-INST-002: Session Refresh API Missing
**Severity:** CRITICAL
**File:** `/apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
**Line:** 276

**Description:**
```typescript
// TODO: Call API to get new presigned URLs for expired files
```
Session refresh for expired uploads won't work without API integration.

**Action:** Implement session refresh API endpoint

---

#### BUGHUNT-INST-003: Edit Save Not Implemented
**Severity:** CRITICAL
**File:** `/apps/web/app-instructions-gallery/src/pages/edit-page.tsx`
**Lines:** 124-125

**Description:**
```typescript
// TODO: Implement save via RTK Query mutation
// await updateMoc({ id: moc.id, data }).unwrap()
```
Edit functionality is placeholder only.

**Action:** Implement RTK Query mutation for saving edits

---

### High Priority

#### BUGHUNT-INST-004: 40+ Interface Violations
**Severity:** HIGH
**Multiple Files**

**Description:** Project guidelines require Zod schemas with `z.infer<>`, but codebase contains 40+ TypeScript interfaces:
- `finalizeClient.ts`: FinalizeOptions (line 134)
- `MocForm/index.tsx`: MocFormProps (line 56)
- `useUploadManager.ts`: UseUploadManagerOptions, FileWithUploadUrl, UseUploadManagerResult
- `InstructionCard/index.tsx`: InstructionCardProps
- Many more...

**Action:** Convert interfaces to Zod schemas

---

#### BUGHUNT-INST-005: Console.log Instead of Logger
**Severity:** MEDIUM
**File:** `/apps/web/app-instructions-gallery/src/DetailModule.tsx`
**Lines:** 88, 101

**Description:** Uses `console.log()` instead of `@repo/logger`.

**Action:** Replace with logger.info()

---

#### BUGHUNT-INST-006: Missing Permission Checks
**Severity:** HIGH
**Routes:**
- `/instructions/new` - No auth check
- `/instructions/:id/edit` - No ownership verification

**Description:** Anyone can access upload and edit pages.

**Action:** Add route guards and permission checks

---

#### BUGHUNT-INST-007: Auth Module Stubbed
**Severity:** HIGH
**File:** `/apps/web/app-instructions-gallery/src/hooks/use-module-auth.ts`
**Lines:** 59, 74, 87

**Description:** Same stub implementation as other apps.

**Action:** Connect to shared auth system

---

### Medium Priority

#### BUGHUNT-INST-008: Type Assertions in Upload Components
**Severity:** MEDIUM
**Files:**
- `ThumbnailUpload/index.tsx` line 34: `file.type as any`
- `InstructionsUpload/index.tsx` line 52: `file.type as any`

**Action:** Properly type file MIME types

---

#### BUGHUNT-INST-009: Memory Leak - createObjectURL
**Severity:** MEDIUM
**File:** `/apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`
**Line:** 95

**Description:** `URL.createObjectURL(file)` created but only revoked on remove, not on unmount.

**Action:** Add cleanup in useEffect

---

#### BUGHUNT-INST-010: Missing Accessibility
**Severity:** MEDIUM
**Files:**
- `ThumbnailUpload/index.tsx` lines 207-239: Missing keyboard support, ARIA labels
- `MocForm/index.tsx` lines 143-250: Missing `aria-describedby` for error messages

**Action:** Add ARIA labels and keyboard handlers

---

---

## App: app-sets-gallery

### Critical Issues

#### BUGHUNT-SETS-001: Delete API Not Implemented
**Severity:** CRITICAL
**Files:**
- `main-page.tsx` lines 116-122
- `set-detail-page.tsx` lines 213-223

**Description:**
Delete confirmation dialogs are wired but API calls are stubbed:
```typescript
// NOTE: Actual delete API + cache invalidation will be implemented in sets-2004
```

**Action:** Implement `useDeleteSetMutation` integration

---

#### BUGHUNT-SETS-002: Edit Page Missing
**Severity:** CRITICAL
**File:** `/apps/web/app-sets-gallery/src/Module.tsx`
**Line:** 39

**Description:**
Route defined as `/sets/:id/edit` but routes to SetDetailPage instead of edit page. No edit-set-page.tsx exists.

**Action:** Create edit-set-page.tsx and implement edit flow

---

### High Priority

#### BUGHUNT-SETS-003: window.confirm Instead of Dialog
**Severity:** HIGH
**File:** `/apps/web/app-sets-gallery/src/pages/set-detail-page.tsx`
**Line:** 213

**Description:** Uses native `window.confirm()` instead of proper ConfirmationDialog (main-page uses proper dialog).

**Action:** Replace with ConfirmationDialog component

---

#### BUGHUNT-SETS-004: Image Upload Error Handling
**Severity:** MEDIUM
**File:** `/apps/web/app-sets-gallery/src/pages/add-set-page.tsx`
**Lines:** 124-127

**Description:** Image upload errors are "best-effort" non-blocking with no retry mechanism.

**Action:** Add retry mechanism and clearer error messaging

---

#### BUGHUNT-SETS-005: Auth Module Stubbed
**Severity:** HIGH
**File:** `/apps/web/app-sets-gallery/src/hooks/use-module-auth.ts`
**Lines:** 59, 74, 87

**Description:** Same stub implementation as other apps.

**Action:** Connect to shared auth system

---

### Medium Priority - Test Gaps

#### BUGHUNT-SETS-006: Missing Component Tests
**Severity:** MEDIUM

Components without tests:
- GalleryGrid
- GalleryFilterBar
- ModuleLayout

**Action:** Create test files

---

#### BUGHUNT-SETS-007: SetDetailPage No Tests
**Severity:** MEDIUM
**File:** `/apps/web/app-sets-gallery/src/pages/set-detail-page.tsx`

**Description:** Most complex page has no test file.

**Action:** Create comprehensive test file

---

### Low Priority

#### BUGHUNT-SETS-008: Mock API File Should Be Removed
**Severity:** LOW
**File:** `/apps/web/app-sets-gallery/src/api/mock-sets-api.ts`

**Description:** Entire file marked as temporary mock for Story 3.4.3. Real app uses RTK Query.

**Action:** Delete mock API file once story is complete

---

#### BUGHUNT-SETS-009: Type Assertions in Columns
**Severity:** LOW
**File:** `/apps/web/app-sets-gallery/src/columns/sets-columns.tsx`
**Line:** 33

**Description:** Uses `ColumnDef<Set, any>[]` instead of proper column ID type.

**Action:** Replace `any` with `string`

---

---

## App: app-wishlist-gallery

### High Priority

#### BUGHUNT-WISH-001: Auth Module canDelete Always False
**Severity:** HIGH
**File:** `/apps/web/app-wishlist-gallery/src/hooks/use-module-auth.ts`
**Line:** 66

**Description:** Returns hardcoded `canDelete: false` which disables delete functionality.

**Action:** Connect to actual auth system

---

#### BUGHUNT-WISH-002: Unsafe Error Type Assertion
**Severity:** MEDIUM
**File:** `/apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
**Lines:** 179-182

**Description:** Unsafe error object typing:
```typescript
const errorMessage =
  error && typeof error === 'object' && 'error' in error
    ? (error as { error: { data?: { message?: string } } }).error?.data?.message
```

**Action:** Create proper error type guard

---

#### BUGHUNT-WISH-003: S3 URL Hardcoding
**Severity:** MEDIUM
**File:** `/apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
**Line:** 308

**Description:** S3 URL construction hardcodes bucket name. Doesn't account for regions or CDN.

**Action:** Get URL from server response instead of constructing

---

### Medium Priority

#### BUGHUNT-WISH-004: HEIC Conversion Silent Fallback
**Severity:** MEDIUM
**File:** `/apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`
**Line:** 246

**Description:** If HEIC conversion fails, upload silently attempts with HEIC file. User may not understand why upload fails.

**Action:** Show explicit warning toast on conversion failure

---

#### BUGHUNT-WISH-005: Incomplete Drag Tests
**Severity:** MEDIUM
**File:** `/apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/__tests__/`

**Description:** Missing tests for:
- Actual drag-and-drop interaction
- Undo flow completion
- API error rollback
- Network timeout retry

**Action:** Add integration tests for drag scenarios

---

#### BUGHUNT-WISH-006: Misleading A11y Announcement
**Severity:** MEDIUM
**File:** `/apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
**Lines:** 446-450

**Description:** Screen reader announcement says "Use arrow keys to move" but KeyboardSensor was removed, so arrow keys don't control drag.

**Action:** Fix announcement to reflect actual keyboard controls

---

### Low Priority

#### BUGHUNT-WISH-007: No Undo Timer Display
**Severity:** LOW
**File:** `/apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

**Description:** Toast shows "Undo" button but no countdown timer. User doesn't know how long they have.

**Action:** Add countdown timer to undo toast (5 seconds)

---

#### BUGHUNT-WISH-008: Form Recovery Data Cleared Immediately
**Severity:** LOW
**File:** `/apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
**Lines:** 104-110

**Description:** Recovery data cleared immediately after load. If user navigates back, data is lost.

**Action:** Clear recovery data only after successful submission

---

---

## App: main-app

### Critical Issues

#### BUGHUNT-MAIN-001: Presigned URL API Stub
**Severity:** CRITICAL
**File:** `/apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
**Line:** 157

**Description:**
```typescript
// TODO: In real implementation, call API to get presigned URLs
```
Creates mock file IDs and fake upload URLs. Uploader cannot actually upload files.

**Action:** Implement presigned URL API integration

---

#### BUGHUNT-MAIN-002: Edit Save Stub
**Severity:** CRITICAL
**File:** `/apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx`
**Lines:** 124-125

**Description:**
```typescript
// TODO: Implement save via RTK Query mutation
```
Edit save functionality is placeholder only.

**Action:** Implement RTK Query mutation

---

### High Priority

#### BUGHUNT-MAIN-003: Console.error in Admin Page
**Severity:** HIGH
**File:** `/apps/web/main-app/src/routes/admin/pages/AdminUserDetailPage.tsx`
**Lines:** 58, 67, 76

**Description:** Uses `console.error()` instead of `@repo/logger`.

**Action:** Replace with logger.error()

---

#### BUGHUNT-MAIN-004: 10 Skipped Test Suites
**Severity:** HIGH
**Multiple Files**

Completely skipped test suites:
1. `performance.test.tsx`
2. `UnifiedNavigation.test.tsx`
3. `NavigationSearch.test.tsx`
4. `NavigationProvider.test.tsx`
5. `NavigationSystem.integration.test.tsx`
6. `Navigation.integration.test.tsx`
7. `Header.test.tsx`
8. `LayoutIntegration.test.tsx`
9. `CachePerformance.test.ts`
10. `AuthFlow.test.tsx`

**Action:** Implement or remove skipped tests

---

#### BUGHUNT-MAIN-005: Auth Hub.listen Not Tested
**Severity:** HIGH
**File:** `/apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`
**Lines:** 102, 117, 139, 166, 198, 239, 261, 285

**Description:** 8 TODO comments: "Hub.listen mock not being called in test environment"

**Action:** Fix Hub.listen mocking in tests

---

#### BUGHUNT-MAIN-006: 29 Components Without Tests
**Severity:** MEDIUM

Untested components include:
- AdminModule
- AdminUserDetailPage
- InspirationModule
- RevokeTokensDialog
- UnblockUserDialog
- UserSearchInput
- SetsGalleryModule
- Sidebar
- SlugField
- TagInput
- And 19+ more

**Action:** Create test files for critical components

---

#### BUGHUNT-MAIN-007: Double-Click Race Condition
**Severity:** MEDIUM
**File:** `/apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
**Lines:** 131, 179

**Description:** `finalizingRef.current` checked without proper async protection. Race condition could allow duplicate submissions.

**Action:** Add proper mutex/debounce protection

---

#### BUGHUNT-MAIN-008: Session Expiry Logic Flaw
**Severity:** MEDIUM
**File:** `/apps/web/main-app/src/hooks/useUploaderSession.ts`
**Line:** 160

**Description:** Logic error in user mismatch check - `isAuthenticated && !user.id` is contradictory.

**Action:** Fix conditional logic

---

### Medium Priority

#### BUGHUNT-MAIN-009: Type Assertions in AuthProvider
**Severity:** MEDIUM
**File:** `/apps/web/main-app/src/services/auth/AuthProvider.tsx`
**Lines:** 137, 205, 272, 338, 403

**Description:** Multiple `as unknown as { refreshToken?: ... }` casts throughout token processing.

**Action:** Create proper Amplify type definitions

---

#### BUGHUNT-MAIN-010: 40+ as any Assertions
**Severity:** MEDIUM
**Multiple Files**

**Description:** Extensive use of `as any` casting in:
- `store/index.ts`
- `mocks/handlers.ts`
- `routes/modules/GalleryModule.tsx`
- Multiple test files

**Action:** Replace with proper types

---

### Low Priority

#### BUGHUNT-MAIN-011: Empty Catch Blocks
**Severity:** LOW
**File:** `/apps/web/main-app/src/hooks/useUploaderSession.ts`
**Lines:** 142, 176

**Description:** Silent error suppression in anon session fallback.

**Action:** Add at least debug-level logging

---

---

## App: reset-password

### High Priority

#### BUGHUNT-RESET-001: No E2E Tests for Password Reset
**Severity:** HIGH
**Directory:** `/apps/web/playwright/features/auth/`

**Description:** No Playwright feature files exist for:
- `/forgot-password` page flow
- `/reset-password` page flow
- Code expiration scenarios
- Rate limiting scenarios

Page Objects exist but no tests use them.

**Action:** Create forgot-password.feature and reset-password.feature

---

#### BUGHUNT-RESET-002: No AuthProvider Unit Tests
**Severity:** HIGH
**File:** `/apps/web/main-app/src/services/auth/__tests__/`

**Description:** No unit tests for:
- `handleForgotPassword`
- `handleConfirmResetPassword`
- Error mapping (CodeMismatchException, ExpiredCodeException, etc.)

**Action:** Create unit tests for password reset handlers

---

### Medium Priority

#### BUGHUNT-RESET-003: Duplicate Password Strength Implementation
**Severity:** MEDIUM
**Files:**
- `reset-password/src/components/PasswordStrengthIndicator.tsx`
- `main-app/src/routes/pages/ResetPasswordPage.tsx`

**Description:** Two separate implementations of `getPasswordStrength()` with identical logic.

**Action:** Consolidate to single shared implementation

---

#### BUGHUNT-RESET-004: Missing Rate Limiting UI
**Severity:** MEDIUM
**File:** `/apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx`

**Description:**
- No countdown timer for rate limit wait period
- No button disable during rate limit
- User can immediately retry and get same error

**Action:** Add rate limit countdown and button disable

---

#### BUGHUNT-RESET-005: No Resend Code Rate Limiting
**Severity:** MEDIUM
**File:** `/apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx`
**Lines:** 199-227

**Description:** "Resend code" button can be clicked repeatedly without cooldown.

**Action:** Add cooldown period to resend button

---

#### BUGHUNT-RESET-006: OTPInput Missing aria-describedby
**Severity:** MEDIUM
**File:** `/apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx`
**Lines:** 421-435

**Description:** OTPInput doesn't have `aria-describedby` pointing to validation errors.

**Action:** Add aria-describedby for accessibility

---

#### BUGHUNT-RESET-007: SessionStorage for Sensitive Data
**Severity:** MEDIUM
**Files:**
- `ForgotPasswordPage.tsx` line 85
- `ResetPasswordPage.tsx` line 140

**Description:** Email stored in sessionStorage is accessible via JavaScript and visible in DevTools.

**Action:** Use React state or encrypted URL params instead

---

### Low Priority

#### BUGHUNT-RESET-008: Interface Instead of Zod
**Severity:** LOW
**File:** `/apps/web/reset-password/src/components/PasswordStrengthIndicator.tsx`
**Line:** 3

**Description:** Uses TypeScript interface instead of Zod schema.

**Action:** Convert to Zod schema

---

#### BUGHUNT-RESET-009: Error Type is any
**Severity:** LOW
**File:** `/apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx`
**Line:** 190

**Description:** `err: any` - error type is too permissive.

**Action:** Add proper error type

---

---

## App: lego-moc-instructions-app (DEPRECATED)

### Status: DEPRECATED - REMOVE OR ARCHIVE

#### BUGHUNT-LEGACY-001: App is Deprecated
**Severity:** LOW (Informational)
**Directory:** `/apps/web/lego-moc-instructions-app/`

**Description:**
App was removed in commit `cc98a8a3` (Nov 27, 2025). Only infrastructure files remain. All functionality migrated to main-app shell architecture.

**Action:** Remove directory entirely or move infrastructure to dedicated location

---

#### BUGHUNT-LEGACY-002: Outdated GitHub Workflow References
**Severity:** LOW
**Files:**
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/ci.yml`
- `.github/README.md`
- `README.md`

**Description:** Still reference deprecated lego-moc-instructions-app.

**Action:** Update workflows and documentation

---

---

## Cross-App Issues

### BUGHUNT-CROSS-001: use-module-auth Duplicated 6x
**Severity:** HIGH
**Apps:** dashboard, inspiration, instructions, sets, wishlist, user-settings

**Description:** Identical stub hook duplicated across 6 apps with TODO comments. All return hardcoded auth values.

**Action:** Create `@repo/auth-hooks` package with real implementation (see REPACK plan)

---

### BUGHUNT-CROSS-002: Console Usage Instead of Logger
**Severity:** MEDIUM
**Multiple Apps**

**Description:** Various apps use `console.log/error` instead of `@repo/logger`.

**Action:** Replace all console usage with logger

---

### BUGHUNT-CROSS-003: Interface Usage Instead of Zod
**Severity:** MEDIUM
**Multiple Apps**

**Description:** 100+ TypeScript interfaces should be Zod schemas per CLAUDE.md.

**Action:** Gradually convert to Zod schemas

---

---

## Priority Order

### Immediate (Blocks Core Functionality)
1. BUGHUNT-MAIN-001: Presigned URL API (main-app upload broken)
2. BUGHUNT-INST-001: Presigned URL API (instructions upload broken)
3. BUGHUNT-MAIN-002: Edit save functionality
4. BUGHUNT-INST-003: Edit save functionality
5. BUGHUNT-SETS-001: Delete API implementation
6. BUGHUNT-SETS-002: Edit page missing

### High Priority (Quality/Security)
7. BUGHUNT-CROSS-001: Shared auth hook
8. BUGHUNT-MAIN-004: Fix skipped tests
9. BUGHUNT-RESET-001: E2E tests for password reset
10. BUGHUNT-DASH-001 through 005: Fix test/implementation mismatches

### Medium Priority (Test Coverage)
11. Add tests for 50+ untested components
12. Fix console usage across apps
13. Implement rate limiting UI

### Low Priority (Code Quality)
14. Convert interfaces to Zod schemas
15. Remove deprecated app
16. Fix hardcoded values

---

## Timeline Estimate

| Priority | Items | Estimate |
|----------|-------|----------|
| Immediate | 6 | 2 weeks |
| High | 4 | 1 week |
| Medium | 50+ | 3 weeks |
| Low | 20+ | 2 weeks |
| **Total** | **80+** | **8 weeks** |

---

## Related Plans

- See [PLAN.md](./repackag-app/PLAN.md) for code consolidation that addresses some cross-app issues
- Many auth-related bugs will be resolved by REPACK-301 (@repo/auth-hooks)
- Many test gaps will be easier to fill after consolidation reduces duplication

---

---

# Manual Testing Guide

This section provides structured test scripts to systematically walk through each application and identify bugs, UX issues, and missing functionality not caught by automated analysis.

## Getting Started

### Environment Setup

```bash
# Start the full dev environment
pnpm dev

# Or start individual apps
cd apps/web/main-app && pnpm dev        # http://localhost:5173
cd apps/web/app-dashboard && pnpm dev   # http://localhost:5174
cd apps/web/app-wishlist-gallery && pnpm dev  # http://localhost:5175
cd apps/web/app-sets-gallery && pnpm dev      # http://localhost:5176
cd apps/web/app-instructions-gallery && pnpm dev  # http://localhost:5177
cd apps/web/app-inspiration-gallery && pnpm dev   # http://localhost:5178
```

### Browser Setup

1. **Open DevTools** (F12) before testing
2. **Enable Preserve Log** in Network tab
3. **Enable "Pause on exceptions"** in Sources tab
4. **Install React DevTools** extension
5. **Install axe DevTools** for accessibility testing

### Test Accounts

Prepare these test scenarios:
- [ ] Unauthenticated user (incognito mode)
- [ ] Authenticated user (regular permissions)
- [ ] Admin user (if available)
- [ ] User with no data (fresh account)
- [ ] User with lots of data (pagination testing)

---

## Issue Report Template

When you find an issue, document it using this template:

```markdown
### BUGHUNT-[APP]-[NUMBER]: [Short Description]
**Severity:** CRITICAL | HIGH | MEDIUM | LOW
**Type:** Bug | UX | A11y | Performance | Security | Missing Feature
**App:** [app name]
**URL:** [page URL where issue occurs]
**Browser:** Chrome/Firefox/Safari [version]

**Steps to Reproduce:**
1. Navigate to...
2. Click on...
3. Enter...
4. Observe...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshot/Video:** [attach if helpful]

**Console Errors:** [paste any errors]

**Notes:** [additional context]
```

---

## Test Script: main-app

### 1. Landing Page & Navigation

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 1.1 | Load homepage | Page loads without console errors | | |
| 1.2 | Check hero section | All text renders, no broken images | | |
| 1.3 | Click all nav links | Each link works, no 404s | | |
| 1.4 | Resize to mobile | Nav collapses to hamburger menu | | |
| 1.5 | Open mobile menu | Menu opens, all links visible | | |
| 1.6 | Tab through nav | Focus visible, logical order | | |
| 1.7 | Check footer links | All links work | | |

### 2. Authentication Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 2.1 | Click "Sign In" | Login form appears | | |
| 2.2 | Submit empty form | Validation errors show | | |
| 2.3 | Enter invalid email | Email validation error | | |
| 2.4 | Enter wrong password | Error message (not revealing) | | |
| 2.5 | Tab through form | Focus order correct | | |
| 2.6 | Check password visibility toggle | Toggle shows/hides password | | |
| 2.7 | Sign in successfully | Redirects to dashboard | | |
| 2.8 | Refresh page | Session persists | | |
| 2.9 | Click "Sign Out" | Redirects to home, session cleared | | |

### 3. Sign Up Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 3.1 | Navigate to signup | Form loads | | |
| 3.2 | Submit empty form | Validation errors | | |
| 3.3 | Enter weak password | Password strength indicator updates | | |
| 3.4 | Enter strong password | Indicator shows strong | | |
| 3.5 | Check password requirements | Requirements list visible | | |
| 3.6 | Enter mismatched passwords | Error shows | | |
| 3.7 | Complete valid signup | Verification email sent message | | |

### 4. Forgot/Reset Password

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 4.1 | Click "Forgot Password" | Form loads | | |
| 4.2 | Enter unregistered email | Generic message (no user enumeration) | | |
| 4.3 | Enter registered email | Success message | | |
| 4.4 | Navigate to reset page | OTP input visible | | |
| 4.5 | Enter invalid code | Error message | | |
| 4.6 | Click "Resend Code" multiple times | Rate limiting kicks in? | | |
| 4.7 | Complete valid reset | Success, can log in with new password | | |

### 5. Dashboard (Authenticated)

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 5.1 | Load dashboard | Stats load, no errors | | |
| 5.2 | Check empty state | If no data, helpful message shown | | |
| 5.3 | Check loading states | Skeletons appear while loading | | |
| 5.4 | Verify stats accuracy | Numbers match actual data | | |
| 5.5 | Click quick actions | Each action navigates correctly | | |
| 5.6 | Check recent items | Items load, clickable | | |

### 6. Instructions Upload Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 6.1 | Navigate to /instructions/new | Upload form loads | | |
| 6.2 | Try without auth | Redirects to login? | | |
| 6.3 | Upload invalid file type | Error message | | |
| 6.4 | Upload file > size limit | Error message | | |
| 6.5 | Upload valid PDF | Progress shows, completes | | |
| 6.6 | Upload multiple files | All show in list | | |
| 6.7 | Cancel an upload | Upload stops, removed from list | | |
| 6.8 | Remove a file | File removed from list | | |
| 6.9 | Fill metadata form | All fields work | | |
| 6.10 | Submit without required fields | Validation errors | | |
| 6.11 | Submit valid form | Success, redirects to detail page | | |
| 6.12 | Refresh during upload | Session persists? Or lost? | | |
| 6.13 | Close tab during upload | Warning dialog? | | |

### 7. Keyboard Navigation (A11y)

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 7.1 | Tab through entire page | All interactive elements reachable | | |
| 7.2 | Check focus visibility | Focus ring visible on all elements | | |
| 7.3 | Check skip links | "Skip to content" link present | | |
| 7.4 | Navigate modals | Focus trapped inside modal | | |
| 7.5 | Close modal with Escape | Modal closes | | |
| 7.6 | Check button activation | Space/Enter activates buttons | | |
| 7.7 | Check link activation | Enter activates links | | |

---

## Test Script: app-wishlist-gallery

### 1. Gallery View

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 1.1 | Load gallery | Items display in grid | | |
| 1.2 | Check empty state | Helpful message if no items | | |
| 1.3 | Toggle grid/table view | View switches correctly | | |
| 1.4 | Check responsive layout | Grid adjusts at breakpoints | | |
| 1.5 | Scroll down | More items load (if paginated) | | |
| 1.6 | Check image loading | Images load, placeholders show first | | |
| 1.7 | Check broken images | Fallback shown for broken URLs | | |

### 2. Add Item Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 2.1 | Click "Add Item" | Form opens | | |
| 2.2 | Submit empty form | Validation errors | | |
| 2.3 | Enter title only | Minimum required works | | |
| 2.4 | Add very long title | Truncates or scrolls properly | | |
| 2.5 | Enter negative price | Validation error | | |
| 2.6 | Enter negative piece count | Validation error | | |
| 2.7 | Upload HEIC image | Converts and uploads | | |
| 2.8 | Upload very large image | Compresses before upload | | |
| 2.9 | Cancel upload mid-way | Upload cancels cleanly | | |
| 2.10 | Add many tags | Tag limit enforced | | |
| 2.11 | Submit valid form | Item appears in gallery | | |

### 3. Drag and Drop Reordering

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 3.1 | Drag item to new position | Item moves, animation smooth | | |
| 3.2 | Drop item | Order saved | | |
| 3.3 | Check undo toast | Toast appears with Undo button | | |
| 3.4 | Click Undo | Order reverts | | |
| 3.5 | Wait for undo timeout | Toast disappears after 5s | | |
| 3.6 | Drag in table view | Works or disabled appropriately | | |
| 3.7 | Refresh after reorder | New order persisted | | |
| 3.8 | Drag with keyboard | Arrow keys work? Or alternative? | | |

### 4. Item Actions

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 4.1 | Click item card | Detail view or action? | | |
| 4.2 | Click "Got It" button | Item marked as purchased | | |
| 4.3 | Click "Delete" button | Confirmation dialog appears | | |
| 4.4 | Confirm delete | Item removed from gallery | | |
| 4.5 | Cancel delete | Item remains | | |
| 4.6 | Check priority stars | Can update priority | | |

### 5. Filtering and Sorting

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 5.1 | Search by title | Results filter correctly | | |
| 5.2 | Search with no results | "No results" message | | |
| 5.3 | Clear search | All items return | | |
| 5.4 | Sort by price | Order changes correctly | | |
| 5.5 | Sort by priority | Order changes correctly | | |
| 5.6 | Sort by date added | Order changes correctly | | |
| 5.7 | Combine search + sort | Both work together | | |

---

## Test Script: app-sets-gallery

### 1. Gallery View

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 1.1 | Load gallery | Sets display in grid | | |
| 1.2 | Check set card info | Set number, name, piece count visible | | |
| 1.3 | Check theme badges | Theme displays correctly | | |
| 1.4 | Check "Built" status | Status badge shows correctly | | |
| 1.5 | Toggle grid/table view | View switches | | |
| 1.6 | Filter by theme | Only matching sets show | | |
| 1.7 | Filter by build status | Built/Unbuilt filter works | | |

### 2. Add Set Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 2.1 | Click "Add Set" | Form opens | | |
| 2.2 | Enter set number | Lookup works (if implemented) | | |
| 2.3 | Enter title | Title field works | | |
| 2.4 | Select theme | Theme dropdown works | | |
| 2.5 | Upload images | Multiple images upload | | |
| 2.6 | Reorder images | Drag to reorder works | | |
| 2.7 | Set primary image | First image becomes thumbnail | | |
| 2.8 | Submit form | Set appears in gallery | | |

### 3. Set Detail Page

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 3.1 | Click set card | Detail page opens | | |
| 3.2 | Check all info displays | Name, number, theme, pieces, etc. | | |
| 3.3 | View image gallery | All images visible | | |
| 3.4 | Click image thumbnail | Lightbox opens | | |
| 3.5 | Navigate lightbox | Next/prev works | | |
| 3.6 | Close lightbox | Closes with X or Escape | | |
| 3.7 | Click Edit | Edit page opens (or should) | | |
| 3.8 | Click Delete | Confirmation dialog | | |
| 3.9 | Confirm delete | Set removed, redirects | | |

### 4. Edit Set Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 4.1 | Navigate to edit page | Form pre-filled with data | | |
| 4.2 | Modify title | Field updates | | |
| 4.3 | Change theme | Dropdown works | | |
| 4.4 | Add new images | Images upload | | |
| 4.5 | Remove existing image | Image removed | | |
| 4.6 | Save changes | Updates saved, redirects | | |
| 4.7 | Cancel edit | Changes discarded | | |

---

## Test Script: app-instructions-gallery

### 1. Gallery View

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 1.1 | Load gallery | Instructions display | | |
| 1.2 | Check card info | Title, piece count, theme | | |
| 1.3 | Check favorite button | Heart icon visible | | |
| 1.4 | Toggle favorite | Heart fills/unfills | | |
| 1.5 | Filter by theme | Results filter | | |
| 1.6 | Search by title | Results filter | | |

### 2. Upload Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 2.1 | Navigate to upload page | Multi-step form loads | | |
| 2.2 | Upload PDF file | File accepts, progress shows | | |
| 2.3 | Upload non-PDF | Error message | | |
| 2.4 | Upload thumbnail | Image accepts | | |
| 2.5 | Fill metadata | All fields work | | |
| 2.6 | Skip optional fields | Can proceed | | |
| 2.7 | Add tags | Tag input works | | |
| 2.8 | Generate slug | Auto-generated from title | | |
| 2.9 | Check slug availability | Shows available/taken | | |
| 2.10 | Submit form | Finalizes, redirects | | |

### 3. Detail Page

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 3.1 | Click instruction card | Detail page opens | | |
| 3.2 | View metadata | All info displays | | |
| 3.3 | Download PDF | File downloads | | |
| 3.4 | View PDF inline | Viewer works (if implemented) | | |
| 3.5 | Click Edit | Edit form opens | | |
| 3.6 | Modify fields | Changes save | | |

### 4. Session Persistence

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 4.1 | Start upload | Begin multi-step flow | | |
| 4.2 | Refresh page | Session restored? | | |
| 4.3 | Close and reopen tab | Session restored? | | |
| 4.4 | Clear and restart | Old session cleared | | |

---

## Test Script: app-inspiration-gallery

### 1. Inspiration Gallery

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 1.1 | Load gallery | Images display in grid | | |
| 1.2 | Check masonry layout | Variable heights work | | |
| 1.3 | Hover on card | Overlay with actions appears | | |
| 1.4 | Click card | Opens detail or selects | | |
| 1.5 | Check source link | External link works | | |

### 2. Album Management

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 2.1 | Switch to Albums tab | Albums display | | |
| 2.2 | Create new album | Dialog opens, saves | | |
| 2.3 | Open album | Shows album contents | | |
| 2.4 | Add inspiration to album | Item added | | |
| 2.5 | Remove from album | Item removed | | |
| 2.6 | Delete album | Confirmation, deletes | | |
| 2.7 | Rename album | Name updates | | |

### 3. Upload Flow

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 3.1 | Click Upload | Dialog opens | | |
| 3.2 | Drag image to dropzone | File accepts | | |
| 3.3 | Add title | Title field works | | |
| 3.4 | Add source URL | URL validates | | |
| 3.5 | Add tags | Tags work | | |
| 3.6 | Submit | Image appears in gallery | | |

### 4. Selection Mode

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 4.1 | Enter selection mode | Checkboxes appear | | |
| 4.2 | Select multiple items | Count updates | | |
| 4.3 | Select all | All items selected | | |
| 4.4 | Bulk add to album | Dialog opens, works | | |
| 4.5 | Bulk delete | Confirmation, deletes all | | |
| 4.6 | Exit selection mode | Checkboxes hide | | |

### 5. Drag and Drop

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 5.1 | Drag inspiration card | Card moves | | |
| 5.2 | Drop to reorder | Order saves | | |
| 5.3 | Drag album card | Album moves | | |
| 5.4 | Check undo | Undo reverts order | | |

---

## Test Script: app-dashboard

### 1. Dashboard Load

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 1.1 | Load dashboard | All widgets load | | |
| 1.2 | Check stats cards | Numbers display | | |
| 1.3 | Check charts | Charts render | | |
| 1.4 | Check recent activity | Activity items show | | |
| 1.5 | Check quick actions | Buttons work | | |

### 2. Empty State

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 2.1 | Load with no data | Empty state message | | |
| 2.2 | Check CTA buttons | Direct to add content | | |

### 3. Filter Bar

| Step | Action | What to Check | Pass/Fail | Notes |
|------|--------|---------------|-----------|-------|
| 3.1 | Search | Results filter | | |
| 3.2 | Filter by theme | Results filter | | |
| 3.3 | Clear filters | All results return | | |

---

## Cross-Browser Testing

Test critical flows in each browser:

| Flow | Chrome | Firefox | Safari | Edge | Mobile Safari | Mobile Chrome |
|------|--------|---------|--------|------|---------------|---------------|
| Sign In | | | | | | |
| Sign Up | | | | | | |
| Upload File | | | | | | |
| Drag & Drop | | | | | | |
| Image Compression | | | | | | |
| Gallery Navigation | | | | | | |

---

## Performance Testing

### Network Throttling

1. Open DevTools > Network tab
2. Select "Slow 3G" preset
3. Test each app's loading behavior

| App | Initial Load | Image Load | API Response | Notes |
|-----|--------------|------------|--------------|-------|
| main-app | | | | |
| wishlist | | | | |
| sets | | | | |
| instructions | | | | |
| inspiration | | | | |
| dashboard | | | | |

### Memory Leaks

1. Open DevTools > Memory tab
2. Take heap snapshot
3. Perform actions (open/close modals, navigate, upload)
4. Take another snapshot
5. Compare for leaks

---

## Accessibility Testing

### Screen Reader Testing

Use VoiceOver (Mac) or NVDA (Windows):

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Page title announced | | |
| Headings navigable (H key) | | |
| Form labels read correctly | | |
| Buttons announce purpose | | |
| Images have alt text | | |
| Errors announced | | |
| Modals announced | | |
| Toasts announced | | |

### Color Contrast

Use axe DevTools or Lighthouse:

| Page | Contrast Issues | Notes |
|------|-----------------|-------|
| Homepage | | |
| Login | | |
| Gallery | | |
| Forms | | |

---

## Security Testing Checklist

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Unauthenticated can't access protected routes | | |
| Session expires after inactivity | | |
| Password reset doesn't reveal user existence | | |
| Rate limiting on login attempts | | |
| Rate limiting on password reset | | |
| File upload validates type on server | | |
| File upload validates size on server | | |
| XSS in form inputs prevented | | |
| CSRF tokens present | | |
| Sensitive data not in localStorage | | |

---

## Issue Tracking

### Found Issues Log

Keep a running log of issues found during manual testing:

| ID | Severity | App | Description | Status |
|----|----------|-----|-------------|--------|
| | | | | |
| | | | | |
| | | | | |

### Session Notes

After each testing session, note:
- Date/Time:
- Tester:
- Apps Tested:
- Browser/Device:
- Issues Found:
- Areas Needing More Testing:

---

## Quick Reference: Common Bug Patterns

When testing, look for these common issues:

### UI/UX
- [ ] Loading states missing or too short
- [ ] Error states don't explain how to recover
- [ ] Success messages unclear
- [ ] Empty states unhelpful
- [ ] Form doesn't clear after submission
- [ ] Unsaved changes lost without warning
- [ ] Back button breaks flow
- [ ] Refresh loses state unexpectedly

### Forms
- [ ] Validation only on submit (should be on blur)
- [ ] Required field indicator missing
- [ ] Error messages not next to field
- [ ] Can submit while already submitting
- [ ] No loading indicator on submit

### Images
- [ ] No placeholder while loading
- [ ] Broken image shows nothing
- [ ] Large images not optimized
- [ ] HEIC files not handled

### Navigation
- [ ] Deep link doesn't work
- [ ] Browser back breaks app
- [ ] Active state wrong
- [ ] 404 page missing

### Data
- [ ] Stale data after update
- [ ] Optimistic update doesn't rollback on error
- [ ] Pagination starts at wrong page
- [ ] Sort/filter resets unexpectedly

### Mobile
- [ ] Touch targets too small (<44px)
- [ ] Horizontal scroll on narrow screens
- [ ] Keyboard covers inputs
- [ ] Pinch zoom disabled

### Accessibility
- [ ] Focus not visible
- [ ] Focus order illogical
- [ ] Modal doesn't trap focus
- [ ] Escape doesn't close modal
- [ ] Missing ARIA labels
- [ ] Color only conveys meaning
