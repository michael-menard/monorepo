# Story glry-1011: Multi-Column Sort (Max 2)

## Status

Draft

## Story

**As a** user viewing the datatable,
**I want** to add a secondary sort column while keeping my primary sort,
**so that** I can break ties with more complex sorting (e.g., sort by price ascending, then title alphabetically for items with the same price).

## Dependencies

- **glry-1010**: Single Column Sort (REQUIRED - extends single to multi)

## Acceptance Criteria

1. Maximum 2 columns sortable simultaneously (primary + secondary)
2. Click first column header: sets primary sort
3. Shift+click second column header: sets secondary sort
4. Visual indicators show sort priority (↑¹ for primary, ↑² for secondary)
5. Clicking a third column clears secondary, keeps new primary
6. Shift+click on primary column removes it, promotes secondary to primary
7. Regular click on any column resets to single-column sort
8. Sort state persists in URL: `?sort=price:asc,title:desc`
9. Keyboard accessible (Shift+Enter to add secondary sort)
10. Screen reader announces multi-column sort state

## Tasks / Subtasks

### Task 1: Enable Multi-Sort in TanStack Table (AC: 1, 2, 3)

- [ ] Update table config to allow multi-sort:
  ```typescript
  const table = useReactTable({
    // ... existing config
    enableMultiSort: true,
    maxMultiSortColCount: 2,
  })
  ```
- [ ] Detect Shift key in column toggle handler
- [ ] Regular click: replace all sorts with single column
- [ ] Shift+click: add secondary sort (max 2)

### Task 2: Update Visual Indicators (AC: 4)

- [ ] Show priority number with arrow: `↑¹` `↑²`
- [ ] Render superscript priority on sorted columns:
  ```typescript
  {column.getIsSorted() && (
    <div className="flex items-center">
      {column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />}
      <sup className="text-[10px] ml-0.5">{sortIndex + 1}</sup>
    </div>
  )}
  ```
- [ ] Grey out non-sorted columns
- [ ] Highlight sorted columns with accent background

### Task 3: Handle Sort Priority Logic (AC: 5, 6, 7)

- [ ] Click on third column: remove secondary, set new primary
- [ ] Shift+click on primary: remove primary, promote secondary
- [ ] Regular click: always reset to single sort
- [ ] Test all interaction combinations

### Task 4: Update URL Persistence (AC: 8)

- [ ] Extend `useSortFromURL` to handle array of sorts:
  ```typescript
  // URL format: ?sort=price:asc,title:desc
  const parsing = searchParams.get('sort')?.split(',').map(part => {
    const [id, desc] = part.split(':')
    return { id, desc: desc === 'desc' }
  })
  ```
- [ ] Write array back to URL as comma-separated
- [ ] Clear param when no sorts active

### Task 5: Update Column Header Component (AC: 2, 3, 7, 9)

- [ ] Detect Shift key in click handler:
  ```typescript
  onClick={(e) => {
    if (e.shiftKey) {
      column.toggleSorting(undefined, true) // multi-sort
    } else {
      column.toggleSorting(undefined, false) // replace
    }
  }}
  ```
- [ ] Detect Shift key in keyboard handler:
  ```typescript
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (e.shiftKey) {
        column.toggleSorting(undefined, true)
      } else {
        column.toggleSorting(undefined, false)
      }
    }
  }}
  ```

### Task 6: Add Accessibility Announcements (AC: 10)

- [ ] Update aria-live region for multi-sort:
  - "Sorted by Price ascending, then Title descending"
  - "Secondary sort added: Title descending"
  - "Sort reset to Price ascending only"
- [ ] Update column header aria-label:
  - "Price, primary sort ascending"
  - "Title, secondary sort descending"
- [ ] Add tooltip on hover: "Shift+click to add secondary sort"

### Task 7: Write Tests (AC: 1-10)

- [ ] Test regular click sets single sort
- [ ] Test Shift+click adds secondary sort
- [ ] Test maximum 2 columns enforced
- [ ] Test clicking third column replaces secondary
- [ ] Test Shift+click on primary promotes secondary
- [ ] Test URL persistence with multiple sorts
- [ ] Test keyboard Shift+Enter for secondary sort
- [ ] Test ARIA announcements for multi-sort
- [ ] Achieve 80% coverage

## Dev Notes

### Multi-Sort Configuration

