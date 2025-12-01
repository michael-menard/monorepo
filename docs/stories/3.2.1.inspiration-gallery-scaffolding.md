# Story 3.2.1: Inspiration Gallery Page Scaffolding

## Status

Draft

## Story

**As a** developer,
**I want** the Inspiration Gallery page scaffolded,
**so that** users can browse and manage their inspiration images.

## Acceptance Criteria

1. ⬜ Route `/inspiration` configured in router
2. ⬜ InspirationGalleryPage component renders
3. ⬜ Lazy loading configured for route
4. ⬜ Page uses @repo/gallery components
5. ⬜ Collection tabs/filter for organization
6. ⬜ Upload button in header

## Tasks / Subtasks

- [ ] **Task 1: Create Route Structure**
  - [ ] Create `routes/inspiration/` folder
  - [ ] Create `routes/inspiration/index.tsx` (main gallery)
  - [ ] Create `routes/inspiration/-components/` folder

- [ ] **Task 2: Page Component**
  - [ ] Create InspirationGalleryPage component
  - [ ] Import gallery components from @repo/gallery
  - [ ] Add collection filter/tabs
  - [ ] Add upload CTA

- [ ] **Task 3: Router Configuration**
  - [ ] Add `/inspiration` route
  - [ ] Configure lazy loading
  - [ ] Add to navigation menu

## Dev Notes

### Route Structure

```
apps/web/main-app/src/routes/
└── inspiration/
    ├── index.tsx                    # Main gallery
    ├── collections/
    │   └── $collectionId.tsx        # Collection view
    ├── upload.tsx                   # Upload page
    └── -components/
        ├── InspirationCard.tsx
        └── CollectionSelector.tsx
```

### Page Component

```typescript
// routes/inspiration/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import {
  GalleryGrid,
  GalleryFilterBar,
  GalleryEmptyState,
  GallerySkeleton,
  useGalleryUrl,
} from '@repo/gallery'

export const Route = createFileRoute('/inspiration/')({
  component: InspirationGalleryPage,
})

function InspirationGalleryPage() {
  const { state, updateUrl } = useGalleryUrl()
  const navigate = useNavigate()

  const { data, isLoading } = useGetInspirationImagesQuery(state)
  const { data: collections } = useGetCollectionsQuery()

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inspiration Gallery</h1>
        <Button onClick={() => navigate({ to: '/inspiration/upload' })}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Images
        </Button>
      </div>

      {/* Collection Tabs */}
      <CollectionSelector
        collections={collections ?? []}
        selected={state.collectionId}
        onSelect={(id) => updateUrl({ collectionId: id })}
      />

      {/* Filter Bar */}
      <GalleryFilterBar
        search={state.search}
        onSearchChange={(s) => updateUrl({ search: s })}
        tags={availableTags}
        selectedTags={state.tags}
        onTagsChange={(t) => updateUrl({ tags: t })}
        sortOptions={sortOptions}
        selectedSort={state.sortField}
        onSortChange={(s, d) => updateUrl({ sortField: s, sortDirection: d })}
      />

      {/* Gallery */}
      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : data?.items.length === 0 ? (
        <GalleryEmptyState
          icon={ImagePlus}
          title="No inspiration images yet"
          description="Upload images of builds you'd like to create someday."
          action={{
            label: "Upload Images",
            onClick: () => navigate({ to: '/inspiration/upload' })
          }}
        />
      ) : (
        <GalleryGrid>
          {data?.items.map((image) => (
            <InspirationCard key={image.id} image={image} />
          ))}
        </GalleryGrid>
      )}
    </div>
  )
}
```

### Collection Selector Component

```typescript
interface Collection {
  id: string
  name: string
  imageCount: number
  thumbnail?: string
}

interface CollectionSelectorProps {
  collections: Collection[]
  selected: string | null
  onSelect: (id: string | null) => void
}

function CollectionSelector({ collections, selected, onSelect }: CollectionSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Button
        variant={selected === null ? 'default' : 'outline'}
        onClick={() => onSelect(null)}
      >
        All Images
      </Button>
      {collections.map((collection) => (
        <Button
          key={collection.id}
          variant={selected === collection.id ? 'default' : 'outline'}
          onClick={() => onSelect(collection.id)}
        >
          {collection.name}
          <Badge variant="secondary" className="ml-2">
            {collection.imageCount}
          </Badge>
        </Button>
      ))}
    </div>
  )
}
```

## Testing

- [ ] Route `/inspiration` renders page
- [ ] Collection tabs filter images
- [ ] Upload button navigates correctly
- [ ] Empty state shows for new users

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
