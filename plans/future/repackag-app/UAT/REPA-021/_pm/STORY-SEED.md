---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-021

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for this feature epic. Proceeding with codebase scanning only.

### Relevant Existing Features

**DashboardSkeleton Component Locations:**
- `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/components/Dashboard/DashboardSkeleton.tsx` (67 lines)
- `/Users/michaelmenard/Development/monorepo/apps/web/app-dashboard/src/components/DashboardSkeleton.tsx` (67 lines)
- Both implementations are **identical** (byte-for-byte duplicates)

**EmptyDashboard Component Locations:**
- `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/components/Dashboard/EmptyDashboard.tsx` (74 lines)
- `/Users/michaelmenard/Development/monorepo/apps/web/app-dashboard/src/components/EmptyDashboard.tsx` (74 lines)
- Both implementations are **identical** (byte-for-byte duplicates)

**Existing Skeleton Components in @repo/app-component-library:**
- `/Users/michaelmenard/Development/monorepo/packages/core/app-component-library/src/feedback/skeleton.tsx` (405 lines)
- Already exports: `Skeleton`, `CardSkeleton`, `AvatarSkeleton`, `TextSkeleton`, `TableSkeleton`, `ListSkeleton`, `FormSkeleton`, `MocCardSkeleton`, `MocCardCompactSkeleton`, `GalleryGridSkeleton`
- Well-structured with variants and proper TypeScript types

**Existing Test Coverage:**
- `apps/web/main-app/src/components/Dashboard/__tests__/DashboardSkeleton.test.tsx` (50 lines)
- `apps/web/app-dashboard/src/components/__tests__/DashboardSkeleton.test.tsx` (50 lines)
- `apps/web/main-app/src/components/Dashboard/__tests__/EmptyDashboard.test.tsx` (exists)
- `apps/web/app-dashboard/src/components/__tests__/EmptyDashboard.test.tsx` (exists)
- All tests are identical duplicates

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| REPA-012 | In Progress | Low - focuses on auth hooks |
| REPA-013 | In Progress | Low - focuses on auth utils |

No conflicts detected - these stories operate on different packages and file sets.

### Constraints to Respect

1. **Component Architecture**: App component library follows a clear structure:
   - `_primitives/` = raw shadcn/Radix wrappers
   - Feature folders (e.g., `feedback/`) = app-level variations
   - DashboardSkeleton and EmptyDashboard are app-level components, so they belong in feature folders

2. **Import Guidelines**: All imports from @repo/app-component-library should use barrel exports via `index.ts`

3. **Zod-First Types**: Must use Zod schemas with `z.infer<>` for all type definitions (per CLAUDE.md)

4. **No Barrel Files**: Components should be imported directly, not through re-exporting index files

---

## Retrieved Context

### Related Endpoints
None - this is purely a frontend component consolidation story.

### Related Components

**Components to Consolidate:**
1. `DashboardSkeleton` - Loading state skeleton for dashboard layout
   - Used in: main-app, app-dashboard
   - Internal primitive: Custom `Skeleton` component (simple wrapper around `cn` utility)
   - Dependencies: `@repo/app-component-library` (cn utility)

2. `EmptyDashboard` - Empty state when user has no MOCs
   - Used in: main-app, app-dashboard
   - Dependencies: `@tanstack/react-router` (Link), `@repo/app-component-library` (Button), `lucide-react` (icons)

**Existing Library Components:**
- `packages/core/app-component-library/src/feedback/skeleton.tsx` already provides comprehensive skeleton utilities
- The library's `Skeleton` primitive is more sophisticated than the app-level duplicates (supports variants)

**Usage Patterns:**
- `app-dashboard/src/pages/main-page.tsx` imports `EmptyDashboard` and uses it conditionally when `isEmpty === true`
- Both apps export these components through their component barrel files (`components/index.ts`)

### Reuse Candidates

1. **Base Skeleton Component**: The library's existing `Skeleton` primitive can replace the custom inline `Skeleton` in `DashboardSkeleton`
2. **Layout Pattern**: `DashboardSkeleton` should become a specialized preset in the feedback module, similar to `MocCardSkeleton` and `GalleryGridSkeleton`
3. **Empty State Pattern**: Consider whether `EmptyDashboard` should be:
   - A generic `EmptyState` component with props for icon, title, description, CTA
   - Or a dashboard-specific component in a new `feedback/empty-states.tsx` module

---

## Knowledge Context

### Lessons Learned
No lessons loaded - ADR-LOG.md is the only knowledge source consulted for this story.

### Blockers to Avoid (from past stories)
N/A - No lesson-learned data available for this epic yet.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-006 | E2E Tests Required in Dev Phase | E2E tests must be written during dev phase, using real services (no MSW mocking) |

