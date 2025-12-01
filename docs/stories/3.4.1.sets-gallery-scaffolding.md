# Story 3.4.1: Sets Gallery Page Scaffolding

## Status

Draft

## Story

**As a** developer,
**I want** the Sets Gallery page scaffolded,
**so that** users can browse their purchased LEGO and alt-brick sets.

## Acceptance Criteria

1. ⬜ Route `/sets` configured in router
2. ⬜ SetsGalleryPage component renders
3. ⬜ Lazy loading configured for route
4. ⬜ Page uses @repo/gallery components
5. ⬜ Filter by theme supported
6. ⬜ Add set button in header

## Tasks / Subtasks

- [ ] **Task 1: Create Route Structure**
  - [ ] Create `routes/sets/` folder
  - [ ] Create `routes/sets/index.tsx` (main gallery)
  - [ ] Create `routes/sets/-components/` folder

- [ ] **Task 2: Page Component**
  - [ ] Create SetsGalleryPage component
  - [ ] Import gallery components from @repo/gallery
  - [ ] Add filter bar with theme filter
  - [ ] Add "Add Set" CTA

- [ ] **Task 3: Router Configuration**
  - [ ] Add `/sets` route
  - [ ] Configure lazy loading
  - [ ] Add to navigation menu

## Dev Notes

### Route Structure

```
apps/web/main-app/src/routes/
└── sets/
    ├── index.tsx                # Main gallery
    ├── $setId.tsx               # Detail page
    ├── add.tsx                  # Add set page
    └── -components/
        ├── SetCard.tsx          # Gallery card for sets
        └── SetDetailCard.tsx    # Expanded detail card
```

### Page Component

```typescript
// routes/sets/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import {
  GalleryGrid,
  GalleryFilterBar,
  GalleryEmptyState,
  GallerySkeleton,
  useGalleryUrl,
} from '@repo/gallery'

export const Route = createFileRoute('/sets/')({
  component: SetsGalleryPage,
})

function SetsGalleryPage() {
  const { state, updateUrl } = useGalleryUrl()
  const navigate = useNavigate()

  const { data, isLoading } = useGetSetsQuery(state)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Sets</h1>
          {data?.summary && (
            <p className="text-muted-foreground">
              {data.summary.totalSets} sets • {data.summary.totalPieces.toLocaleString()} pieces • ${data.summary.totalValue.toFixed(2)}
            </p>
          )}
        </div>
        <Button onClick={() => navigate({ to: '/sets/add' })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Set
        </Button>
      </div>

      {/* Filter Bar */}
      <GalleryFilterBar
        search={state.search}
        onSearchChange={(s) => updateUrl({ search: s })}
        tags={availableTags}
        selectedTags={state.tags}
        onTagsChange={(t) => updateUrl({ tags: t })}
        themes={availableThemes}
        selectedTheme={state.theme}
        onThemeChange={(t) => updateUrl({ theme: t })}
        sortOptions={setSortOptions}
        selectedSort={state.sortField}
        onSortChange={(s, d) => updateUrl({ sortField: s, sortDirection: d })}
      />

      {/* Gallery */}
      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : data?.items.length === 0 ? (
        <GalleryEmptyState
          icon={Blocks}
          title="No sets in your collection"
          description="Add your first LEGO or alt-brick set to start tracking your collection."
          action={{
            label: "Add Set",
            onClick: () => navigate({ to: '/sets/add' })
          }}
        />
      ) : (
        <GalleryGrid>
          {data?.items.map((set) => (
            <SetCard key={set.id} set={set} />
          ))}
        </GalleryGrid>
      )}
    </div>
  )
}
```

### Sort Options

```typescript
const setSortOptions: SortOption[] = [
  { value: 'purchaseDate', label: 'Purchase Date', defaultDirection: 'desc' },
  { value: 'name', label: 'Name', defaultDirection: 'asc' },
  { value: 'setNumber', label: 'Set Number', defaultDirection: 'asc' },
  { value: 'pieceCount', label: 'Piece Count', defaultDirection: 'desc' },
  { value: 'purchasePrice', label: 'Price Paid', defaultDirection: 'desc' },
]
```

### Collection Summary

```typescript
interface SetsSummary {
  totalSets: number
  totalPieces: number
  totalValue: number
  byTheme: Record<string, number>
}
```

## Testing

- [ ] Route `/sets` renders page
- [ ] Summary statistics display correctly
- [ ] Filter bar filters sets
- [ ] Empty state shows for new users

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
