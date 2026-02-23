# Dev Feasibility Review: REPA-021

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**:
  - Components are identical byte-for-byte duplicates (confirmed in seed)
  - Target library package already has established patterns for similar components
  - No API changes, database changes, or infrastructure modifications required
  - Clear migration path with low risk of regression
  - Consuming apps use standard import patterns that are easy to update

## Likely Change Surface (Core Only)

### Packages Modified

1. **`@repo/app-component-library`** (target package)
   - `src/feedback/skeleton.tsx` - Add `DashboardSkeleton` export
   - `src/feedback/empty-states.tsx` - New file with `EmptyState` and `EmptyDashboard`
   - `src/index.ts` - Add exports for new components
   - `src/__stories__/skeleton.stories.tsx` - Add `DashboardSkeleton` story
   - `src/__stories__/empty-states.stories.tsx` - New Storybook file
   - `src/feedback/__tests__/skeleton.test.tsx` - Update with `DashboardSkeleton` tests
   - `src/feedback/__tests__/empty-states.test.tsx` - New test file

2. **`apps/web/main-app`** (consuming app)
   - `src/components/Dashboard/index.ts` - Update imports to re-export from library
   - Delete: `src/components/Dashboard/DashboardSkeleton.tsx`
   - Delete: `src/components/Dashboard/EmptyDashboard.tsx`
   - Delete: `src/components/Dashboard/__tests__/DashboardSkeleton.test.tsx`
   - Delete: `src/components/Dashboard/__tests__/EmptyDashboard.test.tsx`

3. **`apps/web/app-dashboard`** (consuming app)
   - `src/components/index.ts` - Update imports to use library components
   - Delete: `src/components/DashboardSkeleton.tsx`
   - Delete: `src/components/EmptyDashboard.tsx`
   - Delete: `src/components/__tests__/DashboardSkeleton.test.tsx`
   - Delete: `src/components/__tests__/EmptyDashboard.test.tsx`

4. **`apps/web/playwright`** (E2E tests)
   - `tests/dashboard-skeleton-empty.spec.ts` - New E2E test file

### Endpoints for Core Journey
- **None** - This is purely a frontend component consolidation with no backend changes

### Critical Deploy Touchpoints
- **Library package publish**: Must rebuild `@repo/app-component-library` before consuming apps
- **App deployments**: Both `main-app` and `app-dashboard` must redeploy after library update
- **Turbo cache invalidation**: Ensure Turbo rebuilds library when source changes detected
- **No infrastructure changes**: No API Gateway, Lambda, or database deployments required

## MVP-Critical Risks (Max 5)

### Risk 1: Import resolution fails during build
- **Why it blocks MVP**: Apps won't compile without correct imports
- **Required mitigation**:
  - Test builds incrementally: library → app-dashboard → main-app
  - Verify barrel export in `@repo/app-component-library/src/index.ts` includes new components
  - Run `pnpm build` from monorepo root to ensure Turbo orchestration works
- **Proof of mitigation**: `pnpm build:all` succeeds without errors

### Risk 2: Zod schema conflicts or missing type exports
- **Why it blocks MVP**: TypeScript compilation errors in consuming apps
- **Required mitigation**:
  - Export prop schemas alongside components from `index.ts`
  - Follow existing pattern from library (e.g., `AppCounterCardPropsSchema`)
  - Test TypeScript compilation in both consuming apps
- **Proof of mitigation**: `pnpm check-types:all` passes

### Risk 3: Storybook missing in library package
- **Why it blocks MVP**: Can't validate Storybook stories (AC-9 requirement)
- **Required mitigation**:
  - Check if `.storybook/` config exists in `@repo/app-component-library`
  - If missing, either:
    - Add basic Storybook config (may require additional dependencies)
    - Or document stories as "pending Storybook setup" and defer to future work
- **Proof of mitigation**: `pnpm storybook` runs successfully in library package, or AC-9 marked as non-blocking

### Risk 4: Existing tests in consuming apps rely on implementation details
- **Why it blocks MVP**: Migrating tests might break if they're tightly coupled to app-specific imports
- **Required mitigation**:
  - Review test files before deletion to ensure no app-specific test utilities are lost
  - Migrate test utilities to library package if needed
  - Run full test suite after migration to catch regressions
- **Proof of mitigation**: `pnpm test:all` passes with no new failures

### Risk 5: EmptyState CTA routing logic differs between apps
- **Why it blocks MVP**: If apps use different routing strategies, generic component might not work for both
- **Required mitigation**:
  - Check how `EmptyDashboard` is used in both apps (seed shows usage in `app-dashboard/src/pages/main-page.tsx`)
  - Ensure `EmptyState` supports both `onClick` handler and `href` link
  - Test CTA behavior in both apps' E2E tests