**Relevant ADR Details:**
- **ADR-006**: This story must include E2E tests if it has UI-facing acceptance criteria. Since we're moving components to a shared library, we should verify they render correctly in at least one consuming app (e.g., app-dashboard main page).

### Patterns to Follow

1. **Skeleton Component Pattern** (from existing library code):
   - Export both base component and specialized presets
   - Use `React.forwardRef` for ref forwarding
   - Include displayName for debugging
   - Use `cn()` utility for className merging
   - Support variants via class-variance-authority

2. **Component Directory Structure** (from CLAUDE.md):
   ```
   MyComponent/
     index.tsx
     __tests__/
       MyComponent.test.tsx
     __types__/
       index.ts  # Zod schemas
   ```

3. **Export Pattern** (from app-component-library index.ts):
   - Export components individually from feature modules
   - Re-export from main index.ts with types
   - No barrel files in subdirectories

### Patterns to Avoid

1. **Custom Skeleton Wrappers**: Don't create inline Skeleton components when the library provides a better primitive
2. **App-Specific Empty States**: Avoid hardcoding app-specific content in shared components - use props for customization
3. **Duplicate Tests**: Don't keep test files in app-level components after moving to library

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Standardize Card Skeletons and Empty States in Shared Library

### Description

**Context:**
The `DashboardSkeleton` and `EmptyDashboard` components exist as identical duplicates in both `main-app` and `app-dashboard`. Each implementation is 67 lines and 74 lines respectively, totaling 282 lines of duplicate code across 4 files (plus 4 duplicate test files). The app-component-library already provides a comprehensive skeleton system in `feedback/skeleton.tsx` with 10 different skeleton variants, but these dashboard-specific components are not leveraging it.

**Problem:**
1. Duplicate code increases maintenance burden - any changes must be applied in two places
2. The duplicated `Skeleton` primitive inside `DashboardSkeleton` is less sophisticated than the library's version (no variant support)
3. `EmptyDashboard` hardcodes dashboard-specific messaging, making it non-reusable
4. No single source of truth for empty states across the application
5. Tests are also duplicated, increasing CI/CD time

**Proposed Solution:**
1. Move `DashboardSkeleton` to `@repo/app-component-library/src/feedback/skeleton.tsx` as a new export (`DashboardSkeleton`)
2. Refactor it to use the library's `Skeleton` primitive instead of the custom inline version
3. Create a generic `EmptyState` component in `@repo/app-component-library/src/feedback/empty-states.tsx`
4. Create a specialized `EmptyDashboard` preset that uses the generic `EmptyState` with dashboard-specific props
5. Update both apps to import from the shared library
6. Delete duplicate implementations and tests from both apps
7. Add consolidated tests to the library package

### Initial Acceptance Criteria

- [ ] AC-1: `DashboardSkeleton` component added to `@repo/app-component-library/src/feedback/skeleton.tsx`
  - Uses library's `Skeleton` primitive instead of custom implementation
  - Exported from `feedback/skeleton.tsx` alongside other skeleton components
  - Maintains exact same visual appearance as original implementation

- [ ] AC-2: Generic `EmptyState` component created in `@repo/app-component-library/src/feedback/empty-states.tsx`
  - Accepts props: `icon`, `title`, `description`, `action` (optional CTA with label and onClick/href)
  - Supports both button and link actions
  - Follows library's styling patterns (uses `cn` utility, proper spacing)

- [ ] AC-3: `EmptyDashboard` preset created in `feedback/empty-states.tsx`
  - Wraps `EmptyState` with dashboard-specific props
  - Includes feature highlights grid (4 features: Organize MOCs, Gallery View, Wishlist, Instructions)
  - Accepts optional `onAddClick` handler or `addLink` prop for CTA customization

- [ ] AC-4: Both components exported from `@repo/app-component-library/src/index.ts`
  - Follows existing export pattern in index.ts
  - Types exported alongside components
  - Props schemas defined using Zod

- [ ] AC-5: `main-app` updated to import from shared library
  - `components/Dashboard/DashboardSkeleton.tsx` deleted
  - `components/Dashboard/EmptyDashboard.tsx` deleted
  - `components/Dashboard/index.ts` updated to re-export from `@repo/app-component-library`
  - All tests moved to library package and local test files deleted

- [ ] AC-6: `app-dashboard` updated to import from shared library
  - `components/DashboardSkeleton.tsx` deleted
  - `components/EmptyDashboard.tsx` deleted
  - `components/index.ts` updated to import from `@repo/app-component-library`
  - All tests moved to library package and local test files deleted

