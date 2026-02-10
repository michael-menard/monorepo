# Code Reuse & Package Consolidation Plan

## Overview

This plan addresses code duplication and missed reuse opportunities across the monorepo. The audit identified **~10,800 lines of duplicate code across 50+ files** that can be consolidated into shared packages.

**Created:** 2026-02-08
**Status:** Planning
**Epic:** REPACK

---

## Goals

1. Eliminate duplicate code across web apps
2. Consolidate upload infrastructure into unified package
3. Enhance `@repo/gallery` to prevent custom reimplementations
4. Standardize card components with shared base patterns
5. Create shared hook packages for common functionality
6. Improve developer experience with clear package boundaries

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Duplicate files | 50+ | < 5 |
| Duplicate lines | ~10,800 | < 500 |
| Apps with custom gallery | 2 | 0 |
| Apps with custom upload | 4 | 0 (use @repo/upload) |
| Shared hook packages | 1 | 4 |

---

## Phase 1: Upload Consolidation (Critical)

**Goal:** Create unified `@repo/upload` package consolidating all upload infrastructure

### REPACK-101: Create @repo/upload Package Structure

**Priority:** P0 - Critical
**Estimate:** 3 story points
**Dependencies:** None

**Description:**
Create the new `@repo/upload` package with proper structure to house all upload-related code.

**Tasks:**
- [ ] Create `packages/core/upload/` directory structure
- [ ] Set up `package.json` with dependencies from existing upload packages
- [ ] Configure TypeScript, ESLint, Vitest
- [ ] Create barrel exports in `index.ts`
- [ ] Add package to workspace

