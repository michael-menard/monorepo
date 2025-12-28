# Story sets-1015: Delete Confirmation Modal

## Status

Draft

## Story

**As a** user,
**I want** a confirmation before deleting a set,
**So that** I don't accidentally remove items from my collection.

## Acceptance Criteria

1. [ ] Delete button triggers confirmation modal
2. [ ] Modal clearly states deletion is permanent (hard delete)
3. [ ] Shows set name for clarity
4. [ ] Cancel returns without action
5. [ ] Confirm deletes and navigates to gallery
6. [ ] Toast confirms deletion
7. [ ] Loading state during deletion
8. [ ] Error handling with retry option

## Tasks

- [ ] **Task 1: Create DeleteSetButton component**
  - [ ] Trigger button with destructive styling
  - [ ] Opens confirmation dialog

- [ ] **Task 2: Create confirmation dialog**
  - [ ] Clear warning message
  - [ ] Set name displayed
  - [ ] Cancel and Delete buttons
  - [ ] Loading state on confirm

- [ ] **Task 3: Handle deletion**
  - [ ] Call deleteSet mutation
  - [ ] Navigate to gallery on success
  - [ ] Toast confirmation
  - [ ] Error handling

- [ ] **Task 4: Integrate into detail page and card**
  - [ ] Add to detail page actions
  - [ ] Add to card dropdown menu

## Dev Notes

### DeleteSetButton Component

```typescript
// components/DeleteSetButton/index.tsx
interface DeleteSetButtonProps {
  setId: string
  setTitle: string
  onDeleted?: () => void
  variant?: 'button' | 'menuItem'
}

export function DeleteSetButton({
  setId,
  setTitle,
  onDeleted,
  variant = 'button',
}: DeleteSetButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleteSet, { isLoading }] = useDeleteSetMutation()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleDelete = async () => {
    try {
      await deleteSet(setId).unwrap()
      setOpen(false)
      toast({ title: 'Set deleted from collection' })
      onDeleted?.()
      navigate({ to: '/sets' })
    } catch (error) {
      toast({
        title: 'Failed to delete set',
        description: 'Please try again',
        variant: 'destructive',
        action: (
          <Button variant="outline" size="sm" onClick={handleDelete}>
            Retry
          </Button>
        ),
      })
    }
  }

  const trigger = variant === 'button' ? (
    <Button variant="destructive" onClick={() => setOpen(true)}>
      <Trash className="w-4 h-4 mr-2" />
      Delete
    </Button>
  ) : (
    <DropdownMenuItem
      className="text-destructive"
      onSelect={(e) => {
        e.preventDefault()
        setOpen(true)
      }}
    >
      <Trash className="w-4 h-4 mr-2" />
      Delete Set
    </DropdownMenuItem>
  )

  return (
    <>
      {trigger}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete <strong>"{setTitle}"</strong> from your collection?
                </p>
                <p className="text-destructive font-medium">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Permanently
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

### Integration in Detail Page

```typescript
// In SetDetailPage header actions
<div className="flex gap-2">
  <Button
    variant="outline"
    onClick={() => navigate({ to: '/sets/$setId/edit', params: { setId } })}
  >
    <Pencil className="w-4 h-4 mr-2" />
    Edit
  </Button>
  <DeleteSetButton
    setId={setId}
    setTitle={set.title}
    variant="button"
  />
</div>
```

### Integration in SetCard Dropdown

```typescript
// In SetCard dropdown menu
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => onView?.()}>
    <Eye className="w-4 h-4 mr-2" />
    View Details
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => onEdit?.()}>
    <Pencil className="w-4 h-4 mr-2" />
    Edit
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DeleteSetButton
    setId={set.id}
    setTitle={set.title}
    variant="menuItem"
    onDeleted={() => {
      // Card will be removed by cache invalidation
    }}
  />
</DropdownMenuContent>
```

### Hard Delete Note

Per PRD: Sets use **hard delete** - there is no restore/undo after confirmation. The modal message makes this clear with "This action is permanent and cannot be undone."

## Testing

- [ ] Delete button opens confirmation modal
- [ ] Modal shows set title
- [ ] Modal warns about permanent deletion
- [ ] Cancel closes modal without action
- [ ] Confirm triggers delete API call
- [ ] Loading state shows during deletion
- [ ] Success navigates to gallery
- [ ] Success toast confirms deletion
- [ ] API failure shows error toast
- [ ] Retry option in error toast works
- [ ] Works from detail page button
- [ ] Works from card dropdown menu
- [ ] Keyboard accessible (Escape closes)

## Dependencies

- sets-1006: Delete Set Endpoint
- sets-1008: Set Card Component
- sets-1009: Detail Page

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Delete)
- PRD: "Hard delete (no restore)"
- PRD: "Confirmation modal ('Are you sure? This is permanent.')"
