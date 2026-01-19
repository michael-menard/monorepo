# Story glry-1007: Datatable Loading State

## Status

Draft

## Story

**As a** user viewing the datatable,
**I want** a clear loading indicator while data is fetching,
**so that** I know the application is working and my content is on the way.

## Dependencies

- **glry-1006**: Datatable Foundation - Wishlist Only (REQUIRED)

## Acceptance Criteria

1. `GalleryDataTableSkeleton` component shows shimmer effect during initial load
2. Skeleton dynamically adjusts to expected column count (4 for wishlist)
3. Shows 10 skeleton rows by default
4. Shimmer animation uses Tailwind `animate-pulse`
5. Skeleton hidden when real data loads
6. Bottom loading spinner shows during infinite scroll
7. Loading states don't cause layout shift
8. Respects `prefers-reduced-motion` (no shimmer, just static placeholders)

## Tasks / Subtasks

### Task 1: Create GalleryDataTableSkeleton Component (AC: 1, 2, 3, 4)

- [ ] Create `packages/core/gallery/src/components/GalleryDataTableSkeleton.tsx`
- [ ] Accept props: `columns: number`, `rows?: number` (default 10)
- [ ] Render table structure matching GalleryDataTable
- [ ] Use Tailwind `bg-muted animate-pulse` for shimmer
- [ ] Generate dynamic number of column skeletons
- [ ] Generate dynamic number of row skeletons
- [ ] Match column widths to actual table

### Task 2: Add Bottom Loading Spinner (AC: 6)

- [ ] Create loading spinner component for infinite scroll
- [ ] Use lucide-react `Loader2` icon with `animate-spin`
- [ ] Show at table footer when `isLoading={true}`
- [ ] Center align with `flex justify-center`
- [ ] Add `aria-live="polite"` and `aria-label="Loading more items"`

### Task 3: Prevent Layout Shift (AC: 7)

- [ ] Ensure skeleton has same height as actual table
- [ ] Match skeleton row height (min 44px)
- [ ] Use fixed table layout or width constraints
- [ ] Test transition from skeleton to real data

### Task 4: Respect prefers-reduced-motion (AC: 8)

- [ ] Add Tailwind media query: `motion-safe:animate-pulse`
- [ ] Static gray placeholders when motion reduced
- [ ] Test with browser reduced motion settings

### Task 5: Integrate with GalleryDataTable (AC: 5)

- [ ] Show skeleton when `isLoading={true}` and `items.length === 0`
- [ ] Hide skeleton when data loads
- [ ] Use conditional rendering in parent component

### Task 6: Write Tests (AC: 1-8)

- [ ] Test skeleton renders with correct column count
- [ ] Test skeleton renders correct number of rows
- [ ] Test shimmer animation present
- [ ] Test skeleton hidden when data loads
- [ ] Test bottom spinner shows during infinite scroll
- [ ] Achieve 80% coverage

## Dev Notes

### Skeleton Pattern

```typescript
interface GalleryDataTableSkeletonProps {
  columns: number
  rows?: number
}

export function GalleryDataTableSkeleton({
  columns,
  rows = 10,
}: GalleryDataTableSkeletonProps) {
  return (
    <table className="min-w-full">
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <div className="h-4 bg-muted motion-safe:animate-pulse rounded" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="px-4 py-3">
                <div className="h-4 bg-muted motion-safe:animate-pulse rounded" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Testing

```typescript
describe('GalleryDataTableSkeleton', () => {
  it('renders correct number of columns', () => {
    render(<GalleryDataTableSkeleton columns={4} />)
    const headerCells = screen.getAllByRole('columnheader')
    expect(headerCells).toHaveLength(4)
  })

  it('renders correct number of rows', () => {
    render(<GalleryDataTableSkeleton columns={4} rows={5} />)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(6) // 5 + 1 header row
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] `GalleryDataTableSkeleton` component created
- [ ] Bottom loading spinner implemented
- [ ] No layout shift during loading
- [ ] `prefers-reduced-motion` respected
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