- [ ] AC-7: Test coverage migrated to library
  - Consolidated tests in `@repo/app-component-library/src/feedback/__tests__/DashboardSkeleton.test.tsx`
  - Consolidated tests in `@repo/app-component-library/src/feedback/__tests__/empty-states.test.tsx`
  - Tests cover both `EmptyState` and `EmptyDashboard` preset
  - All original test assertions preserved

- [ ] AC-8: E2E test added to verify components render correctly
  - Use `app-dashboard` as test target (simpler than main-app)
  - Verify `DashboardSkeleton` appears during loading state
  - Verify `EmptyDashboard` appears when no MOCs exist
  - Use real services (no MSW) per ADR-006

- [ ] AC-9: Documentation updated
  - Add Storybook stories for `DashboardSkeleton` in `__stories__/skeleton.stories.tsx`
  - Add Storybook stories for `EmptyState` and `EmptyDashboard` in new `__stories__/empty-states.stories.tsx`
  - Include usage examples showing customization options

### Non-Goals

- Creating a generic page skeleton system beyond dashboard-specific needs
- Refactoring other skeleton components in the library (out of scope)
- Creating empty states for other features (wishlist, gallery, etc.) - only dashboard empty state
- Modifying the visual design of either component
- Adding new features or functionality to the components
- Changing how the components are used in the consuming apps (same API surface)

### Reuse Plan

**Components:**
- Base `Skeleton` component from `@repo/app-component-library/src/feedback/skeleton.tsx`
- `Button` component from `@repo/app-component-library`
- Icon components from `lucide-react` (existing pattern in library)

**Patterns:**
- Component structure pattern from existing `MocCardSkeleton` (lines 220-262 in skeleton.tsx)
- Export pattern from `index.ts` (lines 68-82 for skeleton exports)
- Zod schema pattern from other library components (e.g., `AppCounterCardPropsSchema`)

**Packages:**
- `@repo/app-component-library` - target package for consolidation
- `@tanstack/react-router` - for Link support in EmptyDashboard
- `lucide-react` - for icon support (already a library dependency)
- `class-variance-authority` - for variants (if needed for EmptyState)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Focus:**
1. **Visual Regression**: Since we're consolidating identical components, verify the library versions render pixel-perfect matches to the originals
2. **Prop API Compatibility**: Ensure `EmptyState` component is flexible enough to support future empty state variations
3. **Import Path Changes**: Verify all consuming apps correctly import from new location without broken imports
4. **Storybook Validation**: Use Storybook to compare before/after visually

**E2E Test Strategy:**
- Use `app-dashboard` as primary E2E target (simpler page structure than main-app)
- Test loading state (shows `DashboardSkeleton`) → loaded state transition
- Test empty state (shows `EmptyDashboard` when totalMocs === 0)
- Use real backend (per ADR-006) to verify data-driven state transitions

### For UI/UX Advisor

**Design Consistency:**
1. Ensure `EmptyState` follows the library's design system (spacing, typography, colors)
2. Verify icon sizes and placements match existing patterns (see `MocCardSkeleton` for reference)
3. Consider accessibility: screen reader announcements for loading states, proper focus management for CTA buttons
4. Ensure `DashboardSkeleton` faithfully reproduces the original layout (3 stat cards, 5 MOC card skeletons, header, quick actions)

**Customization Surface:**
- `EmptyState` should support optional feature highlights grid (for dashboard use case)
- CTA should support both routing (Link) and actions (Button with onClick)
- Consider whether title/description should support ReactNode for rich text, or just string

### For Dev Feasibility

**Implementation Strategy:**
1. **Phase 1**: Add components to library (no deletion yet)
   - Create `EmptyState` component first (foundation)
   - Create `EmptyDashboard` preset wrapping `EmptyState`
   - Add `DashboardSkeleton` to `skeleton.tsx`
   - Export from `index.ts`
   - Add Zod schemas

2. **Phase 2**: Add tests and Storybook stories to library
   - Migrate test assertions to library package
   - Create Storybook stories for visual validation

3. **Phase 3**: Update consuming apps (parallel)
   - Update `main-app` to import from library
   - Update `app-dashboard` to import from library
   - Run E2E tests to verify no regressions

4. **Phase 4**: Clean up duplicates
   - Delete old component files from both apps
   - Delete old test files from both apps
   - Update component index.ts barrel files

**Risk Mitigation:**
- Keep original implementations until library versions are verified in both apps
- Use feature flag if concerned about production risk (probably overkill for this)
- Ensure Turbo/pnpm rebuilds library before running app tests

**Dependencies:**
- No external API changes needed
- No database schema changes
- No infrastructure changes
- Just pure frontend component refactoring

---

**STORY-SEED COMPLETE**
