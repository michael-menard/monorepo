---
id: REPA-021
title: "Standardize Card Skeletons and Empty States in Shared Library"
status: ready-to-work
priority: P2
story_type: tech_debt
points: 3
epic: repackag-app
experiment_variant: control
created: 2026-02-10
updated_at: "2026-02-10T21:15:30Z"
depends_on: []
blocks: []
surfaces:
  - frontend
touches:
  backend: false
  frontend: true
  database: false
  infrastructure: false
predictions:
  split_risk: 0.2
  review_cycles: 2
  token_estimate: 120000
  confidence: medium
  similar_stories: []
  generated_at: "2026-02-10T21:15:00Z"
  model: haiku
  wkfl_version: "007-v1"
---

# REPA-021: Standardize Card Skeletons and Empty States in Shared Library

## Context

The `DashboardSkeleton` and `EmptyDashboard` components exist as identical duplicates in both `main-app` and `app-dashboard`. Each implementation is 67 lines and 74 lines respectively, totaling 282 lines of duplicate code across 4 files (plus 4 duplicate test files). The app-component-library already provides a comprehensive skeleton system in `feedback/skeleton.tsx` with 10 different skeleton variants, but these dashboard-specific components are not leveraging it.

### Current Reality

**Duplicate Component Locations:**
- DashboardSkeleton:
  - `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/components/Dashboard/DashboardSkeleton.tsx` (67 lines)
  - `/Users/michaelmenard/Development/monorepo/apps/web/app-dashboard/src/components/DashboardSkeleton.tsx` (67 lines)
  - Both implementations are byte-for-byte identical

- EmptyDashboard:
  - `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/components/Dashboard/EmptyDashboard.tsx` (74 lines)
  - `/Users/michaelmenard/Development/monorepo/apps/web/app-dashboard/src/components/EmptyDashboard.tsx` (74 lines)
  - Both implementations are byte-for-byte identical

**Existing Library Infrastructure:**
- `packages/core/app-component-library/src/feedback/skeleton.tsx` already exports comprehensive skeleton utilities: `Skeleton`, `CardSkeleton`, `AvatarSkeleton`, `TextSkeleton`, `TableSkeleton`, `ListSkeleton`, `FormSkeleton`, `MocCardSkeleton`, `MocCardCompactSkeleton`, `GalleryGridSkeleton`
- The library's `Skeleton` primitive is more sophisticated than the app-level duplicates (supports variants via class-variance-authority)
- Component architecture follows clear pattern: `_primitives/` for shadcn/Radix wrappers, feature folders for app-level variations

**Test Coverage:**
- `apps/web/main-app/src/components/Dashboard/__tests__/DashboardSkeleton.test.tsx` (50 lines)
- `apps/web/app-dashboard/src/components/__tests__/DashboardSkeleton.test.tsx` (50 lines)
- `apps/web/main-app/src/components/Dashboard/__tests__/EmptyDashboard.test.tsx`
- `apps/web/app-dashboard/src/components/__tests__/EmptyDashboard.test.tsx`
- All tests are identical duplicates

### Problem Statement

1. **Maintenance Burden**: Duplicate code increases maintenance burden - any changes must be applied in two places
2. **Suboptimal Implementation**: The duplicated `Skeleton` primitive inside `DashboardSkeleton` is less sophisticated than the library's version (no variant support)
3. **Non-Reusable Design**: `EmptyDashboard` hardcodes dashboard-specific messaging, making it non-reusable for other empty states
4. **No Single Source of Truth**: No centralized empty state pattern across the application
5. **Duplicate Testing**: Tests are also duplicated, increasing CI/CD time

### Active Work Context

No conflicting work detected:
- REPA-012 (In Progress): Focuses on auth hooks - Low overlap risk
- REPA-013 (In Progress): Focuses on auth utils - Low overlap risk

## Goal

Consolidate `DashboardSkeleton` and `EmptyDashboard` components into `@repo/app-component-library` as the single source of truth, eliminating 282 lines of duplicate code and establishing reusable patterns for skeleton loading states and empty states across the application.

## Non-Goals

