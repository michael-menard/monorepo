# Story sets-1009: Set Detail Page

## Status

Draft

## Story

**As a** user,
**I want** to view full details of a set,
**So that** I can see all images, metadata, and purchase information.

## Acceptance Criteria

1. [ ] Route `/sets/:setId` renders detail page
2. [ ] Shows all set images in gallery grid
3. [ ] Lightbox opens on image click
4. [ ] Displays set metadata (title, setNumber, pieceCount, theme, tags)
5. [ ] Displays purchase info section (price, tax, shipping, date)
6. [ ] Shows notes if present
7. [ ] Edit button navigates to edit page
8. [ ] Delete button triggers confirmation (handled by sets-1015)
9. [ ] Back button returns to gallery
10. [ ] 404 page for non-existent set

## Tasks

- [ ] **Task 1: Create detail route**
  - [ ] Create routes/sets/$setId/index.tsx
  - [ ] Configure route params
  - [ ] Fetch set with useGetSetByIdQuery

- [ ] **Task 2: Page layout**
  - [ ] Header with back button, title, actions
  - [ ] Two-column layout (images + metadata)
  - [ ] Responsive: stacks on mobile

- [ ] **Task 3: Image gallery section**
  - [ ] Grid of set images
  - [ ] Click opens lightbox
  - [ ] Use @repo/gallery lightbox if available

- [ ] **Task 4: Metadata section**
  - [ ] Set details card (number, pieces, theme)
  - [ ] Tags display
  - [ ] Purchase info card (collapsible if empty)
  - [ ] Notes card

- [ ] **Task 5: Actions**
  - [ ] Edit button → /sets/$setId/edit
  - [ ] Delete button (handler in sets-1015)

## Dev Notes

### Page Component

```typescript
// routes/sets/$setId/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useGetSetByIdQuery } from '@repo/api-client'

export const Route = createFileRoute('/sets/$setId/')({
  component: SetDetailPage,
})

function SetDetailPage() {
  const { setId } = Route.useParams()
  const navigate = useNavigate()
  const { data: set, isLoading, error } = useGetSetByIdQuery(setId)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (isLoading) return <DetailPageSkeleton />
  if (error || !set) return <NotFoundPage message="Set not found" />

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/sets' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{set.title}</h1>
          {set.setNumber && (
            <p className="text-muted-foreground">#{set.setNumber}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/sets/$setId/edit', params: { setId } })}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DeleteSetButton setId={setId} />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              {set.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {set.images.map((image, index) => (
                    <div
                      key={image.id}
                      className="cursor-pointer rounded-lg overflow-hidden"
                      onClick={() => {
                        setLightboxIndex(index)
                        setLightboxOpen(true)
                      }}
                    >
                      <img
                        src={image.thumbnailUrl ?? image.imageUrl}
                        alt={`${set.title} image ${index + 1}`}
                        className="aspect-square object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p>No images yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-6">
          <SetDetailsCard set={set} />
          <PurchaseInfoCard set={set} />
          {set.notes && <NotesCard notes={set.notes} />}
        </div>
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={set.images.map(i => ({ src: i.imageUrl, alt: set.title }))}
        initialIndex={lightboxIndex}
      />
    </div>
  )
}
```

### Set Details Card

```typescript
function SetDetailsCard({ set }: { set: Set }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {set.setNumber && (
          <div>
            <Label className="text-muted-foreground">Set Number</Label>
            <p className="font-semibold">#{set.setNumber}</p>
          </div>
        )}
        {set.pieceCount && (
          <div>
            <Label className="text-muted-foreground">Piece Count</Label>
            <p className="font-semibold">{set.pieceCount.toLocaleString()}</p>
          </div>
        )}
        {set.theme && (
          <div>
            <Label className="text-muted-foreground">Theme</Label>
            <Badge className="mt-1">{set.theme}</Badge>
          </div>
        )}
        {set.tags.length > 0 && (
          <div>
            <Label className="text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {set.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label className="text-muted-foreground">Build Status</Label>
          <BuildStatusBadge isBuilt={set.isBuilt} className="mt-1" />
        </div>
        {set.quantity > 1 && (
          <div>
            <Label className="text-muted-foreground">Quantity</Label>
            <p className="font-semibold">{set.quantity}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Purchase Info Card

```typescript
function PurchaseInfoCard({ set }: { set: Set }) {
  const hasPurchaseInfo = set.purchaseDate || set.purchasePrice

  if (!hasPurchaseInfo) {
    return null // Hide if no purchase info
  }

  const total = (set.purchasePrice ?? 0) + (set.tax ?? 0) + (set.shipping ?? 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {set.purchaseDate && (
          <div>
            <Label className="text-muted-foreground">Purchase Date</Label>
            <p>{formatDate(set.purchaseDate)}</p>
          </div>
        )}
        {set.purchasePrice && (
          <div>
            <Label className="text-muted-foreground">Price Paid</Label>
            <p className="font-semibold">{formatCurrency(set.purchasePrice)}</p>
          </div>
        )}
        {set.tax && (
          <div>
            <Label className="text-muted-foreground">Tax</Label>
            <p>{formatCurrency(set.tax)}</p>
          </div>
        )}
        {set.shipping && (
          <div>
            <Label className="text-muted-foreground">Shipping</Label>
            <p>{formatCurrency(set.shipping)}</p>
          </div>
        )}
        {total > 0 && (
          <div className="pt-2 border-t">
            <Label className="text-muted-foreground">Total</Label>
            <p className="text-lg font-bold">{formatCurrency(total)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## Testing

- [ ] Route renders with valid set ID
- [ ] Shows 404 for invalid ID
- [ ] Displays all set metadata correctly
- [ ] Images render in grid
- [ ] Lightbox opens on image click
- [ ] Purchase info shows when present
- [ ] Purchase info hidden when empty
- [ ] Notes card shows when notes present
- [ ] Edit button navigates to edit page
- [ ] Back button navigates to gallery
- [ ] Loading skeleton shows while fetching

## Dependencies

- sets-1003: Get Set Endpoint
- sets-1001: Zod Schemas (Set type)
- @repo/gallery: Lightbox component (verify availability)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (User Interface - Detail View)