- **Proof of mitigation**: E2E tests verify CTA works in both `main-app` and `app-dashboard`

## Missing Requirements for MVP

### 1. Test account with zero MOCs
- **Blocks core journey**: Can't test `EmptyDashboard` rendering without test data
- **Concrete decision text PM must include**:
  > "Test environment must include a test user account with `totalMocs === 0` to verify empty state rendering. If test data doesn't exist, create seed script or test fixture."

### 2. Storybook configuration decision
- **Blocks core journey**: AC-9 requires Storybook stories, but library package might not have Storybook configured
- **Concrete decision text PM must include**:
  > "If @repo/app-component-library doesn't have Storybook configured, decide whether to:
  > - Add Storybook config to library (estimated +2 hours, requires @storybook/react dependency)
  > - Defer Storybook stories to future work and mark AC-9 as non-blocking
  > - Use consuming app's Storybook to demo components (workaround)"

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Build Evidence**:
   - `pnpm build:all` output showing successful builds for:
     - `@repo/app-component-library`
     - `apps/web/main-app`
     - `apps/web/app-dashboard`
   - Turbo cache logs showing library rebuild triggered app rebuilds

2. **Type Safety Evidence**:
   - `pnpm check-types:all` output with zero errors
   - TypeScript compiler output showing exports resolved correctly

3. **Test Evidence**:
   - Vitest output showing:
     - New library tests passing (`skeleton.test.tsx`, `empty-states.test.tsx`)
     - No regressions in app tests
   - Coverage report showing ≥80% coverage for new components

4. **E2E Evidence**:
   - Playwright test run output for `dashboard-skeleton-empty.spec.ts`
   - Screenshots showing:
     - Loading state with `DashboardSkeleton`
     - Empty state with `EmptyDashboard`
   - Trace files confirming correct components rendered

5. **Visual Regression Evidence**:
   - Before/after screenshots of dashboard loading state (pixel diff <1%)
   - Before/after screenshots of dashboard empty state (pixel diff <1%)
   - Storybook screenshots showing variants render correctly (if applicable)

6. **Import Evidence**:
   - Grep output confirming old import paths removed from apps
   - Grep output confirming new imports use `@repo/app-component-library`

### Critical CI/Deploy Checkpoints

1. **Pre-deployment checks**:
   - [ ] All tests pass (`pnpm test:all`)
   - [ ] Type checking passes (`pnpm check-types:all`)
   - [ ] Linting passes (`pnpm lint:all`)
   - [ ] Build succeeds (`pnpm build:all`)

2. **Library package checkpoint**:
   - [ ] `@repo/app-component-library` builds successfully
   - [ ] New exports present in `dist/index.js`
   - [ ] Types generated in `dist/index.d.ts`

3. **App deployment checkpoint**:
   - [ ] Apps import library components without errors
   - [ ] E2E tests pass in CI environment
   - [ ] No console errors in deployed apps

## Implementation Strategy

### Phase 1: Add Components to Library (No Deletion Yet)
**Goal**: Establish library components without breaking existing apps

**Tasks**:
1. Create `src/feedback/empty-states.tsx`:
   - Implement `EmptyState` component with Zod props schema
   - Implement `EmptyDashboard` preset
   - Use library's `Button` and `lucide-react` icons
2. Update `src/feedback/skeleton.tsx`:
   - Add `DashboardSkeleton` component
   - Refactor to use library's `Skeleton` primitive (not inline custom version)
3. Update `src/index.ts`:
   - Export `DashboardSkeleton`, `EmptyState`, `EmptyDashboard`
   - Export corresponding prop schemas
4. Add Zod schemas in component files (per CLAUDE.md requirement)

**Success Criteria**:
- Library builds successfully
- Components render in isolation (Storybook or manual test)
- No impact on consuming apps yet (they still use local versions)

### Phase 2: Add Tests and Storybook Stories to Library
**Goal**: Migrate test coverage to library package

**Tasks**:
1. Create `src/feedback/__tests__/empty-states.test.tsx`:
   - Migrate assertions from app-level tests
   - Add new tests for prop variations
   - Test both `EmptyState` and `EmptyDashboard`
2. Update `src/feedback/__tests__/skeleton.test.tsx`:
   - Add tests for `DashboardSkeleton`
   - Verify it uses library's `Skeleton` primitive
3. Create Storybook stories:
   - Update `__stories__/skeleton.stories.tsx` (add `DashboardSkeleton`)
   - Create `__stories__/empty-states.stories.tsx`