- Creating a generic page skeleton system beyond dashboard-specific needs
- Refactoring other skeleton components in the library (out of scope)
- Creating empty states for other features (wishlist, gallery, etc.) - only dashboard empty state
- Modifying the visual design of either component
- Adding new features or functionality to the components
- Changing how the components are used in the consuming apps (same API surface)

### Protected Features (Do Not Modify)

- Existing skeleton components in library (`MocCardSkeleton`, `GalleryGridSkeleton`, etc.)
- Library's base `Skeleton` primitive implementation
- shadcn/Radix primitives in `_primitives/` folder
- Design token system and Tailwind configuration

## Scope

### Packages Modified

- **`@repo/app-component-library`**: Add `DashboardSkeleton`, `EmptyState`, and `EmptyDashboard` components
- **`apps/web/main-app`**: Update imports, delete duplicate components and tests
- **`apps/web/app-dashboard`**: Update imports, delete duplicate components and tests
- **`apps/web/playwright`**: Add E2E tests for skeleton and empty states

### Files Changed (Estimated)

**New Files (~7)**:
- `@repo/app-component-library/src/feedback/empty-states.tsx`
- `@repo/app-component-library/src/feedback/__tests__/empty-states.test.tsx`
- `@repo/app-component-library/src/__stories__/empty-states.stories.tsx`
- `apps/web/playwright/tests/dashboard-skeleton-empty.spec.ts`

**Modified Files (~8)**:
- `@repo/app-component-library/src/feedback/skeleton.tsx`
- `@repo/app-component-library/src/feedback/__tests__/skeleton.test.tsx`
- `@repo/app-component-library/src/__stories__/skeleton.stories.tsx`
- `@repo/app-component-library/src/index.ts`
- `apps/web/main-app/src/components/Dashboard/index.ts`
- `apps/web/app-dashboard/src/components/index.ts`
- `apps/web/main-app/package.json` (if dev dependencies needed)
- `apps/web/app-dashboard/package.json` (if dev dependencies needed)

**Deleted Files (~8)**:
- `apps/web/main-app/src/components/Dashboard/DashboardSkeleton.tsx`
- `apps/web/main-app/src/components/Dashboard/EmptyDashboard.tsx`
- `apps/web/main-app/src/components/Dashboard/__tests__/DashboardSkeleton.test.tsx`
- `apps/web/main-app/src/components/Dashboard/__tests__/EmptyDashboard.test.tsx`
- `apps/web/app-dashboard/src/components/DashboardSkeleton.tsx`
- `apps/web/app-dashboard/src/components/EmptyDashboard.tsx`
- `apps/web/app-dashboard/src/components/__tests__/DashboardSkeleton.test.tsx`
- `apps/web/app-dashboard/src/components/__tests__/EmptyDashboard.test.tsx`

### Endpoints Touched

None - purely frontend component consolidation.

### Database Changes

None required.

## Acceptance Criteria

### AC-1: DashboardSkeleton Component in Library

- [ ] `DashboardSkeleton` component added to `@repo/app-component-library/src/feedback/skeleton.tsx`
- [ ] Uses library's `Skeleton` primitive instead of custom implementation
- [ ] Exported from `feedback/skeleton.tsx` alongside other skeleton components
- [ ] Maintains exact same visual appearance as original implementation
- [ ] Includes Zod schema for props: `DashboardSkeletonPropsSchema`
- [ ] Follows React.forwardRef pattern with displayName for debugging
- [ ] Uses `cn()` utility for className merging
- [ ] Component structure matches existing patterns (see `MocCardSkeleton` lines 220-262)

**Definition of Done**:
- Component file contains `DashboardSkeleton` export
- Renders 3 stat card skeletons + 5 MOC card skeletons + header + quick actions
- TypeScript compilation passes
- Visual regression test shows <1% pixel difference from original

### AC-2: Generic EmptyState Component

