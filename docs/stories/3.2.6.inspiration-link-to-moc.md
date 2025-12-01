# Story 3.2.6: Link Inspiration Image to MOC

## Status

Draft

## Story

**As a** user,
**I want** to link inspiration images to MOC instructions,
**so that** I can track which ideas I've turned into builds.

## Acceptance Criteria

1. ⬜ "Link to MOC" action in image dropdown
2. ⬜ MOC selector dialog with search
3. ⬜ Visual indicator when image is linked
4. ⬜ Linked MOC shows in image detail
5. ⬜ Can unlink image from MOC
6. ⬜ Linked images show in instruction detail page

## Tasks / Subtasks

- [ ] **Task 1: Link Dialog**
  - [ ] Create LinkToMocDialog component
  - [ ] MOC search/filter
  - [ ] Preview selected MOC

- [ ] **Task 2: Link Operation**
  - [ ] Call link API endpoint
  - [ ] Update UI to show linked status
  - [ ] Toast confirmation

- [ ] **Task 3: Unlink Operation**
  - [ ] Unlink button in image detail
  - [ ] Confirmation dialog
  - [ ] Call unlink API endpoint

- [ ] **Task 4: Cross-Display**
  - [ ] Show linked inspiration in instruction detail
  - [ ] Link badge on inspiration card

## Dev Notes

### Link to MOC Dialog

```typescript
interface LinkToMocDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageId: string
  currentMocId?: string
}

function LinkToMocDialog({ open, onOpenChange, imageId, currentMocId }: LinkToMocDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedMocId, setSelectedMocId] = useState<string | null>(currentMocId ?? null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: mocs, isLoading } = useGetInstructionsQuery({
    search: debouncedSearch,
    limit: 10,
  })

  const [linkToMoc, { isLoading: isLinking }] = useLinkToMocMutation()
  const { success, error } = useToast()

  const handleLink = async () => {
    if (!selectedMocId) return

    try {
      await linkToMoc({ imageId, mocId: selectedMocId }).unwrap()
      success('Image linked to MOC')
      onOpenChange(false)
    } catch (err) {
      error('Failed to link image')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link to MOC Instructions</DialogTitle>
          <DialogDescription>
            Select a MOC to link this inspiration image to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search MOCs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* MOC List */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <RadioGroup
                value={selectedMocId ?? ''}
                onValueChange={setSelectedMocId}
                className="space-y-2"
              >
                {mocs?.items.map((moc) => (
                  <div
                    key={moc.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted",
                      selectedMocId === moc.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedMocId(moc.id)}
                  >
                    <RadioGroupItem value={moc.id} id={moc.id} />
                    <img
                      src={moc.thumbnail}
                      alt={moc.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{moc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {moc.pieceCount} pieces • {moc.theme}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={!selectedMocId || isLinking}>
            {isLinking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Link to MOC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Unlink Confirmation

```typescript
function UnlinkFromMocDialog({ open, onOpenChange, imageId, mocName }: UnlinkDialogProps) {
  const [unlinkFromMoc] = useUnlinkFromMocMutation()
  const { success } = useToast()

  const handleUnlink = async () => {
    await unlinkFromMoc(imageId).unwrap()
    success('Image unlinked from MOC')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink from MOC?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the link between this inspiration image and "{mocName}".
            The image will remain in your gallery.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Linked Indicator on Card

```typescript
// In InspirationCard
{image.linkedMocId && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge
        variant="default"
        className="absolute bottom-2 left-2 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          navigate({
            to: '/instructions/$instructionId',
            params: { instructionId: image.linkedMocId }
          })
        }}
      >
        <Blocks className="w-3 h-3 mr-1" />
        {image.linkedMocName}
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      Click to view linked MOC
    </TooltipContent>
  </Tooltip>
)}
```

## Testing

- [ ] Link dialog shows searchable MOC list
- [ ] Selecting MOC and confirming creates link
- [ ] Linked badge appears on card
- [ ] Clicking badge navigates to MOC
- [ ] Unlink removes the association
- [ ] Linked inspiration shows on MOC detail page

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
