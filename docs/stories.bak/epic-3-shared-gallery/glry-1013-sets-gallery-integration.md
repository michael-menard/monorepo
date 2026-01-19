# Story glry-1013: Sets Gallery Integration

## Status

Draft

## Story

**As a** user viewing my sets collection,
**I want** to toggle between grid and datatable views,
**so that** I can browse sets visually or sort/compare them in a table format.

## Dependencies

- **glry-1004**: View Mode State Infrastructure (REQUIRED - view mode hook)
- **glry-1005**: View Toggle UI Component (REQUIRED - toggle button)
- **glry-1012**: Composable Column Configuration (REQUIRED - generic datatable)
- **Epic 7 - Sets Gallery**: Sets data model and API endpoints must exist

## Acceptance Criteria

1. Sets gallery page supports both grid and datatable view modes
2. View mode persists to localStorage with key `gallery_view_mode_sets`
3. Grid view uses existing `SetCard` component
4. Datatable view shows columns: Set #, Name, Pieces, Build Status
5. Clicking table row navigates to set detail page
6. `GalleryViewToggle` integrated into sets gallery filter bar
7. Smooth transition animation between grid and datatable (150ms fade)
8. URL persistence: `?view=grid` or `?view=datatable`

## Tasks / Subtasks

### Task 1: Define Sets Column Configuration (AC: 4)

- [ ] Create `apps/web/app-sets-gallery/src/columns/sets-columns.tsx`
- [ ] Define columns using `createGalleryColumns<SetItem>()`:
  - Set # (setNumber) - 150px, monospace font
  - Name (name) - 400px, medium font
  - Pieces (pieceCount) - 150px, formatted with commas
  - Build Status (buildStatus) - 200px, badge component
- [ ] Custom cell renderers for badge styling
- [ ] Export `setsColumns` array

### Task 2: Integrate View Mode State (AC: 1, 2, 8)

- [ ] Import `useViewMode` hook in sets gallery page component
- [ ] Initialize with gallery type 'sets':
  ```typescript
  const [viewMode, setViewMode] = useViewMode('sets')
  ```
- [ ] Verify localStorage key is `gallery_view_mode_sets`
- [ ] Verify URL param syncs with view mode

### Task 3: Add View Toggle to Filter Bar (AC: 6)

- [ ] Import `GalleryViewToggle` component
- [ ] Add to sets gallery `GalleryFilterBar` (right side):
  ```typescript
  <GalleryFilterBar>
    {/* Existing filters */}
    <GalleryViewToggle
      currentView={viewMode}
      onViewChange={setViewMode}
    />
  </GalleryFilterBar>
  ```
- [ ] Verify toggle hidden on mobile (< 768px)
- [ ] Verify first-time hint tooltip works

### Task 4: Implement Conditional View Rendering (AC: 3, 4, 5, 7)

- [ ] Conditionally render grid or datatable:
  ```typescript
  <AnimatePresence mode="wait">
    {viewMode === 'grid' ? (
      <motion.div
        key="grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <GalleryGrid items={sets}>
          {(set) => <SetCard set={set} />}
        </GalleryGrid>
      </motion.div>
    ) : (
      <motion.div
        key="datatable"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <GalleryDataTable
          items={sets}
          columns={setsColumns}
          onRowClick={(set) => navigate(`/sets/${set.id}`)}
        />
      </motion.div>
    )}
  </AnimatePresence>
  ```

### Task 5: Handle Row Click Navigation (AC: 5)

- [ ] Add row click handler to navigate to detail page
- [ ] Use `useNavigate` from react-router-dom
- [ ] Navigate to `/sets/{setId}` on row click
- [ ] Test navigation works with keyboard (Enter on focused row)

### Task 6: Write Tests (AC: 1-8)

- [ ] Test view mode defaults to grid
- [ ] Test clicking toggle switches to datatable
- [ ] Test view mode persists to localStorage (`gallery_view_mode_sets`)
- [ ] Test datatable renders with sets columns
- [ ] Test clicking row navigates to detail page
- [ ] Test grid view renders SetCard components
- [ ] Test fade transition animation between views
- [ ] Test URL sync: `?view=datatable`
- [ ] Achieve 80% coverage

## Dev Notes

### Sets Column Configuration

```typescript
// apps/web/app-sets-gallery/src/columns/sets-columns.tsx
import { createGalleryColumns } from '@repo/gallery'
import { SetItem } from '@repo/api-client/schemas/sets'
import { Badge } from '@repo/ui'

const columnHelper = createGalleryColumns<SetItem>()

export const setsColumns = [
  columnHelper.accessor('setNumber', {
    header: 'Set #',
    size: 150,
    cell: (info) => (
      <span className="font-mono text-sm text-foreground">
        {info.getValue()}
      </span>
    ),
  }),

  columnHelper.accessor('name', {
    header: 'Name',
    size: 400,
    cell: (info) => (
      <div className="font-medium text-sm">{info.getValue()}</div>
    ),
  }),

  columnHelper.accessor('pieceCount', {
    header: 'Pieces',
    size: 150,
    cell: (info) => {
      const count = info.getValue()
      return count ? (
        <span className="text-sm tabular-nums">
          {count.toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
  }),

  columnHelper.accessor('buildStatus', {
    header: 'Build Status',
    size: 200,
    cell: (info) => {
      const status = info.getValue()
      const variantMap = {
        complete: 'default',
        'in-progress': 'secondary',
        planned: 'outline',
      }
      return (
        <Badge variant={variantMap[status] || 'outline'}>
          {status?.replace('-', ' ') || 'Unknown'}
        </Badge>
      )
    },
  }),
]
```

