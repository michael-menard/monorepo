# Story 3.4.4: Sets Detail Page

## Status

Draft

## Story

**As a** user,
**I want** to view full details of a set,
**so that** I can see all images, info, and linked MOCs.

## Acceptance Criteria

1. ⬜ Route `/sets/:setId` configured
2. ⬜ Displays all set images in gallery view
3. ⬜ Shows set metadata (name, number, pieces, theme, tags)
4. ⬜ Shows purchase information
5. ⬜ Shows linked MOCs section (alt-builds)
6. ⬜ Can link new MOC from this page
7. ⬜ Lightbox opens on image click
8. ⬜ Edit and delete actions available

## Tasks / Subtasks

- [ ] **Task 1: Create Detail Route**
  - [ ] Create `routes/sets/$setId.tsx`
  - [ ] Configure route params
  - [ ] Fetch set by ID

- [ ] **Task 2: Detail Page Layout**
  - [ ] Header with back button and title
  - [ ] Image gallery section
  - [ ] Metadata card/sidebar
  - [ ] Purchase info section
  - [ ] Actions (edit, delete)

- [ ] **Task 3: Linked MOCs Section**
  - [ ] Grid of linked MOC cards
  - [ ] "Link MOC" button
  - [ ] Unlink action on each MOC

- [ ] **Task 4: Link MOC Dialog**
  - [ ] MOC search/selector
  - [ ] Confirm linking

## Dev Notes

### Page Component

```typescript
// routes/sets/$setId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sets/$setId')({
  component: SetDetailPage,
})

function SetDetailPage() {
  const { setId } = Route.useParams()
  const navigate = useNavigate()
  const { data: set, isLoading } = useGetSetByIdQuery(setId)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [linkMocOpen, setLinkMocOpen] = useState(false)

  if (isLoading) return <DetailPageSkeleton />
  if (!set) return <NotFound />

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/sets' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{set.name}</h1>
          <p className="text-muted-foreground">#{set.setNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: '/sets/$setId/edit', params: { setId } })}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DeleteSetButton setId={set.id} onDeleted={() => navigate({ to: '/sets' })} />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Images */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <GalleryGrid columns={{ sm: 2, lg: 3 }}>
                {set.images.map((image, index) => (
                  <div
                    key={image.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setLightboxIndex(index)
                      setLightboxOpen(true)
                    }}
                  >
                    <img
                      src={image.thumbnail}
                      alt={`${set.name} image ${index + 1}`}
                      className="rounded-lg aspect-square object-cover"
                    />
                  </div>
                ))}
              </GalleryGrid>
            </CardContent>
          </Card>

          {/* Linked MOCs Section */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Alt-Build MOCs</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setLinkMocOpen(true)}>
                <Link className="w-4 h-4 mr-2" />
                Link MOC
              </Button>
            </CardHeader>
            <CardContent>
              {set.linkedMocs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No MOCs linked to this set yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {set.linkedMocs.map((moc) => (
                    <LinkedMocCard
                      key={moc.id}
                      moc={moc}
                      setId={set.id}
                      onViewMoc={() => navigate({
                        to: '/instructions/$instructionId',
                        params: { instructionId: moc.id }
                      })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metadata Sidebar */}
        <div className="space-y-6">
          {/* Set Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Set Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Set Number</Label>
                <p className="text-lg font-semibold">#{set.setNumber}</p>
              </div>
              <div>
                <Label>Piece Count</Label>
                <p className="text-lg font-semibold">{set.pieceCount.toLocaleString()}</p>
              </div>
              <div>
                <Label>Theme</Label>
                <Badge>{set.theme}</Badge>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {set.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Info Card */}
          {(set.purchaseDate || set.purchasePrice) && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {set.purchaseDate && (
                  <div>
                    <Label>Purchase Date</Label>
                    <p>{new Date(set.purchaseDate).toLocaleDateString()}</p>
                  </div>
                )}
                {set.purchasePrice && (
                  <div>
                    <Label>Price Paid</Label>
                    <p className="text-lg font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: set.purchaseCurrency || 'USD',
                      }).format(set.purchasePrice)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {set.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{set.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <GalleryLightbox
        images={set.images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />

      <LinkMocDialog
        open={linkMocOpen}
        onOpenChange={setLinkMocOpen}
        setId={set.id}
        existingMocIds={set.linkedMocs.map(m => m.id)}
      />
    </div>
  )
}
```

### Linked MOC Card

```typescript
interface LinkedMocCardProps {
  moc: { id: string; name: string; thumbnail: string; pieceCount: number }
  setId: string
  onViewMoc: () => void
}

function LinkedMocCard({ moc, setId, onViewMoc }: LinkedMocCardProps) {
  const [unlinkMoc] = useUnlinkMocFromSetMutation()
  const { success } = useToast()

  const handleUnlink = async () => {
    await unlinkMoc({ setId, mocId: moc.id }).unwrap()
    success('MOC unlinked from set')
  }

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-shadow" onClick={onViewMoc}>
      <div className="relative">
        <img
          src={moc.thumbnail}
          alt={moc.name}
          className="w-full aspect-square object-cover rounded-t-lg"
        />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            handleUnlink()
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <CardContent className="p-3">
        <p className="font-medium truncate">{moc.name}</p>
        <p className="text-sm text-muted-foreground">{moc.pieceCount} pieces</p>
      </CardContent>
    </Card>
  )
}
```

### Link MOC Dialog

```typescript
interface LinkMocDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setId: string
  existingMocIds: string[]
}

function LinkMocDialog({ open, onOpenChange, setId, existingMocIds }: LinkMocDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedMocId, setSelectedMocId] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: mocs } = useGetInstructionsQuery({
    search: debouncedSearch,
    limit: 10,
  })

  // Filter out already linked MOCs
  const availableMocs = mocs?.items.filter(m => !existingMocIds.includes(m.id)) ?? []

  const [linkMoc, { isLoading }] = useLinkMocToSetMutation()
  const { success, error } = useToast()

  const handleLink = async () => {
    if (!selectedMocId) return

    try {
      await linkMoc({ setId, mocId: selectedMocId }).unwrap()
      success('MOC linked as alt-build')
      onOpenChange(false)
      setSelectedMocId(null)
    } catch (err) {
      error('Failed to link MOC')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Alt-Build MOC</DialogTitle>
          <DialogDescription>
            Select a MOC that can be built using this set's pieces.
          </DialogDescription>
        </DialogHeader>

        {/* MOC Search & Selection */}
        <div className="space-y-4">
          <Input
            placeholder="Search MOCs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ScrollArea className="h-[300px]">
            <RadioGroup value={selectedMocId ?? ''} onValueChange={setSelectedMocId}>
              {availableMocs.map((moc) => (
                <div
                  key={moc.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted",
                    selectedMocId === moc.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedMocId(moc.id)}
                >
                  <RadioGroupItem value={moc.id} />
                  <img src={moc.thumbnail} alt={moc.name} className="w-12 h-12 rounded" />
                  <div>
                    <p className="font-medium">{moc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {moc.pieceCount} pieces • {moc.theme}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLink} disabled={!selectedMocId || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Link MOC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Testing

- [ ] Route renders with valid ID
- [ ] 404 shown for invalid ID
- [ ] All set details display correctly
- [ ] Lightbox opens on image click
- [ ] Linked MOCs display and link to detail
- [ ] Link MOC dialog searches and links
- [ ] Unlink removes MOC association
- [ ] Edit/Delete actions work

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