- [ ] Generic `EmptyState` component created in `@repo/app-component-library/src/feedback/empty-states.tsx`
- [ ] Accepts props: `icon` (LucideIcon), `title` (string), `description` (string), `action` (optional CTA)
- [ ] Action prop supports both button (`onClick`) and link (`href`) variants
- [ ] **Action precedence rule**: If both `onClick` and `href` are provided, `href` takes precedence (Link rendered over Button)
- [ ] Optional `features` prop for feature highlights grid (used by dashboard preset)
- [ ] Follows library's styling patterns (uses `cn` utility, proper spacing with design tokens)
- [ ] Uses only design token colors (no hardcoded colors)
- [ ] Includes Zod schema: `EmptyStatePropsSchema`
- [ ] Implements accessibility requirements:
  - Icon has `aria-hidden="true"` (decorative)
  - Title and description are readable by screen readers
  - CTA button is keyboard-accessible

**Definition of Done**:
- Component accepts all required props and renders correctly
- Supports both routing (Link) and action (Button) CTAs
- `href` takes precedence when both `onClick` and `href` provided
- Features grid renders when `features` prop provided
- Passes accessibility tests (keyboard navigation, screen reader)

### AC-3: EmptyDashboard Preset

- [ ] `EmptyDashboard` preset created in `feedback/empty-states.tsx`
- [ ] Wraps `EmptyState` with dashboard-specific props:
  - Icon: PackagePlus from lucide-react
  - Title: "Your Dashboard is Empty"
  - Description: "Start building your LEGO MOC collection by adding your first instruction set."
  - Features: 4-item grid (Organize MOCs, Gallery View, Wishlist, Instructions)
- [ ] Accepts optional `onAddClick` handler or `addLink` prop for CTA customization
- [ ] CTA button text: "Add Your First MOC"
- [ ] Includes Zod schema: `EmptyDashboardPropsSchema`

**Definition of Done**:
- Preset renders with all dashboard-specific content
- CTA behavior customizable via props
- Visual match with original `EmptyDashboard` implementation

### AC-4: Library Package Exports

- [ ] Both components exported from `@repo/app-component-library/src/index.ts`
- [ ] Follows existing export pattern in index.ts (named exports, not barrel re-exports)
- [ ] Types exported alongside components:
  ```typescript
  export { DashboardSkeleton, type DashboardSkeletonProps } from './feedback/skeleton'
  export { EmptyState, EmptyDashboard, type EmptyStateProps, type EmptyDashboardProps } from './feedback/empty-states'
  ```
- [ ] Zod schemas exported for runtime validation:
  ```typescript
  export { DashboardSkeletonPropsSchema, EmptyStatePropsSchema, EmptyDashboardPropsSchema } from './feedback/...'
  ```

**Definition of Done**:
- TypeScript compilation passes in library package
- Exports resolve correctly in consuming apps
- `pnpm build` succeeds for library package

### AC-5: main-app Migration

- [ ] `components/Dashboard/DashboardSkeleton.tsx` deleted
- [ ] `components/Dashboard/EmptyDashboard.tsx` deleted
- [ ] `components/Dashboard/__tests__/DashboardSkeleton.test.tsx` deleted
- [ ] `components/Dashboard/__tests__/EmptyDashboard.test.tsx` deleted
- [ ] `components/Dashboard/index.ts` updated to re-export from library:
  ```typescript
  export { DashboardSkeleton, EmptyDashboard } from '@repo/app-component-library'
  ```
- [ ] All tests moved to library package (assertions preserved)
- [ ] Local dev build succeeds (`pnpm --filter main-app dev`)
- [ ] Production build succeeds (`pnpm --filter main-app build`)

**Definition of Done**:
- No old component files remain in main-app
- App runs without import errors
- Visual regression tests pass (dashboard looks identical)

### AC-6: app-dashboard Migration

- [ ] `components/DashboardSkeleton.tsx` deleted
- [ ] `components/EmptyDashboard.tsx` deleted
- [ ] `components/__tests__/DashboardSkeleton.test.tsx` deleted
- [ ] `components/__tests__/EmptyDashboard.test.tsx` deleted
- [ ] `components/index.ts` updated to import from library:
  ```typescript
  export { DashboardSkeleton, EmptyDashboard } from '@repo/app-component-library'
  ```
- [ ] All tests moved to library package (assertions preserved)
- [ ] Local dev build succeeds (`pnpm --filter app-dashboard dev`)
- [ ] Production build succeeds (`pnpm --filter app-dashboard build`)

