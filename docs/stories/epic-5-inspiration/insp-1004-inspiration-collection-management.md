# Story 3.2.5: Inspiration Collection Management

## Status

Draft

## Story

**As a** user,
**I want** to organize inspiration images into collections,
**so that** I can group related ideas together.

## Acceptance Criteria

1. ⬜ Create new collection with name
2. ⬜ Rename existing collection
3. ⬜ Delete collection (images become uncategorized)
4. ⬜ Move image to collection
5. ⬜ Remove image from collection
6. ⬜ View collection page with only its images
7. ⬜ Collection shows image count

## Tasks / Subtasks

- [ ] **Task 1: Collection CRUD UI**
  - [ ] Create collection dialog
  - [ ] Rename collection dialog
  - [ ] Delete collection confirmation
  - [ ] Collection management in settings or inline

- [ ] **Task 2: Move to Collection**
  - [ ] "Move to Collection" in image dropdown
  - [ ] Collection selector dialog
  - [ ] Create new collection from selector

- [ ] **Task 3: Collection Route**
  - [ ] Create `routes/inspiration/collections/$collectionId.tsx`
  - [ ] Show collection name as header
  - [ ] Filter to collection's images only

## Dev Notes

### Create Collection Dialog

```typescript
interface CreateCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (collection: Collection) => void
}

function CreateCollectionDialog({ open, onOpenChange, onCreated }: CreateCollectionDialogProps) {
  const [name, setName] = useState('')
  const [createCollection, { isLoading }] = useCreateCollectionMutation()
  const { success, error } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const collection = await createCollection({ name }).unwrap()
      success(`Collection "${name}" created`)
      onCreated?.(collection)
      onOpenChange(false)
      setName('')
    } catch (err) {
      error('Failed to create collection')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
          <DialogDescription>
            Create a new collection to organize your inspiration images.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Castle Ideas"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Move to Collection Dialog

```typescript
interface MoveToCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageId: string
  currentCollectionId?: string
}

function MoveToCollectionDialog({ open, onOpenChange, imageId, currentCollectionId }: MoveToCollectionDialogProps) {
  const [selected, setSelected] = useState<string | null>(currentCollectionId ?? null)
  const [showCreate, setShowCreate] = useState(false)
  const { data: collections } = useGetCollectionsQuery()
  const [updateImage] = useUpdateInspirationImageMutation()
  const { success } = useToast()

  const handleMove = async () => {
    await updateImage({
      id: imageId,
      data: { collectionId: selected },
    }).unwrap()
    success(selected ? 'Image moved to collection' : 'Image removed from collection')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={selected ?? ''} onValueChange={(v) => setSelected(v || null)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="none" />
              <Label htmlFor="none">No collection</Label>
            </div>
            {collections?.items.map((collection) => (
              <div key={collection.id} className="flex items-center space-x-2">
                <RadioGroupItem value={collection.id} id={collection.id} />
                <Label htmlFor={collection.id}>
                  {collection.name}
                  <span className="text-muted-foreground ml-2">({collection.imageCount})</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Collection
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove}>Move</Button>
        </DialogFooter>
      </DialogContent>

      <CreateCollectionDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(collection) => {
          setSelected(collection.id)
          setShowCreate(false)
        }}
      />
    </Dialog>
  )
}
```

### Collection Page Route

```typescript
// routes/inspiration/collections/$collectionId.tsx
export const Route = createFileRoute('/inspiration/collections/$collectionId')({
  component: CollectionPage,
})

function CollectionPage() {
  const { collectionId } = Route.useParams()
  const navigate = useNavigate()
  const { data: collections } = useGetCollectionsQuery()
  const collection = collections?.items.find(c => c.id === collectionId)

  const { state, updateUrl } = useGalleryUrl()
  const { data, isLoading } = useGetInspirationImagesQuery({
    ...state,
    collectionId,
  })

  if (!collection) return <NotFound />

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate({ to: '/inspiration' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{collection.name}</h1>
        <Badge variant="secondary">{collection.imageCount} images</Badge>
        <div className="flex-1" />
        <CollectionActionsMenu collection={collection} />
      </div>

      <GalleryFilterBar {...filterBarProps} />

      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : data?.items.length === 0 ? (
        <GalleryEmptyState
          title="No images in this collection"
          description="Move images here to organize your inspiration."
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

## Testing

- [ ] Create collection saves and appears in list
- [ ] Rename collection updates name
- [ ] Delete collection removes it (images remain)
- [ ] Move to collection updates image
- [ ] Collection page shows filtered images
- [ ] Image count updates correctly

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
