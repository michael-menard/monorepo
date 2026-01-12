# Story glry-1006: Datatable Foundation - Wishlist Only

## Status

Draft

## Story

**As a** wishlist user on desktop or tablet,
**I want** to view my wishlist items in a structured table format,
**so that** I can compare multiple attributes (price, store, priority) at a glance.

## Dependencies

- **glry-1004**: View Mode State Infrastructure (REQUIRED)
- **glry-1005**: View Toggle UI Component (REQUIRED)

## Acceptance Criteria

1. `GalleryDataTable` component renders items in table format
2. **Hardcoded columns for wishlist**: title, price, store, priority (composable architecture comes in glry-1012)
3. Table built on TanStack Table v8 + shadcn Data Table
4. Row clicks navigate to detail view (same as card clicks)
5. Infinite scroll pagination integrated
6. Component not rendered on mobile (< 768px)
7. Proper semantic HTML (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`)
8. ARIA labels for accessibility
9. Keyboard navigation (Tab to focus rows, Enter to navigate)
10. Responsive: horizontal scroll if table wider than viewport
11. Component only works with wishlist gallery initially (sets/mocs integration comes later)
12. No sorting yet (comes in glry-1010)

## Tasks / Subtasks

### Task 1: Install and Configure TanStack Table (AC: 3)

- [ ] Add `@tanstack/react-table@^8` to `packages/core/gallery/package.json`
- [ ] Run `pnpm install` to install dependency
- [ ] Verify TanStack Table v8 installed correctly
- [ ] Add type imports from `@tanstack/react-table`

### Task 2: Create GalleryDataTable Component Foundation (AC: 1, 3, 6, 7)

- [ ] Create `packages/core/gallery/src/components/GalleryDataTable.tsx`
- [ ] Define Zod schema for props:
  - `items: z.array(z.any())` (generic item array)
  - `isLoading?: z.boolean()`
  - `onRowClick: z.function()`
  - `className?: z.string()`
- [ ] Import TanStack Table hooks (`useReactTable`, `getCoreRowModel`)
- [ ] Create table instance with TanStack Table
- [ ] Render semantic HTML table structure
- [ ] Wrap in responsive container with `hidden md:block`
- [ ] Add `overflow-x-auto` for horizontal scroll

### Task 3: Define Hardcoded Wishlist Columns (AC: 2)

- [ ] Create column definitions array for wishlist items
- [ ] **Title column**: Display item title, left-aligned
- [ ] **Price column**: Display formatted price with currency, right-aligned
- [ ] **Store column**: Display store name (LEGO, Barweer, etc.), center-aligned
- [ ] **Priority column**: Display priority badge (0-5 stars), center-aligned
- [ ] Use TanStack Table `createColumnHelper` for type safety
- [ ] Add column widths: title (40%), price (20%), store (20%), priority (20%)

### Task 4: Implement Row Click Navigation (AC: 4)

- [ ] Add `onClick` handler to `<tr>` elements
- [ ] Call `onRowClick(item)` with clicked item data
- [ ] Add hover state styles (`hover:bg-accent/5`)
- [ ] Add cursor pointer on hover
- [ ] Add focus-visible state for keyboard navigation
- [ ] Prevent row click when clicking sortable headers (future-proofing)

### Task 5: Add Infinite Scroll Pagination (AC: 5)

- [ ] Accept `onLoadMore` and `hasMore` props
- [ ] Create Intersection Observer for bottom of table
- [ ] Trigger `onLoadMore()` when 200px from bottom
- [ ] Show loading indicator at table footer when loading more
- [ ] Disconnect observer when no more items

### Task 6: Add Keyboard Navigation (AC: 9)

- [ ] Make table rows focusable with `tabIndex={0}`
- [ ] Add `onKeyDown` handler to rows
- [ ] Enter key: Navigate to detail view
- [ ] Space key: Navigate to detail view
- [ ] Arrow keys: Move focus between rows (optional enhancement)
- [ ] Ensure focus ring visible on keyboard focus

### Task 7: Add ARIA Labels and Semantic Attributes (AC: 8)

- [ ] Add `role="table"` to table container
- [ ] Add `aria-label="Wishlist items table"` to table
- [ ] Add `aria-rowcount` and `aria-colcount` attributes
- [ ] Add `aria-label` to each column header
- [ ] Add `aria-live="polite"` to loading indicator
- [ ] Test with screen reader (VoiceOver or NVDA)

### Task 8: Integrate with Wishlist Gallery (AC: 11)

- [ ] Import `GalleryDataTable` in wishlist gallery component
- [ ] Conditionally render based on `viewMode`:
  - `viewMode === 'grid'` → `<GalleryGrid>`
  - `viewMode === 'datatable'` → `<GalleryDataTable>`
- [ ] Pass wishlist items to `items` prop
- [ ] Wire up `onRowClick` to navigate to detail page
- [ ] Connect infinite scroll to existing pagination hook
- [ ] Verify view switching works correctly

### Task 9: Style Table with Tailwind (AC: 10)

- [ ] Use Tailwind classes for all styling (no custom CSS)
- [ ] Table borders: `border-b` on rows
- [ ] Column padding: `px-4 py-3`
- [ ] Header styling: `font-semibold text-sm`
- [ ] Row hover: `hover:bg-accent/5 transition-colors`
- [ ] Responsive container: `overflow-x-auto`
- [ ] Min row height: 44px for touch targets

### Task 10: Write Comprehensive Tests (AC: 1-12)

- [ ] Create `__tests__/GalleryDataTable.test.tsx`
- [ ] Test table renders with items
- [ ] Test table shows hardcoded columns (title, price, store, priority)
- [ ] Test row click calls onRowClick handler
- [ ] Test keyboard navigation (Enter key navigates)
- [ ] Test infinite scroll triggers onLoadMore
- [ ] Test table hidden on mobile (< 768px)
- [ ] Test ARIA labels present
- [ ] Test hover state applied to rows
- [ ] Test semantic HTML structure (`<table>`, `<thead>`, `<tbody>`)
- [ ] Test horizontal scroll works when table wide
- [ ] Achieve minimum 80% coverage

## Dev Notes

### Technology Stack

[Source: docs/architecture/tech-stack.md]

- **TanStack Table**: v8 - Headless table logic
- **shadcn/ui**: Data Table components built on TanStack Table
- **React**: 19.0.0
- **Tailwind CSS**: 4.1.11 - All styling
- **Zod**: Schema validation

### TanStack Table v8 Setup

[Source: docs/front-end-spec-gallery-datatable.md#component-library--design-system]

**Installation:**
```bash
cd packages/core/gallery
pnpm add @tanstack/react-table@^8
```

**Basic Usage Pattern:**
```typescript
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'

// Define column helper for type safety
const columnHelper = createColumnHelper<WishlistItem>()

// Define columns
const columns: ColumnDef<WishlistItem>[] = [
  columnHelper.accessor('title', {
    header: 'Title',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('price', {
    header: 'Price',
    cell: info => formatCurrency(info.getValue(), info.row.original.currency),
  }),
  // ... more columns
]

// Create table instance
const table = useReactTable({
  data: items,
  columns,
  getCoreRowModel: getCoreRowModel(),
})

// Render
return (
  <table>
    <thead>
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th key={header.id}>
              {flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          ))}
        </tr>
      ))}
    </thead>
    <tbody>
      {table.getRowModel().rows.map(row => (
        <tr key={row.id} onClick={() => handleRowClick(row.original)}>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)
```

### Wishlist Item Schema

The wishlist item schema already exists from previous stories:

```typescript
// From @repo/api-client/schemas/wishlist.ts
const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  setNumber: z.string().optional(),
  store: z.string(), // 'LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'
  sourceUrl: z.string().url().optional(),
  price: z.number().optional(),
  currency: z.string().default('USD'),
  pieceCount: z.number().optional(),
  priority: z.number().min(0).max(5), // 0-5 (0=none, 5=must have)
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

type WishlistItem = z.infer<typeof WishlistItemSchema>
```

### Column Definitions with Formatting

```typescript
import { createColumnHelper } from '@tanstack/react-table'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'

const columnHelper = createColumnHelper<WishlistItem>()

const wishlistColumns = [
  // Title column - 40% width
  columnHelper.accessor('title', {
    header: 'Title',
    cell: info => (
      <div className="font-medium text-foreground truncate">
        {info.getValue()}
      </div>
    ),
    size: 400, // 40% of 1000 (TanStack Table uses numbers, convert to % in CSS)
  }),

  // Price column - 20% width, right-aligned
  columnHelper.accessor('price', {
    header: 'Price',
    cell: info => {
      const price = info.getValue()
      const currency = info.row.original.currency
      return (
        <div className="text-right">
          {price ? formatCurrency(price, currency) : '—'}
        </div>
      )
    },
    size: 200,
  }),

  // Store column - 20% width, center-aligned
  columnHelper.accessor('store', {
    header: 'Store',
    cell: info => (
      <div className="text-center">
        <span className="inline-block px-2 py-1 text-xs rounded bg-muted">
          {info.getValue()}
        </span>
      </div>
    ),
    size: 200,
  }),

  // Priority column - 20% width, center-aligned
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: info => {
      const priority = info.getValue()
      return (
        <div className="flex justify-center">
          <PriorityBadge level={priority} size="sm" />
        </div>
      )
    },
    size: 200,
  }),
]
```

### Infinite Scroll with Intersection Observer

```typescript
import { useEffect, useRef } from 'react'

