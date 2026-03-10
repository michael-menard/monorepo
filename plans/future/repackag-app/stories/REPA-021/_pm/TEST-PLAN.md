# Test Plan: REPA-021

## Scope Summary

- **Endpoints touched**: None (frontend-only component consolidation)
- **UI touched**: Yes
  - `app-dashboard` main page (loading and empty states)
  - `main-app` dashboard page (loading and empty states)
- **Data/storage touched**: No

## Happy Path Tests

### Test 1: DashboardSkeleton renders during loading state
- **Setup**:
  - Access app-dashboard main page
  - Clear any cached data to force loading state
- **Action**:
  - Navigate to `/` (dashboard)
  - Observe initial render before data loads
- **Expected outcome**:
  - `DashboardSkeleton` component renders with:
    - 3 stat card skeletons in header
    - 5 MOC card skeletons in grid layout
    - Quick actions section skeleton
  - Visual appearance matches original implementation
- **Evidence**:
  - Playwright screenshot of loading state
  - Trace showing `DashboardSkeleton` component in DOM
  - No console errors

### Test 2: EmptyDashboard renders when user has no MOCs
- **Setup**:
  - Use test account with no MOCs (`totalMocs === 0`)
  - Access app-dashboard main page
- **Action**:
  - Navigate to `/` (dashboard) and wait for data to load
- **Expected outcome**:
  - `EmptyDashboard` component renders with:
    - Empty state icon and title
    - Feature highlights grid (4 features)
    - "Add Your First MOC" CTA button
  - Visual appearance matches original implementation
- **Evidence**:
  - Playwright screenshot of empty state
  - Assert on presence of CTA button with correct text
  - Assert on presence of 4 feature highlight cards
  - No console errors

### Test 3: Components exported from library package
- **Setup**:
  - Build `@repo/app-component-library` package
  - Build consuming apps
- **Action**:
  - Run TypeScript compiler on both consuming apps
  - Check that imports resolve correctly
- **Expected outcome**:
  - `import { DashboardSkeleton, EmptyDashboard } from '@repo/app-component-library'` resolves
  - No TypeScript errors
  - No import warnings
- **Evidence**:
  - `pnpm check-types:all` passes
  - Build succeeds without errors

### Test 4: Storybook stories render correctly
- **Setup**:
  - Start Storybook for `@repo/app-component-library`
- **Action**:
  - Navigate to `DashboardSkeleton` story
  - Navigate to `EmptyState` story
  - Navigate to `EmptyDashboard` story
- **Expected outcome**:
  - All stories render without errors
  - Variants/controls work as expected
  - Visual appearance matches original components
- **Evidence**:
  - Storybook screenshots
  - No console errors in Storybook

## Error Cases

### Error 1: Missing required props for EmptyState
- **Setup**:
  - Create test that omits required props from `EmptyState`
- **Action**:
  - Attempt to render `<EmptyState />` without `title` prop
- **Expected**:
  - TypeScript compilation error
  - Clear error message indicating missing required props
- **Evidence**:
  - TypeScript error output
  - Zod validation error if props passed at runtime

### Error 2: Invalid action type for EmptyState
- **Setup**:
  - Create test with invalid action configuration
- **Action**:
  - Pass both `onAddClick` and `addLink` props simultaneously
- **Expected**:
  - TypeScript error or runtime warning
  - Component gracefully handles conflict (prefers one over the other)
