# Story wish-1008: Delete Confirmation Modal

## Status

Draft

## Story

**As a** user,
**I want** a confirmation modal before deleting a wishlist item,
**so that** I don't accidentally remove items permanently.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides WishlistItem type)
- **wish-1002**: API Endpoints (provides useRemoveFromWishlistMutation)

## Acceptance Criteria

1. Delete triggers confirmation modal (not immediate delete)
2. Modal shows item title for context
3. Modal clearly states deletion is permanent
4. Cancel button closes modal without action
5. Confirm button deletes item
6. Success shows toast notification
7. After delete, navigate to gallery (if on detail) or refresh list (if in gallery)
8. Focus returns to appropriate element after modal closes
9. Modal is keyboard accessible (Escape to close)

## Tasks / Subtasks

- [ ] **Task 1: Create DeleteConfirmationModal Component** (AC: 1-4, 9)
  - [ ] Create `components/wishlist/DeleteConfirmationModal.tsx`
  - [ ] Use AlertDialog from @repo/ui
  - [ ] Show item title in message
  - [ ] Clear warning about permanent deletion
  - [ ] Cancel and Confirm buttons

- [ ] **Task 2: Wire Up Delete Action** (AC: 5)
  - [ ] Use `useRemoveFromWishlistMutation`
  - [ ] Handle loading state on confirm button
  - [ ] Handle API errors

- [ ] **Task 3: Post-Delete Behavior** (AC: 6, 7)
  - [ ] Success toast: "Item removed from wishlist"
  - [ ] If on detail page: navigate to /wishlist
  - [ ] If in gallery: item removed from list via cache invalidation

- [ ] **Task 4: Accessibility** (AC: 8, 9)
  - [ ] Focus confirm button on open
  - [ ] Escape closes modal
  - [ ] Focus returns to trigger after close
  - [ ] Screen reader announcements

## Dev Notes

### Component Implementation

```typescript
// components/wishlist/DeleteConfirmationModal.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui'

interface DeleteConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemTitle: string
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  itemTitle,
  onConfirm,
  isDeleting,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from Wishlist?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{itemTitle}</strong> from your wishlist?
            <br />
            <br />
            <span className="text-destructive font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Usage in Detail Page

```typescript
// In wish-1006 detail page
function WishlistDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item } = useGetWishlistItemQuery(id)
  const [removeItem, { isLoading: isDeleting }] = useRemoveFromWishlistMutation()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const { success, error } = useToast()

  const handleDelete = async () => {
    try {
      await removeItem(id).unwrap()
      success('Item removed from wishlist')
      navigate({ to: '/wishlist' })
    } catch (err) {
      error('Failed to remove item')
      setDeleteModalOpen(false)
    }
  }

  return (
    <>
      {/* ... rest of detail page ... */}
      <Button
        variant="outline"
        className="text-destructive"
        onClick={() => setDeleteModalOpen(true)}
      >
        <Trash className="w-4 h-4" />
      </Button>

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemTitle={item?.title ?? ''}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  )
}
```

### Usage in Gallery Card

```typescript
// In wish-1001 WishlistCard
function WishlistCard({ item }: WishlistCardProps) {
  const [removeItem, { isLoading }] = useRemoveFromWishlistMutation()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const { success, error } = useToast()

  const handleDelete = async () => {
    try {
      await removeItem(item.id).unwrap()
      success('Item removed from wishlist')
      // Gallery will auto-refresh via RTK Query cache invalidation
    } catch (err) {
      error('Failed to remove item')
    }
    setDeleteModalOpen(false)
  }

  return (
    <>
      {/* Card with delete action in dropdown */}
      <DropdownMenuItem
        className="text-destructive"
        onClick={() => setDeleteModalOpen(true)}
      >
        <Trash className="w-4 h-4 mr-2" />
        Remove from Wishlist
      </DropdownMenuItem>

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemTitle={item.title}
        onConfirm={handleDelete}
        isDeleting={isLoading}
      />
    </>
  )
}
```

### Dependencies

- wish-1002: DELETE /api/wishlist/:id endpoint
- @repo/ui: AlertDialog component

## Testing

- [ ] Modal opens when delete button clicked
- [ ] Modal shows correct item title
- [ ] Cancel closes modal without deleting
- [ ] Confirm calls delete API
- [ ] Loading state shown during delete
- [ ] Success toast appears after delete
- [ ] Navigates to gallery from detail page
- [ ] Item removed from gallery list
- [ ] Escape key closes modal
- [ ] Focus management works correctly

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