**Definition of Done**:
- No old component files remain in app-dashboard
- App runs without import errors
- Visual regression tests pass (dashboard looks identical)

### AC-7: Test Coverage in Library

- [ ] Consolidated tests in `@repo/app-component-library/src/feedback/__tests__/DashboardSkeleton.test.tsx`
- [ ] Consolidated tests in `@repo/app-component-library/src/feedback/__tests__/empty-states.test.tsx`
- [ ] **Test consolidation strategy**: Merge duplicate tests from both apps into single test files, preserving all unique assertions and removing duplicates
- [ ] Tests cover both `EmptyState` and `EmptyDashboard` preset
- [ ] All original test assertions preserved
- [ ] New tests added:
  - `EmptyState` with `onClick` action renders Button
  - `EmptyState` with `href` action renders Link
  - `EmptyState` without action renders no CTA
  - `EmptyState` with both `onClick` and `href` renders Link (precedence test)
  - `EmptyDashboard` renders 4 feature highlights
  - `DashboardSkeleton` uses library's `Skeleton` primitive
- [ ] Coverage ≥80% for new components (line coverage measured via Vitest `--coverage.lines`)
- [ ] All tests pass: `pnpm --filter @repo/app-component-library test`

**Definition of Done**:
- Test files exist in library package
- All tests pass
- Coverage meets threshold
- No duplicate tests in consuming apps

### AC-8: E2E Test Verification

- [ ] E2E test added to verify components render correctly
- [ ] Use `app-dashboard` as test target (simpler page structure than main-app)
- [ ] Test file: `apps/web/playwright/tests/dashboard-skeleton-empty.spec.ts`
- [ ] Tests cover:
  - `DashboardSkeleton` appears during loading state
  - `DashboardSkeleton` disappears when data loads
  - `EmptyDashboard` appears when totalMocs === 0
  - `EmptyDashboard` CTA button is clickable
- [ ] Use real services (no MSW mocking per ADR-006)
- [ ] Test passes in CI: `pnpm --filter @repo/playwright test dashboard-skeleton-empty`

**Definition of Done**:
- E2E test file exists
- All test cases pass
- Screenshots/traces captured for evidence
- Tests use real backend data

### AC-9: Storybook Documentation

- [ ] Add Storybook stories for `DashboardSkeleton` in `__stories__/skeleton.stories.tsx`
- [ ] Add Storybook stories for `EmptyState` and `EmptyDashboard` in new `__stories__/empty-states.stories.tsx`
- [ ] Stories include:
  - `DashboardSkeleton` - Default story
  - `EmptyState` - Default story
  - `EmptyState` - With Button action
  - `EmptyState` - With Link action
  - `EmptyState` - Without action
  - `EmptyState` - With feature highlights
  - `EmptyDashboard` - Default preset
- [ ] Include usage examples showing customization options
- [ ] Storybook runs without errors: `pnpm --filter @repo/app-component-library storybook`

**Definition of Done**:
- Story files exist in library package
- All stories render correctly in Storybook
- Interactive controls work (if applicable)
- No console errors in Storybook

**NOTE**: If Storybook is not configured in `@repo/app-component-library`, this AC is non-blocking. Document stories as "pending Storybook setup" and defer to future work.

## Reuse Plan

### Components to Reuse

1. **Base `Skeleton` Component**
   - Source: `@repo/app-component-library/src/feedback/skeleton.tsx`
   - Usage: Replace custom inline `Skeleton` in `DashboardSkeleton`
   - Benefit: Leverages library's variant system and styling

2. **`Button` Component**
   - Source: `@repo/app-component-library/src/_primitives/button.tsx`
   - Usage: CTA button in `EmptyState` component
   - Benefit: Consistent button styling and accessibility

3. **Icon Components**
   - Source: `lucide-react` package (already a library dependency)
   - Usage: Icons for `EmptyState` and feature highlights
   - Pattern: Accept `LucideIcon` type for type safety

4. **Link Component**
   - Source: `@tanstack/react-router`
   - Usage: Routing CTA variant in `EmptyState`
   - Benefit: Consistent routing behavior

