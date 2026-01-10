# Story glry-1014: MOCs Gallery Integration

## Status

Draft

## Story

**As a** user viewing my MOC instructions collection,
**I want** to toggle between grid and datatable views,
**so that** I can browse instructions visually or sort/compare them by difficulty, status, or date.

## Dependencies

- **glry-1004**: View Mode State Infrastructure (REQUIRED - view mode hook)
- **glry-1005**: View Toggle UI Component (REQUIRED - toggle button)
- **glry-1012**: Composable Column Configuration (REQUIRED - generic datatable)
- **Epic 4 - Instructions Gallery**: MOC data model and API endpoints must exist

## Acceptance Criteria

1. MOCs/Instructions gallery page supports both grid and datatable view modes
2. View mode persists to localStorage with key `gallery_view_mode_instructions`
3. Grid view uses existing `InstructionsCard` component
4. Datatable view shows columns: Title, Difficulty, Status, Created Date
5. Clicking table row navigates to MOC detail/edit page
6. `GalleryViewToggle` integrated into instructions gallery filter bar
7. Smooth transition animation between grid and datatable (150ms fade)
8. URL persistence: `?view=grid` or `?view=datatable`

## Tasks / Subtasks

### Task 1: Define MOCs Column Configuration (AC: 4)

- [ ] Create `apps/web/app-instructions-gallery/src/columns/mocs-columns.tsx`
- [ ] Define columns using `createGalleryColumns<MocItem>()`:
  - Title (title) - 400px, medium font
  - Difficulty (difficulty) - 150px, color-coded badge
  - Status (status) - 200px, badge component
  - Created (createdAt) - 200px, formatted date
- [ ] Custom cell renderers for difficulty badges (beginner=green, intermediate=yellow, advanced=red)
- [ ] Export `mocsColumns` array

### Task 2: Integrate View Mode State (AC: 1, 2, 8)

- [ ] Import `useViewMode` hook in instructions gallery page component
- [ ] Initialize with gallery type 'instructions':
  ```typescript
  const [viewMode, setViewMode] = useViewMode('instructions')
  ```
- [ ] Verify localStorage key is `gallery_view_mode_instructions`
- [ ] Verify URL param syncs with view mode

### Task 3: Add View Toggle to Filter Bar (AC: 6)

- [ ] Import `GalleryViewToggle` component
- [ ] Add to instructions gallery `GalleryFilterBar` (right side):
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
        <GalleryGrid items={mocs}>
          {(moc) => <InstructionsCard moc={moc} />}
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
          items={mocs}
          columns={mocsColumns}
          onRowClick={(moc) => navigate(`/instructions/${moc.slug}/edit`)}
        />
      </motion.div>
    )}
  </AnimatePresence>
  ```

### Task 5: Handle Row Click Navigation (AC: 5)

- [ ] Add row click handler to navigate to edit page
- [ ] Use `useNavigate` from react-router-dom
- [ ] Navigate to `/instructions/{slug}/edit` on row click
- [ ] Test navigation works with keyboard (Enter on focused row)

### Task 6: Write Tests (AC: 1-8)

- [ ] Test view mode defaults to grid
- [ ] Test clicking toggle switches to datatable
- [ ] Test view mode persists to localStorage (`gallery_view_mode_instructions`)
- [ ] Test datatable renders with MOCs columns
- [ ] Test clicking row navigates to edit page
- [ ] Test grid view renders InstructionsCard components
- [ ] Test fade transition animation between views
- [ ] Test URL sync: `?view=datatable`
- [ ] Achieve 80% coverage

## Dev Notes

### MOCs Column Configuration

```typescript
// apps/web/app-instructions-gallery/src/columns/mocs-columns.tsx
import { createGalleryColumns, createDateColumn } from '@repo/gallery'
import { MocItem } from '@repo/api-client/schemas/mocs'
import { Badge } from '@repo/ui'
import { format } from 'date-fns'

const columnHelper = createGalleryColumns<MocItem>()

export const mocsColumns = [
  columnHelper.accessor('title', {
    header: 'Title',
    size: 400,
    cell: (info) => (
      <div className="font-medium text-sm">{info.getValue()}</div>
    ),
  }),

  columnHelper.accessor('difficulty', {
    header: 'Difficulty',
    size: 150,
    cell: (info) => {
      const difficulty = info.getValue()
      const styleMap = {
        beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      }
      return (
        <Badge className={styleMap[difficulty] || 'bg-gray-100'}>
          {difficulty || 'Unknown'}
        </Badge>
      )
    },
  }),

  columnHelper.accessor('status', {
    header: 'Status',
    size: 200,
    cell: (info) => {
      const status = info.getValue()
      const variantMap = {
        published: 'default',
        draft: 'secondary',
        archived: 'outline',
      }
      return (
        <Badge variant={variantMap[status] || 'outline'}>
          {status || 'Draft'}
        </Badge>
      )
    },
  }),

  columnHelper.accessor('createdAt', {
    header: 'Created',
    size: 200,
    cell: (info) => {
      const date = info.getValue()
      if (!date) return <span className="text-muted-foreground text-sm">-</span>

      return (
        <span className="text-sm tabular-nums">
          {format(new Date(date), 'MMM d, yyyy')}
        </span>
      )
    },
  }),
]
```

### Instructions Gallery Page Integration

```typescript
// apps/web/app-instructions-gallery/src/pages/gallery-page.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useViewMode, GalleryViewToggle, GalleryDataTable } from '@repo/gallery'
import { GalleryFilterBar } from '../components/GalleryFilterBar'
import { GalleryGrid } from '../components/GalleryGrid'
import { InstructionsCard } from '../components/InstructionsCard'
import { useGetMocsQuery } from '@repo/api-client'
import { mocsColumns } from '../columns/mocs-columns'