[Source: https://tanstack.com/table/latest/docs/guide/sorting]

```typescript
import {
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'

const table = useReactTable({
  data,
  columns,
  state: { sorting },
  onSortingChange: setSorting,
  getSortedRowModel: getSortedRowModel(),
  enableSortingRemoval: true,
  enableMultiSort: true,        // Enable multi-column sorting
  maxMultiSortColCount: 2,      // Limit to 2 columns
  isMultiSortEvent: (e) => e.shiftKey, // Shift+click for multi-sort
})
```

### Updated Column Header Component

```typescript
function SortableHeader<TData>({
  column,
  children,
}: {
  column: Column<TData>
  children: React.ReactNode
}) {
  const sortDirection = column.getIsSorted()
  const sortIndex = column.getSortIndex()

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Add/toggle as secondary sort
      column.toggleSorting(undefined, true)
    } else {
      // Replace all sorts with this column
      column.toggleSorting(undefined, false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (e.shiftKey) {
        column.toggleSorting(undefined, true)
      } else {
        column.toggleSorting(undefined, false)
      }
    }
  }

  return (
    <th
      className={cn(
        'px-4 py-3 text-left cursor-pointer select-none',
        sortDirection && 'bg-accent/10',
        'hover:bg-muted'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : 'none'
      }
      aria-label={
        sortDirection
          ? `${children}, ${sortIndex === 0 ? 'primary' : 'secondary'} sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
          : `${children}, not sorted`
      }
      title="Click to sort, Shift+click to add secondary sort"
    >
      <div className="flex items-center gap-2">
        {children}
        {sortDirection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            {sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            )}
            <sup className="text-[10px] ml-0.5 font-semibold">
              {sortIndex + 1}
            </sup>
          </motion.div>
        )}
      </div>
    </th>
  )
}
```

### URL Persistence with Multiple Sorts

```typescript
export const useSortFromURL = (): [SortingState, (sorting: SortingState) => void] => {
  const [searchParams, setSearchParams] = useSearchParams()

  const sorting: SortingState = useMemo(() => {
    const sortParam = searchParams.get('sort')
    if (!sortParam) return []

    return sortParam.split(',').map(part => {
      const [id, desc] = part.split(':')
      return { id, desc: desc === 'desc' }
    })
  }, [searchParams])

  const setSorting = useCallback(
    (newSorting: SortingState) => {
      const params = new URLSearchParams(searchParams)

      if (newSorting.length === 0) {
        params.delete('sort')
      } else {
        const sortString = newSorting
          .map(({ id, desc }) => `${id}:${desc ? 'desc' : 'asc'}`)
          .join(',')
        params.set('sort', sortString)
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return [sorting, setSorting]
}
```

### Sort Priority Visualization

```
Primary Sort Only:
┌─────────────┬─────────────┐
│ Title ↑¹    │ Price       │  ← Primary ascending
└─────────────┴─────────────┘

Primary + Secondary Sort:
┌─────────────┬─────────────┐
│ Price ↑¹    │ Title ↑²    │  ← Primary asc, Secondary asc
└─────────────┴─────────────┘
```

### Sort Application Order

TanStack Table applies sorts in array order:

```typescript
sorting = [
  { id: 'price', desc: false },    // Applied FIRST (primary)
  { id: 'title', desc: false },    // Applied SECOND (secondary)
]

// Items sorted by price, then by title within same price
```

### Accessibility Announcements

```typescript
function useSortAnnouncement(sorting: SortingState) {
  const prevSorting = useRef<SortingState>([])

  useEffect(() => {
    if (sorting.length === 0) {
      announce('Sorting cleared')
    } else if (sorting.length === 1) {
      const { id, desc } = sorting[0]
      announce(`Sorted by ${id}, ${desc ? 'descending' : 'ascending'}`)
    } else if (sorting.length === 2) {
      const [primary, secondary] = sorting
      announce(
        `Sorted by ${primary.id} ${primary.desc ? 'descending' : 'ascending'}, ` +
        `then ${secondary.id} ${secondary.desc ? 'descending' : 'ascending'}`
      )
    }

    prevSorting.current = sorting
  }, [sorting])
}

function announce(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}
```

## Testing

```typescript
describe('GalleryDataTable - Multi-Column Sort', () => {
  it('sets primary sort on regular click', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    await user.click(screen.getByRole('button', { name: /price/i }))

    const priceHeader = screen.getByRole('button', { name: /price/i })
    expect(priceHeader).toHaveTextContent('↑¹')
    expect(priceHeader).toHaveAttribute('aria-label', expect.stringContaining('primary'))
  })

  it('adds secondary sort on Shift+click', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    // Primary sort
    await user.click(screen.getByRole('button', { name: /price/i }))

    // Secondary sort (Shift+click)
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /title/i }))
    await user.keyboard('{/Shift}')

    expect(screen.getByRole('button', { name: /price/i })).toHaveTextContent('↑¹')
    expect(screen.getByRole('button', { name: /title/i })).toHaveTextContent('↑²')
  })

  it('enforces maximum 2 columns', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    // Add primary
    await user.click(screen.getByRole('button', { name: /price/i }))

    // Add secondary
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /title/i }))

    // Try to add third (should replace secondary)
    await user.click(screen.getByRole('button', { name: /store/i }))
    await user.keyboard('{/Shift}')

    expect(screen.getByRole('button', { name: /price/i })).toHaveTextContent('↑¹')
    expect(screen.getByRole('button', { name: /store/i })).toHaveTextContent('↑²')
    expect(screen.getByRole('button', { name: /title/i })).not.toHaveTextContent('↑')
  })

  it('resets to single sort on regular click', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    // Set up multi-sort
    await user.click(screen.getByRole('button', { name: /price/i }))
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /title/i }))
    await user.keyboard('{/Shift}')

    // Regular click resets to single sort
    await user.click(screen.getByRole('button', { name: /store/i }))

    expect(screen.getByRole('button', { name: /store/i })).toHaveTextContent('↑¹')
    expect(screen.getByRole('button', { name: /price/i })).not.toHaveTextContent('↑')
    expect(screen.getByRole('button', { name: /title/i })).not.toHaveTextContent('↑')
  })

  it('persists multi-sort to URL', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    await user.click(screen.getByRole('button', { name: /price/i }))
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /title/i }))
    await user.keyboard('{/Shift}')

    expect(window.location.search).toContain('sort=price:asc,title:asc')
  })

  it('supports keyboard multi-sort with Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    priceHeader.focus()
    await user.keyboard('{Enter}')

    titleHeader.focus()
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(priceHeader).toHaveTextContent('↑¹')
    expect(titleHeader).toHaveTextContent('↑²')
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] Maximum 2 columns sortable simultaneously
- [ ] Shift+click adds secondary sort
- [ ] Regular click resets to single sort
- [ ] Visual priority indicators (↑¹ ↑²)
- [ ] URL persistence: `?sort=col1:dir,col2:dir`
- [ ] Keyboard accessible (Shift+Enter)
- [ ] ARIA announcements for multi-sort
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
