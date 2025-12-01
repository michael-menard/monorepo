# Story 3.3.1: Wishlist Gallery Page Scaffolding

## Status

Draft

## Story

**As a** developer,
**I want** the Wishlist Gallery page scaffolded,
**so that** users can browse sets and instructions they want to purchase.

## Acceptance Criteria

1. ⬜ Route `/wishlist` configured in router
2. ⬜ WishlistGalleryPage component renders
3. ⬜ Lazy loading configured for route
4. ⬜ Page uses @repo/gallery components
5. ⬜ Type filter (sets, instructions, all)
6. ⬜ Add to wishlist button in header

## Tasks / Subtasks

- [ ] **Task 1: Create Route Structure**
  - [ ] Create `routes/wishlist/` folder
  - [ ] Create `routes/wishlist/index.tsx` (main gallery)
  - [ ] Create `routes/wishlist/-components/` folder

- [ ] **Task 2: Page Component**
  - [ ] Create WishlistGalleryPage component
  - [ ] Import gallery components from @repo/gallery
  - [ ] Add type filter tabs (All / Sets / Instructions)
  - [ ] Add "Add Item" CTA

- [ ] **Task 3: Router Configuration**
  - [ ] Add `/wishlist` route
  - [ ] Configure lazy loading
  - [ ] Add to navigation menu

## Dev Notes

### Route Structure

```
apps/web/main-app/src/routes/
└── wishlist/
    ├── index.tsx                # Main gallery
    ├── add.tsx                  # Add item page
    └── -components/
        ├── WishlistCard.tsx     # Gallery card for wishlist items
        └── WishlistTypeFilter.tsx
```

### Page Component

```typescript
// routes/wishlist/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import {
  GalleryGrid,
  GalleryFilterBar,
  GalleryEmptyState,
  GallerySkeleton,
  useGalleryUrl,
} from '@repo/gallery'

export const Route = createFileRoute('/wishlist/')({
  component: WishlistGalleryPage,
})

type WishlistItemType = 'all' | 'set' | 'instruction'

function WishlistGalleryPage() {
  const { state, updateUrl } = useGalleryUrl()
  const [itemType, setItemType] = useState<WishlistItemType>('all')
  const navigate = useNavigate()

  const { data, isLoading } = useGetWishlistQuery({
    ...state,
    type: itemType === 'all' ? undefined : itemType,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <Button onClick={() => navigate({ to: '/wishlist/add' })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Type Filter Tabs */}
      <Tabs value={itemType} onValueChange={(v) => setItemType(v as WishlistItemType)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {data?.counts.total && <Badge variant="secondary" className="ml-2">{data.counts.total}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="set">
            Sets
            {data?.counts.sets && <Badge variant="secondary" className="ml-2">{data.counts.sets}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="instruction">
            Instructions
            {data?.counts.instructions && <Badge variant="secondary" className="ml-2">{data.counts.instructions}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
        sortOptions={wishlistSortOptions}
        selectedSort={state.sortField}
        onSortChange={(s, d) => updateUrl({ sortField: s, sortDirection: d })}
      />

      {/* Gallery */}
      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : data?.items.length === 0 ? (
        <GalleryEmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Add sets and instructions you'd like to purchase."
          action={{
            label: "Add Item",
            onClick: () => navigate({ to: '/wishlist/add' })
          }}
        />
      ) : (
        <GalleryGrid>
          {data?.items.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </GalleryGrid>
      )}
    </div>
  )
}
```

### Sort Options

```typescript
const wishlistSortOptions: SortOption[] = [
  { value: 'dateAdded', label: 'Date Added', defaultDirection: 'desc' },
  { value: 'name', label: 'Name', defaultDirection: 'asc' },
  { value: 'price', label: 'Price', defaultDirection: 'asc' },
  { value: 'pieceCount', label: 'Piece Count', defaultDirection: 'desc' },
]
```

## Testing

- [ ] Route `/wishlist` renders page
- [ ] Type tabs filter items correctly
- [ ] Item counts update with filters
- [ ] Empty state shows for new users

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
