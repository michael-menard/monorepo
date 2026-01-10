# Story glry-1015: Datatable Animations and Micro-interactions

## Status

Draft

## Story

**As a** user interacting with the datatable,
**I want** smooth, delightful animations and visual feedback,
**so that** the interface feels responsive, polished, and enjoyable to use.

## Dependencies

- **glry-1006**: Datatable Foundation - Wishlist Only (REQUIRED - base component)
- **glry-1010**: Single Column Sort (OPTIONAL - enhances sort animations)
- **glry-1011**: Multi-Column Sort (OPTIONAL - enhances sort animations)

## Acceptance Criteria

1. Row hover animation: smooth background color transition (100ms)
2. Row click animation: subtle scale down/up feedback (150ms)
3. Sort indicator entrance: fade in + slide from top (150ms)
4. Sort direction change: rotation animation (200ms)
5. Column header hover: subtle lift and shadow (100ms)
6. Loading skeleton: shimmer animation respects `prefers-reduced-motion`
7. Empty state entrance: fade + slide up (200ms)
8. Error state entrance: shake animation (300ms) for attention
9. Table row entrance: staggered fade-in when data loads (50ms delay per row, max 10 rows)
10. All animations respect `prefers-reduced-motion` media query

## Tasks / Subtasks

### Task 1: Add Row Hover Animation (AC: 1)

- [ ] Update row className with transition:
  ```typescript
  className="border-b transition-colors duration-100 hover:bg-accent/10"
  ```
- [ ] Use Tailwind `transition-colors` utility
- [ ] Duration: 100ms
- [ ] Ensure smooth color change on hover

### Task 2: Add Row Click Feedback (AC: 2)

- [ ] Wrap row in Framer Motion component:
  ```typescript
  <motion.tr
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15 }}
    className="cursor-pointer"
  >
  ```
- [ ] Scale down to 98% on click
- [ ] Spring back to 100% on release
- [ ] Duration: 150ms

### Task 3: Animate Sort Indicators (AC: 3, 4)

- [ ] Sort arrow entrance animation:
  ```typescript
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.15 }}
  >
    <ArrowUp />
  </motion.div>
  ```
- [ ] Direction change rotation:
  ```typescript
  animate={{
    rotate: sortDirection === 'desc' ? 180 : 0,
  }}
  transition={{ duration: 0.2, ease: 'easeInOut' }}
  ```

### Task 4: Add Column Header Hover Effect (AC: 5)

- [ ] Add Tailwind classes to sortable headers:
  ```typescript
  className="transition-all duration-100 hover:-translate-y-[1px] hover:shadow-sm"
  ```
- [ ] Subtle 1px lift on hover
- [ ] Small shadow appears
- [ ] Duration: 100ms

### Task 5: Enhance Skeleton Shimmer (AC: 6)

- [ ] Update skeleton shimmer to respect motion preferences:
  ```typescript
  <div className="bg-muted motion-safe:animate-pulse rounded" />
  ```
- [ ] `motion-safe:` prefix ensures animation only when motion enabled
- [ ] Static gray placeholder when `prefers-reduced-motion` active

### Task 6: Animate Empty State (AC: 7)

- [ ] Wrap `GalleryTableEmpty` in Framer Motion:
  ```typescript
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    <GalleryTableEmpty variant="no-items" />
  </motion.div>
  ```
- [ ] Fade in from 0 → 1
- [ ] Slide up 20px → 0
- [ ] Duration: 200ms

### Task 7: Animate Error State with Shake (AC: 8)

- [ ] Add shake animation to `GalleryTableError`:
  ```typescript
  <motion.div
    initial={{ opacity: 0, x: 0 }}
    animate={{
      opacity: 1,
      x: [0, -10, 10, -10, 10, 0], // Shake left-right
    }}
    transition={{
      opacity: { duration: 0.15 },
      x: { duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    }}
  >
    <GalleryTableError error={error} />
  </motion.div>
  ```
- [ ] Shake draws attention to error
- [ ] Duration: 300ms total
- [ ] Fade in simultaneously

### Task 8: Add Staggered Row Entrance (AC: 9)

- [ ] Animate rows when data first loads:
  ```typescript
  {table.getRowModel().rows.map((row, index) => (
    <motion.tr
      key={row.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.05, 0.5), // Max 10 rows × 50ms
        ease: 'easeOut',
      }}
    >
      {/* cells */}
    </motion.tr>
  ))}
  ```