### Patterns to Follow

1. **Component Structure Pattern**
   - Reference: `MocCardSkeleton` (lines 220-262 in skeleton.tsx)
   - Pattern: Use `React.forwardRef`, include `displayName`, use `cn()` utility
   - Apply to: `DashboardSkeleton`, `EmptyState`, `EmptyDashboard`

2. **Export Pattern**
   - Reference: `index.ts` (lines 68-82 for skeleton exports)
   - Pattern: Named exports with types, Zod schemas exported separately
   - Apply to: All new components

3. **Zod Schema Pattern**
   - Reference: `AppCounterCardPropsSchema` in app-component-library
   - Pattern: Define schema first, infer TypeScript type with `z.infer<>`
   - Apply to: All component props

4. **Component Directory Structure**
   - Reference: CLAUDE.md guidelines
   - Pattern: Component file in feature folder, tests in `__tests__/`, types inline or in `__types__/`
   - Apply to: `empty-states.tsx` structure

### Packages Required

- **`@repo/app-component-library`**: Target package (already exists)
- **`@tanstack/react-router`**: For Link support (already a dependency)
- **`lucide-react`**: For icons (already a library dependency)
- **`class-variance-authority`**: For variants (already used in library)
- **`zod`**: For prop schemas (already in use per CLAUDE.md)

No new package installations required.

## Architecture Notes

### Component Architecture

**Library Structure**:
```
@repo/app-component-library/
├─ src/
│  ├─ _primitives/           # shadcn/Radix wrappers
│  │  └─ button.tsx          # Base Button primitive
│  ├─ feedback/              # App-level feedback components
│  │  ├─ skeleton.tsx        # Skeleton utilities (ADD: DashboardSkeleton)
│  │  ├─ empty-states.tsx    # NEW: EmptyState + EmptyDashboard
│  │  └─ __tests__/
│  │     ├─ skeleton.test.tsx       # UPDATE: Add DashboardSkeleton tests
│  │     └─ empty-states.test.tsx   # NEW: EmptyState/EmptyDashboard tests
│  ├─ __stories__/
│  │  ├─ skeleton.stories.tsx       # UPDATE: Add DashboardSkeleton story
│  │  └─ empty-states.stories.tsx   # NEW: EmptyState stories
│  └─ index.ts               # UPDATE: Export new components
```

**Import Strategy**:
- Consuming apps import via barrel export: `import { DashboardSkeleton, EmptyDashboard } from '@repo/app-component-library'`
- No direct imports from feature folders (no `@repo/app-component-library/feedback/skeleton`)
- Library components import primitives from `_primitives/` folder

### DashboardSkeleton Implementation

```typescript
// Refactored to use library's Skeleton primitive
import { Skeleton } from './skeleton' // Use library primitive, not custom inline version

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with title and actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* MOC grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}
```

### EmptyState Component Design

```typescript
// Generic empty state component with flexible CTA options
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  features,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4", className)}>
      <Icon className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground text-center mb-6 max-w-md">{description}</p>

      {features && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-2xl">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {action && (
        action.href ? (
          <Link to={action.href} className={buttonVariants()}>
            {action.label}
          </Link>
        ) : (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
```

### Type Definitions (Zod-First)

```typescript
import { z } from 'zod'
import type { LucideIcon } from 'lucide-react'

// DashboardSkeleton
const DashboardSkeletonPropsSchema = z.object({
  className: z.string().optional(),
})
type DashboardSkeletonProps = z.infer<typeof DashboardSkeletonPropsSchema>

// EmptyState
const EmptyStatePropsSchema = z.object({
  icon: z.custom<LucideIcon>(),
  title: z.string().min(1),
  description: z.string().min(1),
  action: z.object({
    label: z.string().min(1),
    onClick: z.function().optional(),
    href: z.string().optional(),
  }).optional(),
  features: z.array(z.object({
    icon: z.custom<LucideIcon>(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  className: z.string().optional(),
})
type EmptyStateProps = z.infer<typeof EmptyStatePropsSchema>

// EmptyDashboard
const EmptyDashboardPropsSchema = z.object({
  onAddClick: z.function().optional(),
  addLink: z.string().optional(),
  className: z.string().optional(),
})
type EmptyDashboardProps = z.infer<typeof EmptyDashboardPropsSchema>
```