- **Evidence**:
  - Console warning or TypeScript error
  - Component still renders (doesn't crash)

## Edge Cases (Reasonable)

### Edge 1: EmptyState with very long title/description
- **Setup**:
  - Create test with 200+ character title and description
- **Action**:
  - Render `EmptyState` with long text content
- **Expected**:
  - Text wraps appropriately
  - Layout doesn't break
  - No horizontal scroll
- **Evidence**:
  - Visual regression test
  - Screenshot showing proper text wrapping

### Edge 2: EmptyState without CTA button
- **Setup**:
  - Create test with no action props
- **Action**:
  - Render `EmptyState` without `action` prop
- **Expected**:
  - Component renders without CTA
  - Layout adjusts appropriately
  - No error thrown
- **Evidence**:
  - Unit test assertion
  - Screenshot showing no CTA present

### Edge 3: DashboardSkeleton responsive behavior
- **Setup**:
  - Test at mobile (375px), tablet (768px), and desktop (1440px) viewports
- **Action**:
  - Render `DashboardSkeleton` at each viewport size
- **Expected**:
  - Skeleton adapts to viewport:
    - Mobile: single column grid
    - Tablet: 2-column grid
    - Desktop: 3-column grid
  - Matches original responsive behavior
- **Evidence**:
  - Playwright screenshots at each viewport
  - Visual comparison with original implementation

### Edge 4: Multiple rapid loading state transitions
- **Setup**:
  - Mock API with artificial delay
  - Navigate between pages rapidly
- **Action**:
  - Navigate to dashboard, then away, then back quickly
- **Expected**:
  - No flickering or layout shifts
  - Skeleton appears/disappears cleanly
  - No memory leaks from unmounting
- **Evidence**:
  - Playwright video showing smooth transitions
  - Chrome DevTools Performance profile

## Required Tooling Evidence

### Backend
- **N/A** - No backend changes for this story

### Frontend

#### Vitest (Unit Tests)
Required tests in `@repo/app-component-library`:
- `src/feedback/__tests__/skeleton.test.tsx`
  - Test: `DashboardSkeleton` renders with correct structure
  - Test: `DashboardSkeleton` applies custom className
  - Test: `DashboardSkeleton` matches snapshot
- `src/feedback/__tests__/empty-states.test.tsx`
  - Test: `EmptyState` renders with required props
  - Test: `EmptyState` renders CTA button when `action` provided
  - Test: `EmptyState` renders Link when `addLink` provided
  - Test: `EmptyState` renders without CTA when no action props
  - Test: `EmptyDashboard` preset renders with default props
  - Test: `EmptyDashboard` accepts custom `onAddClick` handler
  - Test: `EmptyDashboard` renders 4 feature highlights

Run commands:
```bash
pnpm --filter @repo/app-component-library test
```

Assertions:
- All tests pass
- Coverage for new components ≥ 80%
- No console errors during test runs

#### Playwright (E2E Tests)
Required test file: `apps/web/playwright/tests/dashboard-skeleton-empty.spec.ts`

Tests:
1. **Loading state shows DashboardSkeleton**
   ```typescript
   test('shows skeleton during dashboard load', async ({ page }) => {
     await page.goto('/')
     // Assert skeleton is visible before data loads
     await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible()
     // Wait for data to load
     await page.waitForSelector('[data-testid="dashboard-stats"]')
     // Assert skeleton is removed
     await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible()
   })
   ```

2. **Empty state shows EmptyDashboard**
   ```typescript
   test('shows empty state when no MOCs exist', async ({ page }) => {
     // Setup: use test user with no MOCs
     await page.goto('/')
     // Wait for data load to complete
     await page.waitForLoadState('networkidle')
     // Assert empty state is visible
     await expect(page.locator('[data-testid="empty-dashboard"]')).toBeVisible()
     // Assert CTA button is present
     await expect(page.getByRole('button', { name: /add your first moc/i })).toBeVisible()
     // Assert 4 feature highlights
     await expect(page.locator('[data-testid="feature-highlight"]')).toHaveCount(4)
   })
   ```

Run commands:
```bash
pnpm --filter @repo/playwright test dashboard-skeleton-empty
```

Assertions:
- Both tests pass
- Use real backend (no MSW mocking per ADR-006)
- Trace and screenshot artifacts captured for failures

#### Storybook
Required story files:
- `@repo/app-component-library/src/__stories__/skeleton.stories.tsx` (update existing)
  - Add `DashboardSkeleton` story
- `@repo/app-component-library/src/__stories__/empty-states.stories.tsx` (new file)
  - `EmptyState` - Default story
  - `EmptyState` - With CTA button
  - `EmptyState` - With Link
  - `EmptyState` - Without action
  - `EmptyDashboard` - Default preset

Run command:
```bash
pnpm --filter @repo/app-component-library storybook
```

Visual validation:
- All stories render without errors
- Interactive controls work
- Variants display correctly

## Risks to Call Out

### Risk 1: Storybook not configured in library package
- **Impact**: Can't validate Storybook stories
- **Mitigation**: If Storybook config missing, add basic `.storybook/` setup for library package
- **Fallback**: Document stories as "TODO" if Storybook setup blocks completion

### Risk 2: Test user with zero MOCs may not exist
- **Impact**: Can't test empty state in E2E
- **Mitigation**: Create seed script or test fixture to ensure test user with no MOCs exists
- **Fallback**: Mock empty response in E2E (not ideal per ADR-006, but pragmatic)

### Risk 3: Import path changes may break during build
- **Impact**: Apps fail to build after updating imports
- **Mitigation**:
  - Keep original files until library versions verified
  - Test builds incrementally (library → app-dashboard → main-app)
  - Use Turbo cache for faster rebuilds
- **Fallback**: Revert import changes and debug in isolation
