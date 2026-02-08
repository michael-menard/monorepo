---
generated: "2026-02-05"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: INST-1100

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline file exists; proceeded with codebase scanning

### Relevant Existing Features
| Feature | Location | Status |
|---------|----------|--------|
| Instructions backend API | `apps/api/lego-api/domains/instructions/routes.ts` | EXISTS - has GET /mocs endpoint |
| Instructions Gallery frontend | `apps/web/app-instructions-gallery/src/pages/main-page.tsx` | EXISTS - already uses useGetInstructionsQuery |
| MOC Instructions schema | `apps/api/lego-api/domains/instructions/types.ts` | EXISTS - comprehensive Zod schemas |
| Database seed data | `packages/backend/database-schema/src/seeds/mocs.ts` | EXISTS - sample MOC data |
| Gallery components library | `packages/core/gallery` | EXISTS - GalleryGrid, GalleryEmptyState, etc. |

### Active In-Progress Work
| Story | Status | Overlap Risk |
|-------|--------|--------------|
| INST-1008 | ready-to-work | BLOCKS this story - RTK mutations not wired |

### Constraints to Respect
- Must follow existing `/mocs` API route pattern (already implemented)
- Must use @repo/gallery components (established pattern from wishlist-gallery)
- Must use Zod schemas for all types (no interfaces)
- Frontend must use RTK Query from @repo/api-client
- Testing: Vitest for unit/integration, Playwright for E2E

---

## Retrieved Context

### Related Endpoints
- `GET /mocs` - Already exists in `apps/api/lego-api/domains/instructions/routes.ts`
  - Returns paginated list with filters: search, type, status, theme
  - Uses `instructionsService.listMocs(userId, {page, limit}, filters)`

### Related Components
- `apps/web/app-instructions-gallery/src/pages/main-page.tsx` - Already uses `useGetInstructionsQuery`
- `apps/web/app-instructions-gallery/src/components/InstructionCard` - Existing card component
- `@repo/gallery` - Shared gallery components (GalleryGrid, GalleryEmptyState, GalleryFilterBar, etc.)

### Reuse Candidates
- **RTK Query pattern**: `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`
  - Pattern: useGetWishlistQuery with cache tags, transformResponse with Zod
  - Pattern: providesTags for cache invalidation
  - Pattern: getServerlessCacheConfig for performance
- **Gallery layout**: `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
  - Pattern: GalleryGrid + GalleryEmptyState + responsive design
  - Pattern: View toggle (grid/datatable), filter bar, pagination
  - Pattern: Loading skeletons via GallerySkeleton
- **Card component**: Existing `InstructionCard` in app-instructions-gallery
- **Database schema**: `MocInstructionsSchema` in types.ts already comprehensive

---

## Knowledge Context

### Lessons Learned
No lessons loaded (KB not queried in this seed generation).

### Blockers to Avoid
- **API path mismatch**: Ensure frontend calls match backend route exactly
- **Schema misalignment**: Use the exact MocInstructionsSchema from types.ts
- **Missing RTK mutations**: Story blocked by INST-1008 - wire mutations before full implementation

### Architecture Decisions (ADRs)
Not loaded in this seed generation.

### Patterns to Follow
- **Zod-first types**: All schemas defined with Zod, types inferred with z.infer<>
- **RTK Query caching**: Use providesTags and cache config
- **Gallery components**: Reuse @repo/gallery for layout consistency
- **Testing**: Unit (Vitest + RTL), Integration (Vitest + MSW), E2E (Playwright)

### Patterns to Avoid
- Do NOT use TypeScript interfaces - use Zod schemas
- Do NOT create barrel files (index.ts re-exports)
- Do NOT use console.log - use @repo/logger

---

## Conflict Analysis

### Conflict: Dependency Blocker
- **Severity**: warning
- **Description**: INST-1100 depends on INST-1008 (Wire RTK Query Mutations) which is status: ready-to-work (not completed)
- **Resolution Hint**: Story can be created and detailed, but implementation should wait for INST-1008 completion. The useGetMocsQuery hook needs to be wired in @repo/api-client/rtk/mocs-api.ts (or similar file) before this story can be implemented.

---

## Story Seed

### Title
View MOC Gallery

### Description

**Context**: The instructions gallery frontend app already exists with a main-page.tsx that uses `useGetInstructionsQuery`. The backend already has a `GET /mocs` endpoint in the instructions domain that returns paginated MOC lists with filtering. However, the RTK Query hooks in @repo/api-client for MOC operations are not yet wired (INST-1008).

**Problem**: Users cannot easily browse their MOC collection in a gallery view because the frontend-backend integration is incomplete and the gallery page needs refinement to match the established patterns from wishlist-gallery.

**Solution**: Enhance the existing main-page.tsx to create a polished gallery view with:
- Grid layout using @repo/gallery components (GalleryGrid, GalleryEmptyState, GalleryFilterBar)
- MOC cards displaying thumbnail, title, piece count, theme
- Empty state with "Create your first MOC" CTA
- Loading skeletons during data fetch
- Responsive design (1 col mobile, 2 col tablet, 3-4 col desktop)
- Integration with the existing `GET /mocs` API endpoint

### Initial Acceptance Criteria
- [ ] AC-1: Gallery page at `/mocs` displays all user's MOCs in a responsive grid
- [ ] AC-2: Each MOC card shows thumbnail, title, piece count, and theme
- [ ] AC-3: Empty state displays when user has no MOCs, with "Create your first MOC" CTA button
- [ ] AC-4: Loading skeleton states show while fetching data
- [ ] AC-5: Grid is responsive: 1 column on mobile, 2 on tablet, 3-4 on desktop
- [ ] AC-6: Gallery uses existing `GET /mocs` backend endpoint with query params (sort, limit, offset)
- [ ] AC-7: MOC list response includes thumbnail URLs from either `moc_files` or `mocs.thumbnailUrl`

### Non-Goals
- Creating new MOCs (deferred to INST-1102)
- Editing or deleting MOCs (deferred to INST-1108, INST-1109)
- File upload functionality (deferred to INST-1103, INST-1104)
- Advanced filtering or search (deferred to Phase 6)
- Pagination (deferred - simple limit/offset sufficient for MVP)

### Reuse Plan
- **Components**:
  - @repo/gallery: GalleryGrid, GalleryEmptyState, GalleryFilterBar, GallerySkeleton, GalleryViewToggle
  - Existing InstructionCard from app-instructions-gallery
- **Patterns**:
  - RTK Query pattern from wishlist-gallery-api.ts (useGetWishlistQuery)
  - Gallery layout from wishlist-gallery main-page.tsx
  - Responsive grid with view mode toggle
- **Packages**:
  - @repo/api-client for RTK Query hooks (once INST-1008 completes)
  - @repo/logger for logging
  - @repo/app-component-library for buttons and UI primitives

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on testing the gallery display logic (grid rendering, empty state, loading states)
- Integration tests should mock the GET /mocs endpoint with MSW
- E2E tests should verify responsive layout at different breakpoints
- Ensure existing InstructionCard component tests are sufficient

### For UI/UX Advisor
- Review consistency with wishlist-gallery design patterns
- Ensure empty state CTA is clear and actionable
- Verify loading skeleton matches existing gallery patterns
- Consider accessibility for grid navigation and card interactions

### For Dev Feasibility
- Verify the existing `GET /mocs` endpoint returns the data shape expected by the frontend
- Confirm RTK Query hooks will be available from INST-1008
- Check if InstructionCard component needs any updates for the gallery context
- Identify any schema misalignment between backend MocInstructionsSchema and frontend needs