### Migration Safety

**Phase 1: Add to Library (No Breaking Changes)**
- Add new components to library without touching consuming apps
- Library version bump: patch (e.g., 1.2.3 → 1.2.4)
- Apps continue using local versions

**Phase 2: Update Apps (Coordinated)**
- Update both apps in single PR or sequential PRs
- Keep old files until new imports verified
- Use feature flag if gradual rollout desired (probably overkill)

**Phase 3: Clean Up**
- Delete old files only after both apps verified working
- No rollback risk once deletions committed

## Infrastructure Notes

No infrastructure changes required. This is purely a frontend component refactoring.

## HTTP Contract Plan

Not applicable - no API changes.

## Seed Requirements

### Test Data

**Requirement**: Test account with zero MOCs for empty state testing

**Setup**:
```sql
-- Create or update test user to have no MOCs
DELETE FROM mocs WHERE user_id = 'test-user-empty-dashboard';
```

**Alternative**: Use test fixture in E2E tests to mock empty response (not preferred per ADR-006, but pragmatic if seed script not feasible)

### Storybook Configuration

**Requirement**: `@repo/app-component-library` must have Storybook configured

**Check**:
```bash
ls -la packages/core/app-component-library/.storybook/
```

**If Missing**:
- Option 1: Add basic Storybook config (estimated +2 hours, requires `@storybook/react` dependency)
- Option 2: Defer Storybook stories to future work (mark AC-9 as non-blocking)
- Option 3: Use consuming app's Storybook to demo components (workaround)

## Test Plan

See `_pm/TEST-PLAN.md` for complete test strategy.

### Summary

**Unit Tests (Vitest)**:
- Library package: `DashboardSkeleton`, `EmptyState`, `EmptyDashboard` component tests
- Coverage target: ≥80% for new components
- Run: `pnpm --filter @repo/app-component-library test`

**E2E Tests (Playwright)**:
- File: `apps/web/playwright/tests/dashboard-skeleton-empty.spec.ts`
- Scenarios:
  1. Loading state shows `DashboardSkeleton`
  2. Empty state shows `EmptyDashboard` when no MOCs
  3. CTA button is keyboard-accessible
- Run: `pnpm --filter @repo/playwright test dashboard-skeleton-empty`

**Visual Regression Tests**:
- Before/after screenshots of dashboard loading state
- Before/after screenshots of dashboard empty state
- Pixel diff threshold: <1%

**Storybook Validation** (if configured):
- All stories render without errors
- Interactive controls work
- Visual comparison with original implementations

## UI/UX Notes

See `_pm/UIUX-NOTES.md` for complete design guidance.

### Summary

**MVP-Critical Requirements**:
- Token-only colors (no hardcoded hex values)
- `_primitives` imports for shadcn components
- Loading state screen reader announcements (`aria-live="polite"`)
- CTA button keyboard accessibility
- Skeleton semantics (`aria-busy="true"`, `aria-label="Loading dashboard"`)

**Visual Consistency**:
- Pixel-perfect match with original implementations
- Design token usage (spacing, typography, colors)
- Icon sizes consistent with library patterns
- Responsive behavior preserved

**Accessibility Requirements**:
- Keyboard navigation to CTA button
- Screen reader announcements for loading/loaded states
- Icon decorations marked with `aria-hidden="true"`
- Focus indicators visible

## Dev Feasibility Notes

See `_pm/DEV-FEASIBILITY.md` for complete feasibility analysis.

### Summary

**Feasibility**: High confidence - Yes

**MVP-Critical Risks**:
1. Import resolution fails during build → Mitigate with incremental testing
2. Zod schema conflicts or missing type exports → Follow existing library patterns
3. Storybook missing in library package → Defer AC-9 if blocking
4. Existing tests rely on implementation details → Review before migration
5. EmptyState CTA routing logic differs between apps → Support both `onClick` and `href`