4. Run tests and verify coverage ≥80%

**Success Criteria**:
- `pnpm --filter @repo/app-component-library test` passes
- Coverage report shows adequate coverage
- Storybook stories render (if Storybook configured)

### Phase 3: Update Consuming Apps (Parallel)
**Goal**: Migrate apps to use library components

**Tasks** (main-app):
1. Update `src/components/Dashboard/index.ts`:
   ```typescript
   export { DashboardSkeleton, EmptyDashboard } from '@repo/app-component-library'
   ```
2. Keep old component files temporarily (for comparison)
3. Test locally: `pnpm --filter main-app dev`
4. Verify rendering matches original

**Tasks** (app-dashboard):
1. Update `src/components/index.ts`:
   ```typescript
   export { DashboardSkeleton, EmptyDashboard } from '@repo/app-component-library'
   ```
2. Keep old component files temporarily
3. Test locally: `pnpm --filter app-dashboard dev`
4. Verify rendering matches original

**Success Criteria**:
- Both apps run without errors
- Visual regression tests pass
- E2E tests pass

### Phase 4: Clean Up Duplicates
**Goal**: Remove old component files and tests

**Tasks**:
1. Delete files from `main-app`:
   - `src/components/Dashboard/DashboardSkeleton.tsx`
   - `src/components/Dashboard/EmptyDashboard.tsx`
   - `src/components/Dashboard/__tests__/DashboardSkeleton.test.tsx`
   - `src/components/Dashboard/__tests__/EmptyDashboard.test.tsx`
2. Delete files from `app-dashboard`:
   - `src/components/DashboardSkeleton.tsx`
   - `src/components/EmptyDashboard.tsx`
   - `src/components/__tests__/DashboardSkeleton.test.tsx`
   - `src/components/__tests__/EmptyDashboard.test.tsx`
3. Run full test suite to catch any missed references
4. Grep for any remaining imports of old paths

**Success Criteria**:
- No old component files remain
- No broken imports
- All tests pass
- Build succeeds

## Dependencies

### No External API Changes Needed
- No REST endpoint modifications
- No GraphQL schema changes
- No WebSocket protocol changes

### No Database Schema Changes
- No migrations required
- No seed data changes (beyond test data for empty state)

### No Infrastructure Changes
- No Terraform modifications
- No AWS resource changes
- No environment variable changes

### Just Pure Frontend Component Refactoring
- Minimal risk profile
- No coordination with backend team required
- Can be developed and tested independently

## Rollback Strategy

### If Issues Arise Post-Deployment

1. **Revert import changes**:
   - Change imports back to local component paths
   - Restore deleted component files from git history
   - Redeploy apps

2. **Library package rollback**:
   - If library changes cause issues, revert library package version
   - Update package.json in consuming apps to use previous version
   - Redeploy

3. **Incremental rollback**:
   - Roll back one app at a time if only one is affected
   - Keep library changes, just revert app imports

**Rollback Time Estimate**: <1 hour (simple git revert + redeploy)

## Performance Considerations

### Bundle Size Impact
- **Positive impact**: Eliminates duplicate component code (282 lines across 4 files)
- **Neutral impact**: Library already included in apps, no new dependencies
- **No new dependencies**: All required packages (`lucide-react`, `@tanstack/react-router`) already in use

### Runtime Performance
- **No change**: Components are identical implementations, just relocated
- **Tree-shaking**: Ensure library exports are tree-shakeable (using named exports, not barrel re-exports)

### Build Performance
- **Turbo cache optimization**: Library changes will invalidate app caches, but subsequent builds will be faster
- **Parallel builds**: Apps can build in parallel after library build completes

## Team Coordination

### No Backend Coordination Required
- Frontend-only change
- No API contract modifications
- No backend team review needed

### Frontend Team Coordination
- **Notification**: Inform team about import path changes
- **Documentation**: Update team wiki or README if component locations are documented
- **Code review**: Single PR can include all changes (library + both apps)

## Success Metrics

### Code Quality Metrics
- **Code duplication**: Reduced by 282 lines (4 duplicate files removed)
- **Test coverage**: Maintained or improved (≥80% for new components)
- **Type safety**: 100% (all components have Zod schemas)

### User-Facing Metrics
- **Visual parity**: 100% (pixel-perfect match with originals)
- **Performance**: No degradation (identical runtime behavior)
- **Accessibility**: Maintained or improved (WCAG 2.1 AA compliance)

### Developer Experience Metrics
- **Import consistency**: All skeleton/empty state components from single package
- **Storybook coverage**: New stories for visual testing
- **Reusability**: Generic `EmptyState` component enables future empty states
