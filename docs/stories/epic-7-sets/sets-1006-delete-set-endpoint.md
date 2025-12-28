# Story sets-1006: Delete Set Endpoint

## Status

Draft

## Story

**As a** user,
**I want** to remove a set from my collection,
**So that** I can keep my collection accurate.

## Acceptance Criteria

1. [ ] DELETE /api/sets/:id removes set permanently (hard delete)
2. [ ] Cascades delete to associated images
3. [ ] Returns 404 if set not found
4. [ ] Returns 403 if set belongs to different user
5. [ ] Returns 204 No Content on success
6. [ ] RTK Query mutation hook created and exported

## Tasks

- [ ] **Task 1: Create DELETE endpoint handler**
  - [ ] Create endpoint at apps/api/endpoints/sets/delete/
  - [ ] Extract setId from path params
  - [ ] Verify ownership before delete

- [ ] **Task 2: Implement hard delete**
  - [ ] Delete set (images cascade via FK)
  - [ ] Clean up S3 images if applicable
  - [ ] Return 204 on success

- [ ] **Task 3: RTK Query integration**
  - [ ] Add deleteSet mutation to setsApi
  - [ ] Invalidate LIST cache on success
  - [ ] Export useDeleteSetMutation hook

## Dev Notes

### Endpoint Handler

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
    await cleanupS3Images(images)
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
  ]).filter(Boolean)

  if (keys.length > 0) {
    await s3.deleteObjects({
      Bucket: process.env.SETS_BUCKET,
      Delete: { Objects: keys.map(Key => ({ Key })) },
    })
  }
}
```

### RTK Query Hook

```typescript
deleteSet: builder.mutation<void, string>({
  query: (id) => ({
    url: `/sets/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: [{ type: 'Set', id: 'LIST' }],
}),
```

### Hard Delete Note

Per PRD: Sets use **hard delete** (no restore). This differs from some other entities that use soft delete. The confirmation UI (sets-1015) will warn users this is permanent.

## Testing

- [ ] API test: deletes set successfully
- [ ] API test: returns 204 on success
- [ ] API test: cascades delete to images
- [ ] API test: returns 404 for non-existent ID
- [ ] API test: returns 403 for unauthorized user
- [ ] API test: unauthenticated request returns 401
- [ ] API test: S3 cleanup is triggered (mock S3)
- [ ] Unit test: RTK Query mutation invalidates list cache

## Dependencies

- sets-1000: Database Schema
- sets-1001: Zod Schemas

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Delete)
- PRD notes: "Hard delete (no restore)"
