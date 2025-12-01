# Story 3.2.2: Inspiration Card Component

## Status

Draft

## Story

**As a** user,
**I want** inspiration images displayed in cards,
**so that** I can see the image and its metadata.

## Acceptance Criteria

1. ⬜ InspirationCard component extends GalleryCard
2. ⬜ Displays image thumbnail
3. ⬜ Shows collection badge if assigned
4. ⬜ Shows linked MOC indicator if linked
5. ⬜ Click opens image detail/lightbox
6. ⬜ Hover shows action menu (edit, delete, link to MOC)
7. ⬜ Selection checkbox for bulk operations (future)

## Tasks / Subtasks

- [ ] **Task 1: Create InspirationCard Component**
  - [ ] Create `routes/inspiration/-components/InspirationCard.tsx`
  - [ ] Extend GalleryCard from @repo/gallery
  - [ ] Define InspirationImage type

- [ ] **Task 2: Card Content**
  - [ ] Image thumbnail with aspect ratio
  - [ ] Optional title/caption
  - [ ] Collection badge
  - [ ] Linked MOC indicator

- [ ] **Task 3: Card Actions**
  - [ ] Click to open lightbox
  - [ ] Hover menu with actions
  - [ ] Link to MOC action
  - [ ] Move to collection action
  - [ ] Delete action

## Dev Notes

### Component API

```typescript
interface InspirationImage {
  id: string
  src: string
  thumbnail: string
  caption?: string
  collectionId?: string
  collectionName?: string
  linkedMocId?: string
  linkedMocName?: string
  tags: string[]
  createdAt: string
}

interface InspirationCardProps {
  image: InspirationImage
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onLinkToMoc?: (id: string) => void
  onMoveToCollection?: (id: string) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
}

function InspirationCard({ image, ...handlers }: InspirationCardProps) {
  return (
    <div className="group relative">
      <GalleryCard
        image={{
          src: image.thumbnail,
          alt: image.caption || 'Inspiration image',
          aspectRatio: '1/1',
        }}
        title={image.caption}
        onClick={() => handlers.onView?.(image.id)}
        metadata={
          <div className="flex items-center gap-2">
            {image.collectionName && (
              <Badge variant="outline" className="text-xs">
                <Folder className="w-3 h-3 mr-1" />
                {image.collectionName}
              </Badge>
            )}
            {image.linkedMocName && (
              <Badge variant="secondary" className="text-xs">
                <Link className="w-3 h-3 mr-1" />
                {image.linkedMocName}
              </Badge>
            )}
          </div>
        }
      />

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handlers.onEdit?.(image.id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onLinkToMoc?.(image.id)}>
              <Link className="w-4 h-4 mr-2" />
              Link to MOC
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onMoveToCollection?.(image.id)}>
              <FolderInput className="w-4 h-4 mr-2" />
              Move to Collection
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handlers.onDelete?.(image.id)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection Checkbox (for bulk operations) */}
      {handlers.selectable && (
        <Checkbox
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100"
          checked={handlers.selected}
          onCheckedChange={(checked) => handlers.onSelect?.(image.id, !!checked)}
        />
      )}
    </div>
  )
}
```

### Linked MOC Indicator

```typescript
// When image is linked to a MOC, show connection
{image.linkedMocId && (
  <div className="absolute bottom-2 left-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="default" className="cursor-pointer">
          <Blocks className="w-3 h-3 mr-1" />
          Linked
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Linked to: {image.linkedMocName}
      </TooltipContent>
    </Tooltip>
  </div>
)}
```

## Testing

- [ ] Unit test: renders image and metadata
- [ ] Unit test: shows collection badge when assigned
- [ ] Unit test: shows linked indicator when linked
- [ ] Unit test: dropdown actions call handlers
- [ ] Unit test: selection checkbox works

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