- [ ] Fade in + slide up
- [ ] 50ms delay per row
- [ ] Cap at 500ms total (max 10 rows)

### Task 9: Respect prefers-reduced-motion (AC: 10)

- [ ] Wrap animations with `useReducedMotion` hook:
  ```typescript
  import { useReducedMotion } from 'framer-motion'

  const shouldReduceMotion = useReducedMotion()

  <motion.div
    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
  >
  ```
- [ ] OR rely on Framer Motion's automatic handling
- [ ] Test with browser setting enabled
- [ ] Fallback to instant state changes when motion reduced

### Task 10: Write Tests (AC: 1-10)

- [ ] Test row hover applies background color class
- [ ] Test row click scales down (mock Framer Motion)
- [ ] Test sort indicators animate on toggle
- [ ] Test column headers have hover lift effect
- [ ] Test skeleton uses `motion-safe:animate-pulse`
- [ ] Test empty state fades + slides up
- [ ] Test error state shakes on mount
- [ ] Test row entrance stagger animation
- [ ] Test `prefers-reduced-motion` disables animations
- [ ] Achieve 80% coverage

## Dev Notes

### Animation Timing Reference

[Source: docs/front-end-spec-gallery-datatable.md#animation--micro-interactions]

| Interaction | Duration | Easing | Effect |
|------------|----------|--------|--------|
| Row hover | 100ms | ease | Background color transition |
| Row click | 150ms | spring | Scale 0.98 |
| Sort arrow entrance | 150ms | ease-out | Fade + slide from top |
| Sort direction change | 200ms | ease-in-out | Rotate 180° |
| Column hover | 100ms | ease | Lift 1px + shadow |
| Empty state | 200ms | ease-out | Fade + slide up |
| Error shake | 300ms | ease-in-out | Horizontal shake |
| Row stagger | 200ms + 50ms/row | ease-out | Fade + slide up |

### Framer Motion Patterns

```typescript
// Row click feedback
<motion.tr
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  className="cursor-pointer"
>

// Sort arrow with rotation
<motion.div
  animate={{
    rotate: sortDirection === 'desc' ? 180 : 0,
    opacity: sortDirection ? 1 : 0,
  }}
  transition={{ duration: 0.2, ease: 'easeInOut' }}
>
  <ArrowUp className="h-4 w-4" />
</motion.div>

// Error shake (attention-grabbing)
<motion.div
  animate={{
    x: [0, -10, 10, -10, 10, 0],
    opacity: 1,
  }}
  transition={{
    x: { duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    opacity: { duration: 0.15 },
  }}
>
  <AlertCircle />
  <p>Error loading items</p>
</motion.div>

// Staggered row entrance
{rows.map((row, index) => (
  <motion.tr
    key={row.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.2,
      delay: Math.min(index * 0.05, 0.5),
      ease: 'easeOut',
    }}
  >
))}
```

### Reduced Motion Handling

```typescript
import { useReducedMotion } from 'framer-motion'

function DataTableRow({ row }: { row: Row }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.tr
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
    >
      {/* cells */}
    </motion.tr>
  )
}
```

Alternatively, Framer Motion **automatically respects** `prefers-reduced-motion` by default. When the user has reduced motion enabled, Framer Motion:
- Disables spring animations
- Reduces animation durations to near-instant
- Skips entrance/exit animations

### Tailwind Motion-Safe Utilities

```typescript
// Shimmer animation only when motion enabled
<div className="bg-muted motion-safe:animate-pulse rounded" />

// Transition only when motion enabled
<div className="motion-safe:transition-all motion-safe:duration-100" />

// Hover lift only when motion enabled
<th className="motion-safe:hover:-translate-y-[1px] motion-safe:transition-transform">
```

### Performance Considerations

**Best Practices:**
- Use `will-change` for frequently animated elements:
  ```typescript
  <motion.tr style={{ willChange: 'transform' }}>
  ```
- Limit stagger animation to first 10 rows
- Use CSS transforms (scale, translate) instead of width/height
- Avoid animating layout properties (margin, padding)
- Use `layoutId` for shared element transitions (future enhancement)

### Updated GalleryDataTable with Animations

```typescript
import { motion, useReducedMotion } from 'framer-motion'

export function GalleryDataTable<TItem>({
  items,
  columns,
  isLoading,
  error,
  onRowClick,
}: GalleryDataTableProps<TItem>) {
  const shouldReduceMotion = useReducedMotion()
  const table = useReactTable({ /* config */ })

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 0 }}
        animate={{
          opacity: 1,
          x: shouldReduceMotion ? 0 : [0, -10, 10, -10, 10, 0],
        }}
        transition={{
          opacity: { duration: 0.15 },
          x: { duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
        }}
      >
        <GalleryTableError error={error} />
      </motion.div>
    )
  }

  if (items.length === 0 && !isLoading) {
    return (
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <GalleryTableEmpty variant="no-items" />
      </motion.div>
    )
  }

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className={cn(
                  'px-4 py-3 text-left select-none',
                  'motion-safe:transition-all motion-safe:duration-100',
                  'motion-safe:hover:-translate-y-[1px] motion-safe:hover:shadow-sm',
                  header.column.getCanSort() && 'cursor-pointer'
                )}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex items-center gap-2">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        rotate: header.column.getIsSorted() === 'desc' ? 180 : 0,
                      }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </motion.div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row, index) => (
          <motion.tr
            key={row.id}
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: shouldReduceMotion ? 0 : Math.min(index * 0.05, 0.5),
              ease: 'easeOut',
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            onClick={() => onRowClick?.(row.original)}
            className="border-b transition-colors duration-100 hover:bg-accent/10 cursor-pointer"
            style={{ willChange: 'transform' }}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="px-4 py-3">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Testing

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock Framer Motion for testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => children,
  useReducedMotion: () => false,
}))

describe('GalleryDataTable - Animations', () => {
  it('applies hover background transition to rows', () => {
    render(<GalleryDataTable items={mockItems} columns={mockColumns} />)

    const firstRow = screen.getAllByRole('row')[1]
    expect(firstRow).toHaveClass('transition-colors', 'duration-100', 'hover:bg-accent/10')
  })

  it('applies whileTap scale animation to rows', () => {
    render(<GalleryDataTable items={mockItems} columns={mockColumns} />)

    const firstRow = screen.getAllByRole('row')[1]
    // Framer Motion props passed to motion.tr
    expect(firstRow).toHaveStyle({ willChange: 'transform' })
  })

  it('applies hover lift to column headers', () => {
    render(<GalleryDataTable items={mockItems} columns={mockColumns} />)

    const header = screen.getByRole('columnheader', { name: /title/i })
    expect(header).toHaveClass(
      'motion-safe:transition-all',
      'motion-safe:hover:-translate-y-[1px]'
    )
  })

  it('uses motion-safe prefix for skeleton shimmer', () => {
    render(<GalleryDataTableSkeleton columns={4} />)

    const skeletonCell = document.querySelector('.motion-safe\\:animate-pulse')
    expect(skeletonCell).toBeInTheDocument()
  })

  it('respects prefers-reduced-motion', () => {
    // Mock reduced motion preference
    vi.mock('framer-motion', () => ({
      useReducedMotion: () => true,
    }))

    render(<GalleryDataTable items={mockItems} columns={mockColumns} />)

    const firstRow = screen.getAllByRole('row')[1]
    // Should not have animation props when motion reduced
    expect(firstRow).not.toHaveAttribute('initial')
  })

  it('animates empty state with fade and slide', () => {
    render(<GalleryDataTable items={[]} columns={mockColumns} />)

    const emptyState = screen.getByText(/your wishlist is empty/i).closest('div')
    // Framer Motion initial/animate props applied
    expect(emptyState).toBeInTheDocument()
  })

  it('animates error state with shake', () => {
    const error = new Error('Failed to load')
    render(<GalleryDataTable items={[]} columns={mockColumns} error={error} />)

    const errorState = screen.getByText(/failed to load items/i).closest('div')
    // Framer Motion shake animation applied
    expect(errorState).toBeInTheDocument()
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] Row hover transitions smoothly (100ms)
- [ ] Row click gives scale feedback (150ms)
- [ ] Sort indicators fade + rotate (150-200ms)
- [ ] Column headers lift on hover (100ms)
- [ ] Skeleton shimmer respects `motion-safe:`
- [ ] Empty state fades + slides up (200ms)
- [ ] Error state shakes for attention (300ms)
- [ ] Row entrance staggered (50ms/row, max 10)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds
- [ ] Visual QA confirms smooth, polished feel

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