const useInfiniteScroll = (
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading: boolean,
) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMore || isLoading) return

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '200px' } // Trigger 200px before reaching bottom
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [onLoadMore, hasMore, isLoading])

  return sentinelRef
}

// Usage in component:
const sentinelRef = useInfiniteScroll(onLoadMore, hasMore, isLoading)

return (
  <div>
    <table>{/* table content */}</table>
    {hasMore && (
      <div ref={sentinelRef} className="h-1" aria-live="polite">
        {isLoading && <LoadingSpinner />}
      </div>
    )}
  </div>
)
```

### Accessibility Requirements

[Source: docs/front-end-spec-gallery-datatable.md#accessibility-requirements]

**Keyboard Navigation:**
- Tab: Focus next row
- Shift+Tab: Focus previous row
- Enter/Space: Navigate to detail view
- Escape: Clear focus

**Screen Reader Support:**
- Table semantics: `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`
- `aria-label` on table: "Wishlist items table"
- `aria-rowcount` and `aria-colcount` attributes
- `aria-live="polite"` for loading states

**Touch Targets:**
- Minimum 44px row height
- Adequate spacing between rows (no cramped layout)

### Responsive Behavior

[Source: docs/front-end-spec-gallery-datatable.md#spacing--layout]

```tsx
<div className="hidden md:block overflow-x-auto">
  <table className="min-w-full">
    {/* Only renders on tablet/desktop (>= 768px) */}
  </table>
