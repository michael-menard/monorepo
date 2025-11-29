# Story 6.12: Avatar Preview

## Status

Approved

## Story

**As a** user,
**I want** to preview my avatar before saving,
**so that** I can confirm it looks correct.

## Acceptance Criteria

1. ⬜ Preview modal after upload
2. ⬜ Shows cropped preview
3. ⬜ Confirm/Cancel buttons
4. ⬜ Only saves on confirm
5. ⬜ Cancel discards image

## Tasks / Subtasks

- [ ] **Task 1: Preview Modal**
  - [ ] Show uploaded image
  - [ ] Cropped to circle preview

- [ ] **Task 2: Confirm Flow**
  - [ ] Save on confirm
  - [ ] Discard on cancel

## Dev Notes

```typescript
interface AvatarPreviewModalProps {
  file: File | null
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function AvatarPreviewModal({ file, open, onConfirm, onCancel }: AvatarPreviewModalProps) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview Avatar</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <Avatar className="h-32 w-32">
            <AvatarImage src={preview || ''} />
          </Avatar>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Save Avatar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-28 | 0.1     | Initial draft | SM Agent |
