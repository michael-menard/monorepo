# Story glry-1010: Single Column Sort

## Status

Draft

## Story

**As a** user viewing the datatable,
**I want** to sort by clicking a column header,
**so that** I can organize items in ascending or descending order by a specific attribute.

## Dependencies

- **glry-1006**: Datatable Foundation - Wishlist Only (REQUIRED)

## Acceptance Criteria

1. Clicking a column header toggles sort: ascending → descending → removed
2. Visual indicator shows current sort state (↑/↓ arrows from lucide-react)
3. Only ONE column sortable at a time (multi-column in glry-1011)
4. Clicking a second column clears sort from the first column
5. Sort state persists in URL query params (`?sort=title:asc`)
6. Sort integrates with TanStack Table's `getSortedRowModel`
7. Column headers have hover state indicating sortability
8. Keyboard accessible (Enter/Space to toggle sort)
9. Screen reader announces sort state changes
10. Sort arrow transitions smoothly (Framer Motion)

## Tasks / Subtasks

### Task 1: Add Sort State to TanStack Table (AC: 1, 2, 3, 6)

- [ ] Import `getSortedRowModel` from TanStack Table
- [ ] Add sorting state to `useReactTable` config:
  ```typescript
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    // ... existing config
    state: { sorting },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false, // Single column only
  })
  ```
- [ ] Update column definitions with `enableSorting: true`
- [ ] Test sort cycles: none → asc → desc → none

### Task 2: Add Visual Sort Indicators (AC: 2, 7, 10)

- [ ] Import `ArrowUp`, `ArrowDown` from lucide-react
- [ ] Add sort indicator to column headers:
  ```typescript
  {column.getIsSorted() === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
  {column.getIsSorted() === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
  ```
- [ ] Add hover state to sortable headers: `hover:bg-muted cursor-pointer`
- [ ] Wrap arrow in `<motion.div>` with rotation/fade animation
- [ ] Rotation: 0° → 180° when toggling asc/desc
- [ ] Transition duration: 150ms ease-out

### Task 3: Persist Sort to URL (AC: 5)

- [ ] Create `useSortFromURL` hook:
  ```typescript
  const useSortFromURL = (): [SortingState, (sorting: SortingState) => void]
  ```
- [ ] Read `?sort=column:direction` from URL on mount
- [ ] Parse into TanStack Table `SortingState` format
- [ ] Update URL when sorting changes (without page reload)
- [ ] Format: `?sort=title:asc` or `?sort=price:desc`
- [ ] Clear param when sort removed: `?sort=` becomes ``

### Task 4: Clear Previous Sort (AC: 4)

- [ ] TanStack Table handles this with `enableMultiSort: false`
- [ ] Verify clicking column B clears sort from column A
- [ ] Test with all column combinations (title, price, store, priority)

### Task 5: Add Accessibility (AC: 8, 9)

- [ ] Add `role="button"` to sortable column headers
- [ ] Add `aria-sort` attribute:
  - `aria-sort="ascending"` when sorted asc
  - `aria-sort="descending"` when sorted desc
  - `aria-sort="none"` when not sorted
- [ ] Add keyboard handler:
  ```typescript
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      column.toggleSorting()
    }
  }}
  ```
- [ ] Add `aria-live="polite"` region announcing sort changes
- [ ] Screen reader text: "Sorted by Title, ascending"

### Task 6: Write Tests (AC: 1-10)

- [ ] Test clicking header cycles through sort states
- [ ] Test only one column sorted at a time
- [ ] Test URL sync (sort state → URL → sort state)
- [ ] Test keyboard activation (Enter, Space)
- [ ] Test ARIA attributes match sort state
- [ ] Test animations play on sort toggle
- [ ] Achieve 80% coverage

## Dev Notes

### TanStack Table Sorting