**Package Structure:**
```
packages/core/upload/
├── src/
│   ├── client/           # XHR upload functions
│   ├── hooks/            # React hooks
│   ├── image/            # Image processing
│   ├── components/       # Upload UI components
│   ├── types/            # Zod schemas
│   └── index.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Acceptance Criteria:**
- [ ] Package builds without errors
- [ ] Package is importable from other workspace packages
- [ ] Tests pass

---

### REPACK-102: Migrate Upload Client Functions

**Priority:** P0 - Critical
**Estimate:** 2 story points
**Dependencies:** REPACK-101

**Description:**
Consolidate XHR upload client code from `@repo/upload-client` and app-level implementations.

**Files to Consolidate:**
- `packages/core/upload-client/src/xhr.ts` → keep as base
- `apps/web/main-app/src/services/api/uploadClient.ts` → merge unique features
- `apps/web/main-app/src/services/api/finalizeClient.ts` → move to package
- `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts` → DELETE (duplicate)

**Tasks:**
- [ ] Move `@repo/upload-client` contents to `@repo/upload/client`
- [ ] Add `finalizeClient` functions to `@repo/upload/client/finalize.ts`
- [ ] Update exports
- [ ] Update all imports in main-app
- [ ] Update all imports in app-instructions-gallery
- [ ] Delete duplicate files
- [ ] Deprecate old `@repo/upload-client` package

**Acceptance Criteria:**
- [ ] `finalizeClient.ts` exists only in `@repo/upload`
- [ ] All apps import from `@repo/upload`
- [ ] No duplicate upload client code in apps
- [ ] All tests pass

---

### REPACK-103: Migrate Upload Hooks

**Priority:** P0 - Critical
**Estimate:** 3 story points
**Dependencies:** REPACK-102

**Description:**
Consolidate duplicate upload hooks into `@repo/upload/hooks`.

**Files to Consolidate:**

| Source File | Target | Notes |
|-------------|--------|-------|
| `main-app/src/hooks/useUploadManager.ts` | `@repo/upload/hooks/useUploadManager.ts` | Primary implementation |
| `app-instructions-gallery/src/hooks/useUploadManager.ts` | DELETE | Exact duplicate |
| `main-app/src/hooks/useUploaderSession.ts` | `@repo/upload/hooks/useUploaderSession.ts` | Has user auth handling |
| `app-instructions-gallery/src/hooks/useUploaderSession.ts` | DELETE | Near duplicate (merge anon handling) |

**Tasks:**
- [ ] Create `@repo/upload/hooks/useUploadManager.ts`
- [ ] Create `@repo/upload/hooks/useUploaderSession.ts` (merge both versions)
- [ ] Support both authenticated and anonymous sessions
- [ ] Update main-app imports
- [ ] Update app-instructions-gallery imports
- [ ] Delete duplicate files
- [ ] Add tests for hooks

**Acceptance Criteria:**
- [ ] Single `useUploadManager` implementation
- [ ] Single `useUploaderSession` implementation with auth flag
- [ ] All apps use shared hooks
- [ ] Tests cover both auth and anon scenarios

---

### REPACK-104: Migrate Image Processing

**Priority:** P1 - High
**Estimate:** 2 story points
**Dependencies:** REPACK-101

**Description:**
Extract image compression and HEIC conversion from wishlist into shared package.

**Files to Consolidate:**
- `app-wishlist-gallery/src/utils/imageCompression.ts` → `@repo/upload/image/compression.ts`
- `app-wishlist-gallery/src/hooks/useS3Upload.ts` → `@repo/upload/hooks/useS3Upload.ts`

**Tasks:**
- [ ] Create `@repo/upload/image/compression.ts` with compression utilities
- [ ] Create `@repo/upload/image/heic.ts` with HEIC conversion
- [ ] Create `@repo/upload/image/presets.ts` with compression presets
- [ ] Move `useS3Upload` hook to package
- [ ] Update wishlist imports
- [ ] Add browser-image-compression and heic2any as dependencies
- [ ] Add tests

**Acceptance Criteria:**
- [ ] Image compression available via `@repo/upload`
- [ ] HEIC conversion available via `@repo/upload`
- [ ] Wishlist uses shared implementation
- [ ] Other apps can use image processing

---

### REPACK-105: Migrate Upload Components

**Priority:** P1 - High
**Estimate:** 3 story points
**Dependencies:** REPACK-103, REPACK-104

**Description:**
Extract reusable upload UI components into shared package.

**Files to Consolidate:**

| Component | Source | Notes |
|-----------|--------|-------|
| `ThumbnailUpload` | app-instructions-gallery | Image upload with preview |
| `InstructionsUpload` | app-instructions-gallery | PDF file upload |
| `ImageUploadZone` | app-sets-gallery | Multi-image zone |
| `Uploader/*` (7 components) | main-app & app-instructions-gallery | Session UI, errors, conflicts |

**Uploader Sub-components (duplicated in main-app & app-instructions-gallery):**
- `ConflictModal` (195 lines) - EXACT DUPLICATE
- `RateLimitBanner` (143 lines) - EXACT DUPLICATE
- `SessionExpiredBanner` (70 lines) - EXACT DUPLICATE
- `UnsavedChangesDialog` (95 lines) - EXACT DUPLICATE
- `UploaderFileItem` (234 lines) - EXACT DUPLICATE
- `UploaderList` (151 lines) - EXACT DUPLICATE
- `SessionProvider` (81 lines) - Minor diff

**Tasks:**
- [ ] Create `@repo/upload/components/` directory
- [ ] Move Uploader sub-components (dedupe)
- [ ] Move ThumbnailUpload component
- [ ] Move InstructionsUpload component
- [ ] Move ImageUploadZone component
- [ ] Update all app imports
- [ ] Delete duplicate files
- [ ] Add Storybook stories

**Acceptance Criteria:**
- [ ] All upload components in `@repo/upload`
- [ ] No duplicate upload components in apps
- [ ] Components are documented
- [ ] All tests pass

---

### REPACK-106: Migrate Upload Types

**Priority:** P1 - High
**Estimate:** 1 story point
**Dependencies:** REPACK-101

**Description:**
Consolidate upload types and delete deprecated wrappers.

**Files to Consolidate:**
- `@repo/upload-types` → merge into `@repo/upload/types`
- `main-app/src/types/uploader-upload.ts` → DELETE (just re-exports)
- `main-app/src/types/uploader-session.ts` → DELETE (just re-exports)

**Tasks:**
- [ ] Move `@repo/upload-types` schemas to `@repo/upload/types`
- [ ] Delete deprecated wrapper files
- [ ] Update all imports
- [ ] Deprecate `@repo/upload-types` package

**Acceptance Criteria:**
- [ ] Single source of truth for upload types
- [ ] No deprecated wrapper files
- [ ] All apps import from `@repo/upload`

---

## Phase 2: Gallery Enhancement

**Goal:** Enhance `@repo/gallery` to eliminate custom reimplementations

### REPACK-201: Add SortableGallery Component

**Priority:** P1 - High
**Estimate:** 5 story points
**Dependencies:** None

**Description:**
Add drag-and-drop gallery support to `@repo/gallery` to eliminate custom implementations in wishlist and inspiration apps.

**Current Custom Implementations:**
- `app-wishlist-gallery/src/components/DraggableWishlistGallery/` (~500 LOC)
- `app-inspiration-gallery/src/components/DraggableInspirationGallery/` (~500 LOC)

**Tasks:**
- [ ] Create `SortableGallery` component using dnd-kit
- [ ] Support `onReorder(oldIndex, newIndex)` callback
- [ ] Add undo/redo flow with configurable toast duration
- [ ] Add optimistic update pattern
- [ ] Support both grid and list layouts
- [ ] Add keyboard reordering support
- [ ] Add accessibility (roving tabindex, announcements)
- [ ] Create `SortableGalleryItem` wrapper component
- [ ] Add `DragOverlay` support with custom preview
- [ ] Add tests

**API Design:**
```typescript
<SortableGallery
  items={items}
  onReorder={(oldIndex, newIndex) => void}
  renderItem={(item, index) => ReactNode}
  enableUndo={true}
  undoDuration={5000}
  undoMessage="Order updated"
  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap={6}
/>
```

**Acceptance Criteria:**
- [ ] `SortableGallery` supports drag-drop reordering
- [ ] Undo toast appears after reorder
- [ ] Keyboard navigation works
- [ ] Screen reader announcements work
- [ ] Tests cover all features

---

### REPACK-202: Add Gallery Keyboard Hooks

**Priority:** P1 - High
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Extract and standardize keyboard navigation hooks for galleries.

**Files to Consolidate:**
- `app-wishlist-gallery/src/hooks/useRovingTabIndex.ts`
- `app-inspiration-gallery/src/hooks/useRovingTabIndex.ts` (duplicate)
- `app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts`
- `app-inspiration-gallery/src/hooks/useGalleryKeyboard.ts`
- `app-wishlist-gallery/src/hooks/useAnnouncer.tsx`
- `app-inspiration-gallery/src/hooks/useAnnouncer.tsx` (duplicate)

**Tasks:**
- [ ] Move `useRovingTabIndex` to `@repo/gallery/hooks`
- [ ] Move `useAnnouncer` to `@repo/accessibility`
- [ ] Create `useGalleryKeyboard` combining best of both implementations
- [ ] Create `useGallerySelection` for multi-select mode
- [ ] Update all app imports
- [ ] Delete duplicate files
- [ ] Add tests

**Acceptance Criteria:**
- [ ] Single `useRovingTabIndex` in `@repo/gallery`
- [ ] Single `useAnnouncer` in `@repo/accessibility`
- [ ] Keyboard shortcuts are configurable
- [ ] All gallery apps use shared hooks

---

### REPACK-203: Enhance GalleryCard with Selection & Drag

**Priority:** P2 - Medium
**Estimate:** 3 story points
**Dependencies:** REPACK-201

**Description:**
Enhance `GalleryCard` to support selection mode and drag handles natively.

**Tasks:**
- [ ] Add `selectable` prop for selection mode
- [ ] Add `selected` and `onSelect` props
- [ ] Add `selectionPosition` prop ('top-left' | 'top-right')
- [ ] Add `draggable` prop for drag mode
- [ ] Add `dragHandlePosition` prop
- [ ] Add `hoverOverlay` prop for custom overlays
- [ ] Update all domain cards to use new props
- [ ] Add tests

**Enhanced API:**
```typescript
<GalleryCard
  // Existing props...

  // Selection
  selectable={true}
  selected={isSelected}
  onSelect={(selected) => void}
  selectionPosition="top-left"

  // Drag
  draggable={true}
  dragHandlePosition="left"

  // Overlay
  hoverOverlay={<CustomOverlay />}
/>
```

**Acceptance Criteria:**
- [ ] `GalleryCard` supports selection mode
- [ ] `GalleryCard` supports drag handles
- [ ] InspirationCard and AlbumCard simplified to use GalleryCard
- [ ] All tests pass

---

### REPACK-204: Refactor app-inspiration-gallery to Use @repo/gallery

**Priority:** P2 - Medium
**Estimate:** 5 story points
**Dependencies:** REPACK-201, REPACK-202, REPACK-203

**Description:**
Refactor inspiration gallery to use `@repo/gallery` instead of custom components.

**Current Custom Components to Replace:**
- `DraggableInspirationGallery` → `SortableGallery`
- `InspirationCard` → `GalleryCard` with selection
- `SortableInspirationCard` → `SortableGalleryItem`
- `AlbumCard` → `GalleryCard` with stacked effect
- `GalleryLoadingSkeleton` → `GallerySkeleton`
- Custom keyboard handling → `useGalleryKeyboard`

**Tasks:**
- [ ] Add `@repo/gallery` as dependency
- [ ] Replace `DraggableInspirationGallery` with `SortableGallery`
- [ ] Refactor `InspirationCard` to wrap `GalleryCard`
- [ ] Refactor `AlbumCard` to wrap `GalleryCard`
- [ ] Use shared keyboard hooks
- [ ] Use shared loading skeletons
- [ ] Delete redundant components
- [ ] Update tests

**Acceptance Criteria:**
- [ ] app-inspiration-gallery uses `@repo/gallery`
- [ ] Custom gallery components deleted
- [ ] Feature parity maintained
- [ ] All tests pass

---

### REPACK-205: Standardize GalleryFilterBar Across Apps

**Priority:** P3 - Low
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Make `GalleryFilterBar` extensible to support app-specific filters.

**Current Issue:**
- app-sets-gallery has custom `GalleryFilterBar` for build status filter
- Should use shared component with extension points

**Tasks:**
- [ ] Add `customFilters` slot to `GalleryFilterBar`
- [ ] Create `BuildStatusFilter` component for sets
- [ ] Refactor sets gallery to use shared `GalleryFilterBar`
- [ ] Delete custom filter bar
- [ ] Add tests

**Acceptance Criteria:**
- [ ] `GalleryFilterBar` supports custom filter slots
- [ ] Sets gallery uses shared component
- [ ] Custom filter bar deleted

---

## Phase 3: Hook Consolidation

**Goal:** Create shared hook packages for common functionality

### REPACK-301: Create @repo/auth-hooks Package

**Priority:** P1 - High
**Estimate:** 3 story points
**Dependencies:** None

**Description:**
Create shared authentication hooks package.

**Files to Consolidate:**

| Hook | Current Locations | Notes |
|------|-------------------|-------|
| `useModuleAuth` | 6 apps (identical stubs) | Implement properly |
| `usePermissions` | main-app only | Move to package |
| `useTokenRefresh` | main-app only | Move to package |

**Tasks:**
- [ ] Create `packages/core/auth-hooks/` package
- [ ] Implement `useModuleAuth` properly (not stubs)
- [ ] Move `usePermissions` from main-app
- [ ] Move `useTokenRefresh` from main-app
- [ ] Update all app imports
- [ ] Delete duplicate stub files (6 apps)
- [ ] Add tests

**Package Structure:**
```
packages/core/auth-hooks/
├── src/
│   ├── useModuleAuth.ts
│   ├── usePermissions.ts
│   ├── useTokenRefresh.ts
│   └── index.ts
└── package.json
```

**Acceptance Criteria:**
- [ ] `useModuleAuth` is a real implementation, not stubs
- [ ] All 6 apps use shared package
- [ ] No duplicate auth hooks in apps

---

### REPACK-302: Create @repo/auth-utils Package

**Priority:** P1 - High
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Create shared authentication utilities package.

**Files to Consolidate:**
- `main-app/src/lib/jwt.ts` (122 lines)
- `main-app/src/lib/route-guards.ts` (346 lines)

**Tasks:**
- [ ] Create `packages/core/auth-utils/` package
- [ ] Move JWT utilities
- [ ] Move route guard utilities
- [ ] Update main-app imports
- [ ] Make available to other apps
- [ ] Add tests

**Acceptance Criteria:**
- [ ] JWT utilities in shared package
- [ ] Route guards in shared package
- [ ] Other apps can use these utilities

---

### REPACK-303: Create @repo/hooks Package

**Priority:** P2 - Medium
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Create general-purpose hooks package.

**Files to Consolidate:**
- `app-wishlist-gallery/src/hooks/useLocalStorage.ts`
- `app-instructions-gallery/src/hooks/useLocalStorage.ts` (duplicate)
- `main-app/src/hooks/useUnsavedChangesPrompt.ts`
- `app-instructions-gallery/src/hooks/useUnsavedChangesPrompt.ts` (duplicate)
- `main-app/src/hooks/useDelayedShow.ts`
- `app-inspiration-gallery/src/hooks/useMultiSelect.ts`

**Tasks:**
- [ ] Create `packages/core/hooks/` package
- [ ] Move `useLocalStorage` (dedupe)
- [ ] Move `useUnsavedChangesPrompt` (dedupe)
- [ ] Move `useDelayedShow`
- [ ] Move `useMultiSelect`
- [ ] Update all app imports
- [ ] Delete duplicates
- [ ] Add tests

**Acceptance Criteria:**
- [ ] Single source for each hook
- [ ] No duplicate hooks in apps
- [ ] All hooks tested

---

### REPACK-304: Enhance @repo/accessibility

**Priority:** P2 - Medium
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Move accessibility hooks to `@repo/accessibility` package.

**Files to Consolidate:**
- `app-wishlist-gallery/src/hooks/useAnnouncer.tsx`
- `app-inspiration-gallery/src/hooks/useAnnouncer.tsx` (duplicate)
- `app-wishlist-gallery/src/utils/a11y.ts`

**Tasks:**
- [ ] Add `useAnnouncer` to `@repo/accessibility`
- [ ] Add ARIA label generators from a11y.ts
- [ ] Update app imports
- [ ] Delete duplicates
- [ ] Add tests

**Acceptance Criteria:**
- [ ] `useAnnouncer` in `@repo/accessibility`
- [ ] ARIA utilities in shared package
- [ ] No duplicate a11y code in apps

---

## Phase 4: Type & Schema Consolidation

**Goal:** Eliminate duplicate type definitions

### REPACK-401: Create @repo/moc-schemas Package

**Priority:** P1 - High
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Consolidate MOC-related Zod schemas.

**Files to Consolidate:**
- `main-app/src/types/moc-form.ts` (328 lines)
- `app-instructions-gallery/src/types/moc-form.ts` (328 lines) - EXACT DUPLICATE

**Tasks:**
- [ ] Create `packages/core/moc-schemas/` package
- [ ] Move `moc-form.ts` schemas
- [ ] Update main-app imports
- [ ] Update app-instructions-gallery imports
- [ ] Delete duplicate file
- [ ] Add tests

**Acceptance Criteria:**
- [ ] Single `moc-form.ts` in shared package
- [ ] Both apps use shared schemas
- [ ] No duplicate type files

---

### REPACK-402: Consolidate Component-Level Schemas

**Priority:** P3 - Low
**Estimate:** 1 story point
**Dependencies:** REPACK-105

**Description:**
Move duplicate component schemas to shared locations.

**Files to Consolidate:**
- `ThumbnailUpload/__types__/FileValidationResultSchema`
- `InstructionsUpload/__types__/FileValidationResultSchema` (duplicate)

**Tasks:**
- [ ] Move `FileValidationResultSchema` to `@repo/upload/types`
- [ ] Update component imports
- [ ] Delete duplicate

**Acceptance Criteria:**
- [ ] No duplicate schemas in component `__types__` directories

---

## Phase 5: Service Consolidation

**Goal:** Consolidate service layer code

### REPACK-501: Create @repo/auth-services Package

**Priority:** P2 - Medium
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Create shared authentication services package.

**Files to Consolidate:**
- `main-app/src/services/auth/sessionService.ts` (162 lines)

**Tasks:**
- [ ] Create `packages/core/auth-services/` package
- [ ] Move session service
- [ ] Update main-app imports
- [ ] Make available to other apps
- [ ] Add tests

**Acceptance Criteria:**
- [ ] Session service in shared package
- [ ] Other apps can use session management

---

### REPACK-502: Add Error Mapping to @repo/api-client

**Priority:** P2 - Medium
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Move error handling utilities to `@repo/api-client`.

**Files to Consolidate:**
- `main-app/src/services/api/errorMapping.ts` (~200 lines)
- `main-app/src/services/api/authFailureHandler.ts` (~150 lines)

**Tasks:**
- [ ] Add `errorMapping` to `@repo/api-client`
- [ ] Add `authFailureHandler` to `@repo/api-client`
- [ ] Update main-app imports
- [ ] Make available to other apps
- [ ] Add tests

**Acceptance Criteria:**
- [ ] Error mapping in `@repo/api-client`
- [ ] Auth failure handling in `@repo/api-client`
- [ ] Consistent error handling across apps

---

## Phase 6: Card Standardization

**Goal:** Standardize card components

### REPACK-601: Create Domain Card Factories

**Priority:** P3 - Low
**Estimate:** 3 story points
**Dependencies:** REPACK-203

**Description:**
Create factory functions for domain-specific cards.

**Tasks:**
- [ ] Create `createInstructionCard` factory in `@repo/gallery`
- [ ] Create `createSetCard` factory
- [ ] Create `createWishlistCard` factory
- [ ] Create `createInspirationCard` factory
- [ ] Document card customization patterns
- [ ] Add Storybook examples

**Acceptance Criteria:**
- [ ] Consistent card creation pattern
- [ ] Cards documented in Storybook
- [ ] Easy to create new domain cards

---

### REPACK-602: Standardize Card Skeletons

**Priority:** P3 - Low
**Estimate:** 1 story point
**Dependencies:** None

**Description:**
Consolidate skeleton loading components.

**Files to Consolidate:**
- `main-app/src/components/Dashboard/DashboardSkeleton.tsx`
- `app-dashboard/src/components/DashboardSkeleton.tsx` (duplicate)
- `main-app/src/components/Dashboard/EmptyDashboard.tsx`
- `app-dashboard/src/components/EmptyDashboard.tsx` (duplicate)

**Tasks:**
- [ ] Move `DashboardSkeleton` to `@repo/app-component-library`
- [ ] Move `EmptyDashboard` to `@repo/app-component-library`
- [ ] Update both apps
- [ ] Delete duplicates

**Acceptance Criteria:**
- [ ] Single `DashboardSkeleton` in shared library
- [ ] Single `EmptyDashboard` in shared library

---

## Summary

### New Packages to Create

| Package | Purpose | Phase |
|---------|---------|-------|
| `@repo/upload` | Unified upload infrastructure | 1 |
| `@repo/auth-hooks` | Authentication hooks | 3 |
| `@repo/auth-utils` | JWT, route guards | 3 |
| `@repo/auth-services` | Session management | 5 |
| `@repo/hooks` | General-purpose hooks | 3 |
| `@repo/moc-schemas` | MOC type definitions | 4 |

### Packages to Enhance

| Package | Additions | Phase |
|---------|-----------|-------|
| `@repo/gallery` | SortableGallery, keyboard hooks, card enhancements | 2 |
| `@repo/accessibility` | useAnnouncer, ARIA utilities | 3 |
| `@repo/api-client` | Error mapping, auth failure handler | 5 |
| `@repo/app-component-library` | DashboardSkeleton, EmptyDashboard | 6 |

### Packages to Deprecate

| Package | Replaced By | Phase |
|---------|-------------|-------|
| `@repo/upload-client` | `@repo/upload` | 1 |
| `@repo/upload-types` | `@repo/upload` | 1 |

### Files to Delete (Duplicates)

| File | Duplicate Of | Phase |
|------|--------------|-------|
| `app-instructions-gallery/.../finalizeClient.ts` | main-app version | 1 |
| `app-instructions-gallery/.../useUploadManager.ts` | main-app version | 1 |
| `app-instructions-gallery/.../useUploaderSession.ts` | main-app version | 1 |
| `main-app/.../uploader-upload.ts` | @repo/upload-types | 1 |
| `main-app/.../uploader-session.ts` | @repo/upload-types | 1 |
| `app-instructions-gallery/.../moc-form.ts` | main-app version | 4 |
| `app-inspiration-gallery/.../useRovingTabIndex.ts` | wishlist version | 2 |
| `app-inspiration-gallery/.../useAnnouncer.tsx` | wishlist version | 3 |
| `app-instructions-gallery/.../useLocalStorage.ts` | wishlist version | 3 |
| `app-instructions-gallery/.../useUnsavedChangesPrompt.ts` | main-app version | 3 |
| `app-dashboard/.../DashboardSkeleton.tsx` | main-app version | 6 |
| `app-dashboard/.../EmptyDashboard.tsx` | main-app version | 6 |
| 6x `use-module-auth.ts` | @repo/auth-hooks | 3 |

---

## Timeline Estimate

| Phase | Description | Estimate |
|-------|-------------|----------|
| Phase 1 | Upload Consolidation | 2 weeks |
| Phase 2 | Gallery Enhancement | 2 weeks |
| Phase 3 | Hook Consolidation | 1 week |
| Phase 4 | Type Consolidation | 0.5 weeks |
| Phase 5 | Service Consolidation | 0.5 weeks |
| Phase 6 | Card Standardization | 1 week |
| **Total** | | **7 weeks** |

---

## Risk Mitigation

1. **Breaking Changes:** Each phase includes comprehensive testing before merge
2. **Import Updates:** Use automated codemod scripts for bulk import changes
3. **Deprecation:** Keep deprecated packages for 1 release cycle with warnings
4. **Rollback:** Each story can be reverted independently

---

## Next Steps

1. Review and approve this plan
2. Create Jira epic and stories
3. Prioritize Phase 1 (Upload) as highest impact
4. Begin REPACK-101 implementation