export function InstructionsGalleryPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useGetMocsQuery()
  const [viewMode, setViewMode] = useViewMode('instructions')
  const [searchTerm, setSearchTerm] = useState('')

  const mocs = data?.items ?? []
  const filteredMocs = mocs.filter(moc =>
    moc.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Instructions</h1>
        <button
          onClick={() => navigate('/instructions/create')}
          className="btn-primary"
        >
          Create Instructions
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
            <GalleryGrid items={filteredMocs} isLoading={isLoading}>
              {(moc) => (
                <InstructionsCard
                  moc={moc}
                  onClick={() => navigate(`/instructions/${moc.slug}/edit`)}
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
              items={filteredMocs}
              columns={mocsColumns}
              isLoading={isLoading}
              onRowClick={(moc) => navigate(`/instructions/${moc.slug}/edit`)}
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
const storageKey = `gallery_view_mode_instructions`

// Saved as: "grid" or "datatable"
// Read on mount, written on every view change
```

### Difficulty Badge Styling

```typescript
// Color system for difficulty levels
const difficultyStyles = {
  beginner: {
    light: 'bg-green-100 text-green-800',
    dark: 'bg-green-900 text-green-200',
  },
  intermediate: {
    light: 'bg-yellow-100 text-yellow-800',
    dark: 'bg-yellow-900 text-yellow-200',
  },
  advanced: {
    light: 'bg-red-100 text-red-800',
    dark: 'bg-red-900 text-red-200',
  },
}

// Applied with Tailwind dark mode: className="bg-green-100 dark:bg-green-900"
```

### File Structure

```
apps/web/app-instructions-gallery/src/
  columns/
    mocs-columns.tsx              # Column definitions
  components/
    InstructionsCard.tsx          # Grid view card (existing)
    GalleryFilterBar.tsx          # Filter bar (existing)
    GalleryGrid.tsx               # Grid container (existing)
  pages/
    gallery-page.tsx              # Updated with view mode
```

## Testing

```typescript
describe('Instructions Gallery - View Mode Integration', () => {
  it('defaults to grid view', () => {
    render(<InstructionsGalleryPage />)
    expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('switches to datatable view on toggle click', async () => {
    const user = userEvent.setup()
    render(<InstructionsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByTestId('gallery-grid')).not.toBeInTheDocument()
  })

  it('persists view mode to localStorage', async () => {
    const user = userEvent.setup()
    render(<InstructionsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(localStorage.getItem('gallery_view_mode_instructions')).toBe('datatable')
  })

  it('renders MOCs datatable with correct columns', async () => {
    const user = userEvent.setup()
    render(<InstructionsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(screen.getByRole('columnheader', { name: /title/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /difficulty/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /created/i })).toBeInTheDocument()
  })

  it('navigates to edit page on row click', async () => {
    const user = userEvent.setup()
    const mockNavigate = vi.fn()
    vi.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }))

    render(<InstructionsGalleryPage />)
    await user.click(screen.getByRole('button', { name: /table view/i }))

    const firstRow = screen.getAllByRole('row')[1] // Skip header
    await user.click(firstRow)

    expect(mockNavigate).toHaveBeenCalledWith('/instructions/my-moc-slug/edit')
  })

  it('renders difficulty badges with correct colors', async () => {
    const user = userEvent.setup()
    const mockMocs = [
      {
        id: '1',
        title: 'Easy Build',
        difficulty: 'beginner',
        status: 'published',
        slug: 'easy-build',
      },
      {
        id: '2',
        title: 'Hard Build',
        difficulty: 'advanced',
        status: 'draft',
        slug: 'hard-build',
      },
    ]

    render(<InstructionsGalleryPage />)
    await user.click(screen.getByRole('button', { name: /table view/i }))

    const beginnerBadge = screen.getByText('beginner')
    const advancedBadge = screen.getByText('advanced')

    expect(beginnerBadge).toHaveClass('bg-green-100', 'text-green-800')
    expect(advancedBadge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('formats created date correctly', async () => {
    const user = userEvent.setup()
    const mockMoc = {
      id: '1',
      title: 'Test MOC',
      createdAt: '2025-01-15T12:00:00Z',
      slug: 'test-moc',
    }

    render(<InstructionsGalleryPage />)
    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
  })

  it('syncs view mode to URL', async () => {
    const user = userEvent.setup()
    render(<InstructionsGalleryPage />)

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(window.location.search).toContain('view=datatable')
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] Instructions gallery supports grid and datatable views
- [ ] View mode persists to localStorage (`gallery_view_mode_instructions`)
- [ ] Datatable shows Title, Difficulty, Status, Created columns
- [ ] Difficulty badges color-coded (beginner=green, intermediate=yellow, advanced=red)
- [ ] Row click navigates to edit page (`/instructions/{slug}/edit`)
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
