# Story 3.4.2: Sets Card Component

## Status

Draft

## Story

**As a** user,
**I want** set items displayed in informative cards,
**so that** I can see key details about my collection.

## Acceptance Criteria

1. ⬜ SetCard component extends GalleryCard
2. ⬜ Displays set image (thumbnail)
3. ⬜ Shows set name and number
4. ⬜ Shows piece count
5. ⬜ Shows theme badge
6. ⬜ Shows purchase date
7. ⬜ Shows linked MOCs indicator (alt-builds)
8. ⬜ Hover shows actions (view, edit, delete)

## Tasks / Subtasks

- [ ] **Task 1: Create SetCard Component**
  - [ ] Create `routes/sets/-components/SetCard.tsx`
  - [ ] Extend GalleryCard from @repo/gallery
  - [ ] Define Set type

- [ ] **Task 2: Card Content**
  - [ ] Image thumbnail
  - [ ] Set name and number
  - [ ] Piece count badge
  - [ ] Theme tag
  - [ ] Purchase info

- [ ] **Task 3: Linked MOCs**
  - [ ] Show indicator when MOCs linked as alt-builds
  - [ ] Count of linked MOCs
  - [ ] Click to view linked MOCs

- [ ] **Task 4: Card Actions**
  - [ ] View details
  - [ ] Edit set
  - [ ] Link to MOC
  - [ ] Delete set

## Dev Notes

### Component API

```typescript
interface BrickSet {
  id: string
  name: string
  setNumber: string
  thumbnail: string
  images: Array<{
    id: string
    src: string
    thumbnail: string
  }>
  pieceCount: number
  theme: string
  tags: string[]
  purchaseDate?: string
  purchasePrice?: number
  purchaseCurrency?: string
  linkedMocs: Array<{
    id: string
    name: string
    thumbnail: string
  }>
  createdAt: string
  updatedAt: string
}

interface SetCardProps {
  set: BrickSet
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onLinkMoc?: (id: string) => void
}

function SetCard({ set, ...handlers }: SetCardProps) {
  return (
    <div className="group relative">
      <GalleryCard
        image={{
          src: set.thumbnail,
          alt: set.name,
          aspectRatio: '4/3',
        }}
        title={set.name}
        onClick={() => handlers.onView?.(set.id)}
        metadata={
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                #{set.setNumber}
              </span>
              <Badge variant="outline">{set.theme}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {set.pieceCount.toLocaleString()} pieces
              </span>
              {set.purchaseDate && (
                <span className="text-muted-foreground">
                  {new Date(set.purchaseDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        }
      />

      {/* Linked MOCs Indicator */}
      {set.linkedMocs.length > 0 && (
        <div className="absolute bottom-12 left-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="cursor-pointer">
                <Blocks className="w-3 h-3 mr-1" />
                {set.linkedMocs.length} MOC{set.linkedMocs.length > 1 ? 's' : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0">
              <div className="p-2 space-y-2">
                <p className="text-xs font-medium">Alt-builds from this set:</p>
                {set.linkedMocs.map((moc) => (
                  <div key={moc.id} className="flex items-center gap-2">
                    <img
                      src={moc.thumbnail}
                      alt={moc.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <span className="text-xs">{moc.name}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handlers.onView?.(set.id)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onEdit?.(set.id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onLinkMoc?.(set.id)}>
              <Link className="w-4 h-4 mr-2" />
              Link Alt-Build MOC
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handlers.onDelete?.(set.id)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete Set
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
```

### Purchase Price Display

```typescript
function PurchaseInfo({ set }: { set: BrickSet }) {
  if (!set.purchasePrice) return null

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: set.purchaseCurrency || 'USD',
  }).format(set.purchasePrice)

  return (
    <div className="text-sm">
      <span className="text-muted-foreground">Paid: </span>
      <span className="font-medium">{formatted}</span>
    </div>
  )
}
```

## Testing

- [ ] Unit test: renders set data correctly
- [ ] Unit test: shows set number formatted
- [ ] Unit test: linked MOCs badge shows count
- [ ] Unit test: tooltip shows linked MOC list
- [ ] Unit test: dropdown actions call handlers

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