**Implementation Strategy**:
- Phase 1: Add components to library (no deletion yet)
- Phase 2: Add tests and Storybook stories to library
- Phase 3: Update consuming apps (parallel)
- Phase 4: Clean up duplicates

**Dependencies**: None - no API, database, or infrastructure changes

## Reality Baseline

**Baseline Date**: 2026-02-10

**Source Files** (as of baseline):
- `apps/web/main-app/src/components/Dashboard/DashboardSkeleton.tsx` (67 lines, unchanged since creation)
- `apps/web/main-app/src/components/Dashboard/EmptyDashboard.tsx` (74 lines, unchanged since creation)
- `apps/web/app-dashboard/src/components/DashboardSkeleton.tsx` (67 lines, unchanged since creation)
- `apps/web/app-dashboard/src/components/EmptyDashboard.tsx` (74 lines, unchanged since creation)
- `packages/core/app-component-library/src/feedback/skeleton.tsx` (405 lines, active development)

**Active Conflicts**: None

**Protected Features**:
- Existing skeleton components in library (`MocCardSkeleton`, `GalleryGridSkeleton`, etc.) - do not modify
- Library's base `Skeleton` primitive implementation - reuse, do not replace
- shadcn/Radix primitives in `_primitives/` - do not modify

**Constraints**:
- Must use Zod schemas for all type definitions (per CLAUDE.md)
- No barrel files (import directly from source files)
- All imports from `@repo/app-component-library` use barrel export
- Component directory structure per CLAUDE.md guidelines

**ADR Compliance**:
- ADR-006: E2E tests required, must use real services (no MSW mocking)

---

## Story Metadata

**Epic**: repackag-app
**Priority**: P2
**Story Points**: 3
**Story Type**: tech_debt

**Created**: 2026-02-10
**Status**: backlog
**Depends On**: none
**Blocks**: none

**Surfaces**: Frontend only
**Touches**: Frontend (apps/web/main-app, apps/web/app-dashboard, packages/core/app-component-library)

**Experiment Variant**: control (no active experiments matched)

**Risk Predictions**:
- Split Risk: 0.2 (low)
- Review Cycles: 2 (expected)
- Token Estimate: 120,000 tokens
- Confidence: medium (no similar stories, but well-defined scope)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Updated |
|---|---------|------------|----------|
| 3 | EmptyState action prop ambiguity | Added explicit precedence rule: href takes precedence over onClick when both provided | AC-2 |
| 5 | Test file migration strategy incomplete | Added explicit consolidation strategy: merge duplicate tests into single files, preserve unique assertions | AC-7 |

### Implementation Guidance (Non-Blocking)

| # | Finding | Category | Guidance |
|---|---------|----------|----------|
| 1 | EmptyDashboard messaging inconsistency | implementation-note | Verify actual implementation wording during work, update AC-3 if needed |
| 2 | Zod schema constraint documentation | implementation-note | Schemas are for type inference; validation is consumer responsibility |
| 4 | Package.json modifications | implementation-note | All dependencies exist; this clause is defensive |

### Enhancements Logged to KB (Post-MVP)

17 non-blocking findings documented for future consideration:

**High Priority (Sprint N+1)**:
- Storybook setup for component library
- Screen reader announcements for loading states
- Visual regression baseline tooling
- Comprehensive WCAG 2.2 AA audit

**Medium Priority (Sprint N+2)**:
- EmptyState illustration support
- DashboardSkeleton partial loading states
- Dark mode theming verification

**Low Priority (Future)**:
- Icon customization props
- Skeleton variant support
- Responsive grid improvements
- Generic preset factory pattern
- Internationalization support
- Performance optimization for large grids

### Summary

- ACs clarified: 2 (AC-2, AC-7)
- MVP-critical gaps resolved: 0 (gap #3, #5 → AC updates)
- Non-blocking findings: 17
- Audit checks passing: 8/8 ✅
- Mode: autonomous
- Verdict: **PASS** ✅

**Implementer Notes**:
- Story is ready for development with zero blocking issues
- All component specifications are complete and testable
- Migration strategy is safe (3-phase approach)
- See DECISIONS.yaml for complete KB requests and implementation guidance