</div>
```

### Integration Example

```typescript
// apps/web/app-wishlist-gallery/src/pages/gallery-page.tsx
import { useViewMode } from '@repo/gallery'
import { GalleryGrid, GalleryDataTable } from '@repo/gallery'
import { useGetWishlistQuery } from '@repo/api-client/rtk/wishlist-gallery-api'
import { useNavigate } from '@tanstack/react-router'

export function WishlistGalleryPage() {
  const [viewMode] = useViewMode('wishlist')
  const navigate = useNavigate()
  const { data, isLoading } = useGetWishlistQuery()

  const handleRowClick = (item: WishlistItem) => {
    navigate({ to: `/wishlist/${item.id}` })
  }

  return (
    <div>
      <GalleryFilterBar>
        {/* filters and view toggle */}
      </GalleryFilterBar>

      {viewMode === 'grid' && (
        <GalleryGrid items={data?.items ?? []} />
      )}

      {viewMode === 'datatable' && (
        <GalleryDataTable
          items={data?.items ?? []}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  )
}
```

### Previous Story Context

**glry-1004 (View Mode State Infrastructure):**
- `useViewMode(galleryType)` hook available
- `ViewMode` type: `'grid' | 'datatable'`
- localStorage persistence working

**glry-1005 (View Toggle UI):**
- `GalleryViewToggle` component available
- Integrated with `GalleryFilterBar`
- View switching triggers re-render

**Use these in glry-1006:**
- Conditionally render `GalleryDataTable` when `viewMode === 'datatable'`
- Table only shows when user explicitly switches to table view

## Testing

[Source: docs/architecture/testing-strategy.md]

### Test Framework

- **Vitest** with React Testing Library
- Test files: `__tests__/GalleryDataTable.test.tsx`
- Minimum coverage: 80%
- Mock TanStack Table if needed

### Required Test Cases

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryDataTable } from '../GalleryDataTable'

const mockItems = [
  {
    id: '1',
    title: 'LEGO Castle',
    price: 99.99,
    currency: 'USD',
    store: 'LEGO',
    priority: 5,
  },
  {
    id: '2',
    title: 'Modular Building',
    price: 149.99,
    currency: 'USD',
    store: 'Barweer',
    priority: 3,
  },
]

describe('GalleryDataTable', () => {
  it('renders table with items', () => {
    render(
      <GalleryDataTable
        items={mockItems}
        onRowClick={vi.fn()}
      />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('LEGO Castle')).toBeInTheDocument()
    expect(screen.getByText('Modular Building')).toBeInTheDocument()
  })

  it('displays hardcoded columns', () => {
    render(
      <GalleryDataTable
        items={mockItems}
        onRowClick={vi.fn()}
      />
    )

    // Check column headers
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Store')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  it('calls onRowClick when row clicked', async () => {
    const user = userEvent.setup()
    const mockOnRowClick = vi.fn()

    render(
      <GalleryDataTable
        items={mockItems}
        onRowClick={mockOnRowClick}
      />
    )

    // Click first row
    const firstRow = screen.getByText('LEGO Castle').closest('tr')
    await user.click(firstRow!)

    expect(mockOnRowClick).toHaveBeenCalledWith(mockItems[0])
  })

  it('navigates on Enter key press', async () => {
    const user = userEvent.setup()
    const mockOnRowClick = vi.fn()

    render(
      <GalleryDataTable
        items={mockItems}
        onRowClick={mockOnRowClick}
      />
    )

    const firstRow = screen.getByText('LEGO Castle').closest('tr')
    firstRow?.focus()
    await user.keyboard('{Enter}')

    expect(mockOnRowClick).toHaveBeenCalledWith(mockItems[0])
  })

  it('triggers onLoadMore when scrolled to bottom', async () => {
    const mockOnLoadMore = vi.fn()

    render(
      <GalleryDataTable
        items={mockItems}
        onRowClick={vi.fn()}
        onLoadMore={mockOnLoadMore}
        hasMore={true}
      />
    )

    // Simulate intersection observer triggering
    // (Requires mocking IntersectionObserver)
    // Test implementation here
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] `GalleryDataTable` component created and exported
- [ ] TanStack Table v8 installed and configured
- [ ] Hardcoded wishlist columns (title, price, store, priority) implemented
- [ ] Row click navigation working
- [ ] Infinite scroll pagination integrated
- [ ] Keyboard navigation (Tab, Enter) working
- [ ] ARIA labels and semantic HTML verified
- [ ] Responsive behavior (hidden on mobile) confirmed
- [ ] Integrated with wishlist gallery
- [ ] All tests passing (minimum 80% coverage)
- [ ] TypeScript compilation succeeds
- [ ] Code follows functional programming paradigm

---

## Change Log

| Date       | Version | Description                       | Author |
| ---------- | ------- | --------------------------------- | ------ |
| 2025-12-28 | 0.1     | Initial draft for glry-1006 story | Bob (SM) |