[Source: https://tanstack.com/table/latest/docs/guide/sorting]

```typescript
import {
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'

const [sorting, setSorting] = useState<SortingState>([])

const table = useReactTable({
  data,
  columns,
  state: {
    sorting,
  },
  onSortingChange: setSorting,
  getSortedRowModel: getSortedRowModel(),
  enableSortingRemoval: true,  // Allow toggling back to unsorted
  enableMultiSort: false,       // Single column only (glry-1011 enables this)
})
```

### Column Header Component

```typescript
function SortableHeader<TData>({
  column,
  children,
}: {
  column: Column<TData>
  children: React.ReactNode
}) {
  const sortDirection = column.getIsSorted()

  return (
    <th
      className="px-4 py-3 text-left hover:bg-muted cursor-pointer select-none"
      onClick={column.getToggleSortingHandler()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          column.toggleSorting()
        }
      }}
      role="button"
      tabIndex={0}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : 'none'
      }
    >
      <div className="flex items-center gap-2">
        {children}
        <motion.div
          initial={false}
          animate={{
            opacity: sortDirection ? 1 : 0,
            rotate: sortDirection === 'desc' ? 180 : 0,
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {sortDirection && <ArrowUp className="h-4 w-4" aria-hidden="true" />}
        </motion.div>
      </div>
    </th>
  )
}
```

### URL Persistence Hook

```typescript
import { useSearchParams } from 'react-router-dom'
import { SortingState } from '@tanstack/react-table'

export const useSortFromURL = (): [SortingState, (sorting: SortingState) => void] => {
  const [searchParams, setSearchParams] = useSearchParams()

  const sorting: SortingState = useMemo(() => {
    const sortParam = searchParams.get('sort')
    if (!sortParam) return []

    const [id, desc] = sortParam.split(':')
    return [{ id, desc: desc === 'desc' }]
  }, [searchParams])

  const setSorting = useCallback(
    (newSorting: SortingState) => {
      const params = new URLSearchParams(searchParams)

      if (newSorting.length === 0) {
        params.delete('sort')
      } else {
        const { id, desc } = newSorting[0]
        params.set('sort', `${id}:${desc ? 'desc' : 'asc'}`)
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return [sorting, setSorting]
}
```

### Integration Example

```typescript
function WishlistDataTable() {
  const [sorting, setSorting] = useSortFromURL()

  const table = useReactTable({
    data: items,
    columns: wishlistColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
    enableMultiSort: false,
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <SortableHeader key={header.id} column={header.column}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </SortableHeader>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>{/* rows */}</tbody>
    </table>
  )
}
```

## Testing

```typescript
describe('GalleryDataTable - Single Column Sort', () => {
  it('cycles through sort states on header click', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // First click: ascending
    await user.click(titleHeader)
    expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByText(mockItems[0].title)).toBeInTheDocument() // A-Z order

    // Second click: descending
    await user.click(titleHeader)
    expect(titleHeader).toHaveAttribute('aria-sort', 'descending')

    // Third click: removed
    await user.click(titleHeader)
    expect(titleHeader).toHaveAttribute('aria-sort', 'none')
  })

  it('clears sort from previous column when sorting new column', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    await user.click(screen.getByRole('button', { name: /title/i }))
    expect(screen.getByRole('button', { name: /title/i })).toHaveAttribute('aria-sort', 'ascending')

    await user.click(screen.getByRole('button', { name: /price/i }))
    expect(screen.getByRole('button', { name: /title/i })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('button', { name: /price/i })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('syncs sort state to URL', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<GalleryDataTable items={mockItems} />)

    await user.click(screen.getByRole('button', { name: /title/i }))

    expect(window.location.search).toContain('sort=title:asc')

    await user.click(screen.getByRole('button', { name: /title/i }))
    expect(window.location.search).toContain('sort=title:desc')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<GalleryDataTable items={mockItems} />)

    const titleHeader = screen.getByRole('button', { name: /title/i })
    titleHeader.focus()

    await user.keyboard('{Enter}')
    expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')

    await user.keyboard(' ')
    expect(titleHeader).toHaveAttribute('aria-sort', 'descending')
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] Single column sort working with TanStack Table
- [ ] Sort cycles: none → asc → desc → none
- [ ] Visual indicators (arrows) animate smoothly
- [ ] URL persistence working (`?sort=column:direction`)
- [ ] Only one column sorted at a time
- [ ] Keyboard accessible (Enter/Space)
- [ ] ARIA attributes correct (aria-sort, role)
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
