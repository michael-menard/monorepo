# Story sets-1007: Gallery Page Scaffolding

## Status

Draft

## Story

**As a** user,
**I want** to browse my set collection in a gallery view,
**So that** I can see all my owned sets at a glance.

## Acceptance Criteria

1. [ ] Route `/sets` configured with lazy loading
2. [ ] Page uses shared @repo/gallery components
3. [ ] Integrates with useGetSetsQuery for data
4. [ ] Filter bar with search, theme, isBuilt filters
5. [ ] Sort options: title, pieceCount, purchaseDate, purchasePrice
6. [ ] "Add Set" button in header navigates to add page
7. [ ] Loading skeleton while fetching
8. [ ] Navigation link added to app sidebar/nav

## Tasks

- [ ] **Task 1: Create route structure**
  - [ ] Create routes/sets/index.tsx
  - [ ] Configure lazy loading in router
  - [ ] Add /sets to navigation menu

- [ ] **Task 2: Integrate shared gallery**
  - [ ] Verify @repo/gallery components work for Sets needs
  - [ ] Adapt if needed (theme filter vs. category, etc.)
  - [ ] Use GalleryGrid, GalleryFilterBar, GallerySkeleton

- [ ] **Task 3: Wire up data fetching**
  - [ ] Use useGetSetsQuery with filter state
  - [ ] Use useGalleryUrl for URL-synced filter state
  - [ ] Handle loading and error states

- [ ] **Task 4: Add Set CTA**
  - [ ] Header with title and Add Set button
  - [ ] Button navigates to /sets/add

## Dev Notes

### Route Structure

```
apps/web/main-app/src/routes/
└── sets/
    ├── index.tsx           # Gallery page (this story)
    ├── $setId/
    │   └── index.tsx       # Detail page (sets-1009)
    └── add.tsx             # Add page (sets-1010)
```

### Page Component

```typescript
// routes/sets/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import {
  GalleryGrid,
  GalleryFilterBar,
  GallerySkeleton,
  useGalleryUrl,
} from '@repo/gallery'
import { useGetSetsQuery } from '@repo/api-client'
import { SetCard } from './-components/SetCard'

export const Route = createFileRoute('/sets/')({
  component: SetsGalleryPage,
})

function SetsGalleryPage() {
  const { state, updateUrl } = useGalleryUrl()
  const navigate = useNavigate()

  const { data, isLoading, error } = useGetSetsQuery({
    search: state.search,
    theme: state.theme,
    isBuilt: state.isBuilt,
    tags: state.tags,
    sortField: state.sortField ?? 'createdAt',
    sortDirection: state.sortDirection ?? 'desc',
    page: state.page ?? 1,
    limit: 20,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Sets</h1>
        <Button onClick={() => navigate({ to: '/sets/add' })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Set
        </Button>
      </div>

      {/* Filter Bar */}
      <GalleryFilterBar
        search={state.search}
        onSearchChange={(s) => updateUrl({ search: s, page: 1 })}
        filters={[
          {
            key: 'theme',
            label: 'Theme',
            options: data?.filters.availableThemes ?? [],
            value: state.theme,
            onChange: (v) => updateUrl({ theme: v, page: 1 }),
          },
          {
            key: 'isBuilt',
            label: 'Status',
            options: [
              { value: 'true', label: 'Built' },
              { value: 'false', label: 'In Pieces' },
            ],
            value: state.isBuilt?.toString(),
            onChange: (v) => updateUrl({ isBuilt: v === 'true', page: 1 }),
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Date Added' },
          { value: 'title', label: 'Name' },
          { value: 'pieceCount', label: 'Piece Count' },
          { value: 'purchaseDate', label: 'Purchase Date' },
          { value: 'purchasePrice', label: 'Price Paid' },
        ]}
        currentSort={state.sortField}
        currentDirection={state.sortDirection}
        onSortChange={(field, dir) => updateUrl({ sortField: field, sortDirection: dir })}
      />

      {/* Gallery Content */}
      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <GalleryGrid>
          {data?.items.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              onClick={() => navigate({ to: '/sets/$setId', params: { setId: set.id } })}
            />
          ))}
        </GalleryGrid>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={(p) => updateUrl({ page: p })}
        />
      )}
    </div>
  )
}
```

### Verify Shared Gallery Package

Before implementing, verify @repo/gallery provides:
- [ ] GalleryGrid component
- [ ] GalleryFilterBar component (or adapt)
- [ ] GallerySkeleton component
- [ ] useGalleryUrl hook for URL state

If any are missing or incompatible, adapt or extend as needed.

## Testing

- [ ] Route /sets renders page
- [ ] Loading skeleton shows while fetching
- [ ] Sets display in grid after load
- [ ] Search filters sets by title
- [ ] Theme filter works
- [ ] isBuilt filter shows Built/In Pieces sets
- [ ] Sorting changes order
- [ ] Pagination works
- [ ] Add Set button navigates to /sets/add
- [ ] Navigation menu includes Sets link

## Dependencies

- sets-1002: List Sets Endpoint
- @repo/gallery: Shared gallery components

## References

- PRD: docs/prd/epic-7-sets-gallery.md (User Interface - Gallery View)
