# Story lnch-1042: Loading State Consistency

## Status

Draft

## Story

**As a** user,
**I want** consistent loading indicators throughout the app,
**so that** I know when content is being fetched.

## Epic Context

This is **Story 4 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **High** - Affects perceived performance.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1041: Empty States (transitions to empty state)
- lnch-1040: Error Messages (transitions to error state)
- lnch-1043: Accessibility Audit (loading state accessibility)

## Acceptance Criteria

1. All data-loading pages show skeleton loaders
2. Button actions show loading spinners
3. Form submissions show loading state
4. Loading states match design system
5. Loading states have accessible announcements
6. Initial page load shows consistent loading
7. RTK Query loading states are utilized

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Loading States** (AC: 1-3)
  - [ ] Check each page for loading behavior
  - [ ] Document inconsistencies
  - [ ] Identify missing loading states

- [ ] **Task 2: Create Skeleton Components** (AC: 1, 4)
  - [ ] Card skeleton
  - [ ] Table skeleton
  - [ ] Form skeleton
  - [ ] Gallery grid skeleton

- [ ] **Task 3: Standardize Button Loading** (AC: 2)
  - [ ] Spinner icon on buttons
  - [ ] Disable button while loading
  - [ ] Maintain button width

- [ ] **Task 4: Standardize Form Loading** (AC: 3)
  - [ ] Submit button loading state
  - [ ] Form disabled during submission
  - [ ] Success/error transition

- [ ] **Task 5: Add Accessibility** (AC: 5)
  - [ ] aria-busy on loading containers
  - [ ] aria-live for status changes
  - [ ] Screen reader announcements

- [ ] **Task 6: Verify RTK Query Integration** (AC: 7)
  - [ ] isLoading used consistently
  - [ ] isFetching for refetch states
  - [ ] isSuccess/isError transitions

- [ ] **Task 7: Test All Loading States** (AC: 1-6)
  - [ ] Slow network simulation
  - [ ] Verify skeleton visibility
  - [ ] Verify accessible announcements

## Dev Notes

### Skeleton Components (shadcn/ui)
```tsx
import { Skeleton } from '@repo/ui'

// Card skeleton
<div className="space-y-2">
  <Skeleton className="h-48 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

### Button Loading State
```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

### RTK Query Pattern
```tsx
const { data, isLoading, isFetching, isError } = useGetMocsQuery()

if (isLoading) return <MocListSkeleton />
if (isError) return <ErrorState />
if (!data?.length) return <EmptyState />

return <MocList mocs={data} />
```

### Accessibility
```tsx
<div aria-busy={isLoading} aria-live="polite">
  {isLoading && <span className="sr-only">Loading content...</span>}
  {!isLoading && content}
</div>
```

### Loading State Inventory

| Component | Current | Target |
|-----------|---------|--------|
| Dashboard | Unknown | Skeleton |
| MOC Gallery | Unknown | Skeleton grid |
| MOC Detail | Unknown | Skeleton |
| Upload Form | Unknown | Button spinner |
| Search Results | Unknown | Skeleton grid |

## Testing

### Test Requirements
- Unit: Skeleton components render
- Integration: Loading states show during fetch
- E2E: Loading visible with network throttling
- A11y: Screen reader announces loading

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