### Sets Gallery Page Integration

```typescript
// apps/web/app-sets-gallery/src/pages/gallery-page.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useViewMode, GalleryViewToggle, GalleryDataTable } from '@repo/gallery'
import { GalleryFilterBar } from '../components/GalleryFilterBar'
import { GalleryGrid } from '../components/GalleryGrid'
import { SetCard } from '../components/SetCard'
import { useGetSetsQuery } from '@repo/api-client'
import { setsColumns } from '../columns/sets-columns'

export function SetsGalleryPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useGetSetsQuery()
  const [viewMode, setViewMode] = useViewMode('sets')
  const [searchTerm, setSearchTerm] = useState('')

  const sets = data?.items ?? []
  const filteredSets = sets.filter(set =>
    set.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Sets</h1>
        <button
          onClick={() => navigate('/sets/add')}
          className="btn-primary"
        >
          Add Set
        </button>
      </div>

      <GalleryFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      >
        <GalleryViewToggle
          currentView={viewMode}
          onViewChange={setViewMode}
        />
      </GalleryFilterBar>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <GalleryGrid items={filteredSets} isLoading={isLoading}>
              {(set) => (
                <SetCard
                  set={set}
                  onClick={() => navigate(`/sets/${set.id}`)}
                />
              )}
            </GalleryGrid>
          </motion.div>
        ) : (
          <motion.div
            key="datatable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <GalleryDataTable
              items={filteredSets}
              columns={setsColumns}
              isLoading={isLoading}
              onRowClick={(set) => navigate(`/sets/${set.id}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### View Mode Persistence

```typescript
// localStorage key pattern from glry-1004
const storageKey = `gallery_view_mode_sets`

// Saved as: "grid" or "datatable"
// Read on mount, written on every view change
```

### Animation Timing

[Source: docs/front-end-spec-gallery-datatable.md#animation--micro-interactions]

- **Duration**: 150ms
- **Easing**: ease-out
- **Type**: Opacity fade (crossfade between views)
- **Mode**: `wait` - exit animation completes before enter starts
- **Respects**: `prefers-reduced-motion` (Framer Motion handles automatically)

### File Structure

```
apps/web/app-sets-gallery/src/
  columns/
    sets-columns.tsx          # Column definitions
  components/
    SetCard.tsx               # Grid view card (existing)
    GalleryFilterBar.tsx      # Filter bar (existing)
    GalleryGrid.tsx           # Grid container (existing)
  pages/
    gallery-page.tsx          # Updated with view mode
```

## Testing

```typescript
describe('Sets Gallery - View Mode Integration', () => {
  it('defaults to grid view', () => {
    render(<SetsGalleryPage />)
    expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('switches to datatable view on toggle click', async () => {
    const user = userEvent.setup()
    render(<SetsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-grid')).not.toBeInTheDocument()
  })

  it('persists view mode to localStorage', async () => {
    const user = userEvent.setup()
    render(<SetsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(localStorage.getItem('gallery_view_mode_sets')).toBe('datatable')
  })

  it('renders sets datatable with correct columns', async () => {
    const user = userEvent.setup()
    render(<SetsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(screen.getByRole('columnheader', { name: /set #/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /pieces/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /build status/i })).toBeInTheDocument()
  })

  it('navigates to detail page on row click', async () => {
    const user = userEvent.setup()
    const mockNavigate = vi.fn()
    vi.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }))

    render(<SetsGalleryPage />)
    await user.click(screen.getByRole('button', { name: /table view/i }))

    const firstRow = screen.getAllByRole('row')[1] // Skip header
    await user.click(firstRow)

    expect(mockNavigate).toHaveBeenCalledWith('/sets/set-id-123')
  })

  it('renders grid view with SetCard components', () => {
    const mockSets = [
      { id: '1', setNumber: '10292', name: 'The Friends Apartments', pieceCount: 2048 },
    ]

    render(<SetsGalleryPage />)

    expect(screen.getByText('10292')).toBeInTheDocument()
    expect(screen.getByText('The Friends Apartments')).toBeInTheDocument()
  })

  it('syncs view mode to URL', async () => {
    const user = userEvent.setup()
    render(<SetsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(window.location.search).toContain('view=datatable')
  })

  it('animates transition between views', async () => {
    const user = userEvent.setup()
    render(<SetsGalleryPage />)

    const gridView = screen.getByTestId('gallery-grid')
    expect(gridView).toHaveStyle({ opacity: '1' })

    await user.click(screen.getByRole('button', { name: /table view/i }))

    // Framer Motion will animate opacity 0 → 1
    await waitFor(() => {
      expect(screen.getByRole('table')).toHaveStyle({ opacity: '1' })
    })
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] Sets gallery supports grid and datatable views
- [ ] View mode persists to localStorage (`gallery_view_mode_sets`)
- [ ] Datatable shows Set #, Name, Pieces, Build Status columns
- [ ] Row click navigates to set detail page
- [ ] `GalleryViewToggle` integrated into filter bar
- [ ] Smooth fade transition (150ms) between views
- [ ] URL persistence: `?view=datatable`
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
