# Story sets-2004: Delete Set Flow

## Status

Draft

## Consolidates

- sets-1006: Delete Set Endpoint
- sets-1015: Delete Confirmation Modal

## Story

**As a** user,
**I want** to delete sets from my collection with confirmation,
**So that** I don't accidentally remove items.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - CRUD Operations > Delete

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2001**: Sets Gallery MVP (for integration points)

## Acceptance Criteria

### Delete Endpoint

1. [ ] DELETE /api/sets/:id removes set permanently (hard delete)
2. [ ] Cascades delete to associated images
3. [ ] Cleans up S3 images
4. [ ] Returns 404 if set not found
5. [ ] Returns 403 if set belongs to different user
6. [ ] Returns 204 No Content on success
7. [ ] RTK Query mutation hook created and exported

### Delete Confirmation

8. [ ] Delete button triggers confirmation modal
9. [ ] Modal clearly states deletion is permanent (hard delete)
10. [ ] Shows set name for clarity
11. [ ] Cancel returns without action
12. [ ] Confirm deletes and navigates to gallery
13. [ ] Toast confirms deletion
14. [ ] Loading state during deletion
15. [ ] Error handling with retry option

## Tasks / Subtasks

### Task 1: Create DELETE Endpoint (AC: 1-6)

- [ ] Create `apps/api/endpoints/sets/delete/handler.ts`
- [ ] Extract setId from path params
- [ ] Verify ownership before delete
- [ ] Fetch images for S3 cleanup
- [ ] Delete set (images cascade via FK)
- [ ] Clean up S3 images (fire and forget)
- [ ] Return 204 on success

### Task 2: RTK Query Mutation (AC: 7)

- [ ] Add `deleteSet` mutation to setsApi
- [ ] Invalidate LIST cache on success
- [ ] Export `useDeleteSetMutation` hook

### Task 3: Create DeleteSetButton Component (AC: 8-15)

- [ ] Create reusable DeleteSetButton component
- [ ] Support button and menuItem variants
- [ ] AlertDialog for confirmation
- [ ] Clear warning about permanent deletion
- [ ] Loading state on confirm button
- [ ] Error handling with retry
- [ ] Navigate to gallery on success
- [ ] Toast confirmation

### Task 4: Integrate into UI

- [ ] Add DeleteSetButton to detail page header
- [ ] Add DeleteSetButton to SetCard dropdown menu

## Dev Notes

### Delete Endpoint Handler

```typescript
// apps/api/endpoints/sets/delete/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id

  if (!setId) {
    return badRequest('Set ID required')
  }

  const existingSet = await getSetById(setId)

  if (!existingSet) {
    return notFound('Set not found')
  }

  if (existingSet.userId !== userId) {
    return forbidden('Not authorized to delete this set')
  }

  // Get image URLs for S3 cleanup
  const images = await db
    .select({ imageUrl: setImages.imageUrl, thumbnailUrl: setImages.thumbnailUrl })
    .from(setImages)
    .where(eq(setImages.setId, setId))

  // Delete set (cascades to images via FK)
  await db.delete(sets).where(eq(sets.id, setId))

  // Clean up S3 images in background (fire and forget)
  if (images.length > 0) {
    cleanupS3Images(images).catch(err => {
      logger.error('Failed to cleanup S3 images', { setId, err })
    })
  }

  return noContent()
}
```

### S3 Cleanup

```typescript
async function cleanupS3Images(images: { imageUrl: string; thumbnailUrl: string | null }[]) {
  const keys = images.flatMap(img => [
    extractS3KeyFromUrl(img.imageUrl),
    img.thumbnailUrl ? extractS3KeyFromUrl(img.thumbnailUrl) : null,
  ]).filter(Boolean) as string[]

  if (keys.length > 0) {
    await s3.deleteObjects({
      Bucket: process.env.SETS_BUCKET,
      Delete: { Objects: keys.map(Key => ({ Key })) },
    })
  }
}

function extractS3KeyFromUrl(url: string): string {
  // Extract key from S3 URL
  // https://bucket.s3.amazonaws.com/sets/xxx/image.jpg -> sets/xxx/image.jpg
  const urlObj = new URL(url)
  return urlObj.pathname.slice(1) // Remove leading /
}
```

### RTK Query Mutation

```typescript
// In sets-api.ts
deleteSet: builder.mutation<void, string>({
  query: (id) => ({
    url: `/sets/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: [{ type: 'Set', id: 'LIST' }],
}),
```

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

### API Tests

- [ ] DELETE /api/sets/:id deletes set successfully
- [ ] Returns 204 on success
- [ ] Cascades delete to images table
- [ ] Returns 404 for non-existent ID
- [ ] Returns 403 for unauthorized user
- [ ] Unauthenticated request returns 401
- [ ] S3 cleanup is triggered (mock S3)
- [ ] Set is actually removed from database

### Component Tests

- [ ] Button variant opens confirmation modal
- [ ] MenuItem variant opens confirmation modal
- [ ] Modal shows set title
- [ ] Modal shows permanent deletion warning
- [ ] Cancel closes modal without action
- [ ] Confirm calls delete mutation
- [ ] Loading state shows on confirm button
- [ ] Success navigates to gallery
- [ ] Success shows toast
- [ ] Error shows toast with retry

### Integration Tests

- [ ] Delete from detail page works
- [ ] Delete from card dropdown works
- [ ] Gallery refreshes after delete
- [ ] Keyboard accessible (Escape closes modal)

## Definition of Done

- [ ] Sets can be permanently deleted
- [ ] Images are cleaned up from S3
- [ ] Confirmation prevents accidental deletion
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1006, 1015        | Claude |
