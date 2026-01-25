# DEV-FEASIBILITY: STORY-008 - Gallery Images Write

## Summary

STORY-008 is highly feasible with minimal risk. The codebase has well-established patterns for PATCH and DELETE operations on gallery resources (see `albums/[id].ts`), and the database schema already supports all required operations. The `gallery_images` table has no `deletedAt` column, so hard delete is the natural approach. The `gallery_flags` table has `ON DELETE CASCADE` configured, so flag cleanup is automatic. S3 deletion requires the `@aws-sdk/client-s3` package which is already a dependency in the API project. The main consideration is whether to defer S3 deletion or accept potential orphan files on S3 failure.

## Code Surface

| Location | Change Type | Notes |
|----------|-------------|-------|
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | Modify | Add PATCH and DELETE handlers (currently only has GET) |
| `packages/backend/gallery-core/src/update-image.ts` | Create | New core function following `update-album.ts` pattern |
| `packages/backend/gallery-core/src/delete-image.ts` | Create | New core function following `delete-album.ts` pattern |
| `packages/backend/gallery-core/src/__types__/index.ts` | Modify | Add `UpdateImageInputSchema`, `UpdateImageInput` |
| `packages/backend/gallery-core/src/index.ts` | Modify | Export new functions |
| `packages/backend/gallery-core/src/__tests__/update-image.test.ts` | Create | Unit tests for update function |
| `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` | Create | Unit tests for delete function |

**Existing Patterns to Follow:**
- `apps/api/platforms/vercel/api/gallery/albums/[id].ts` - PATCH/DELETE handler structure (lines 175-337)
- `packages/backend/gallery-core/src/update-album.ts` - Core update function pattern with DI
- `packages/backend/gallery-core/src/delete-album.ts` - Core delete function pattern with DI
- `apps/api/platforms/aws/endpoints/sets/images/delete/handler.ts` - S3 deletion pattern with `@aws-sdk/client-s3`

## Schema Analysis

### gallery_images Table

```sql
CREATE TABLE "gallery_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "tags" jsonb,
  "image_url" text NOT NULL,
  "thumbnail_url" text,
  "album_id" uuid,
  "flagged" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_updated_at" timestamp DEFAULT now() NOT NULL
);
```

**Key Observations:**
- No `deleted_at` column - soft delete not supported without migration
- `title` is NOT NULL - must remain required in update
- `description`, `tags`, `thumbnail_url`, `album_id` are nullable - can be set to null
- `flagged` boolean exists but is managed by flag operations, not PATCH

### gallery_flags Table (Cascade Delete)

```sql
ALTER TABLE "gallery_flags" ADD CONSTRAINT "gallery_flags_image_id_gallery_images_id_fk"
  FOREIGN KEY ("image_id") REFERENCES "public"."gallery_images"("id")
  ON DELETE cascade ON UPDATE no action;
```

**Cascade Rules:**
- `gallery_flags` - CASCADE DELETE (flags auto-deleted when image deleted)
- `moc_gallery_images` - CASCADE DELETE (MOC links auto-deleted when image deleted)

### Related Tables Affected by DELETE

| Table | FK Constraint | On Delete |
|-------|---------------|-----------|
| `gallery_flags` | `image_id -> gallery_images.id` | CASCADE |
| `moc_gallery_images` | `gallery_image_id -> gallery_images.id` | CASCADE |
| `gallery_albums.cover_image_id` | No FK constraint defined | N/A (manual handling needed) |

**Important:** If a deleted image is set as `cover_image_id` on an album, the album will have a dangling reference. This should be handled by setting `cover_image_id = NULL` on affected albums before deleting the image.

## Dependency Analysis

### Packages

| Package | Status | Notes |
|---------|--------|-------|
| `@aws-sdk/client-s3` | Already installed | Used in `apps/api/platforms/aws/endpoints/sets/images/delete/handler.ts` |
| `drizzle-orm` | Already installed | Core ORM for all operations |
| `zod` | Already installed | Input validation |

### Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Exists | Used for DB connection |
| `GALLERY_BUCKET` or `S3_BUCKET` | TBD | Need to verify gallery images bucket name env var |
| `AUTH_BYPASS` | Exists | Dev auth bypass |

**Action Required:** Verify which S3 bucket env var is used for gallery images. The sets feature uses `SETS_BUCKET`. Gallery may use a different bucket or shared bucket.

### Infrastructure

- No new infrastructure required
- S3 bucket for gallery images already exists (images have URLs)
- Database schema supports all operations

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Orphan S3 files if S3 delete fails after DB delete | Medium | Low | Log warning, do not fail request (existing pattern in sets/images/delete). Consider background cleanup job for future. |
| Dangling `cover_image_id` on albums | Medium | Medium | Check and null out `cover_image_id` on any albums using the deleted image before deletion. |
| Race condition: concurrent delete and update | Low | Low | Use DB transaction for delete operation. Postgres will handle locks. |
| S3 bucket env var not configured for Vercel | Medium | Medium | Verify env var exists. Add to vercel.json if missing. May need to defer S3 deletion to V2. |
| Deleting image linked to MOC breaks MOC display | Low | Medium | CASCADE handles DB cleanup. MOC UI should handle missing images gracefully. |

### Order of Operations for DELETE

**Recommended: DB-first approach (matching existing pattern)**

1. Verify image exists and user owns it
2. Check if image is `cover_image_id` for any album - if so, set to NULL
3. Retrieve `image_url` and `thumbnail_url` for S3 cleanup
4. Delete DB record (cascades to `gallery_flags`, `moc_gallery_images`)
5. Attempt S3 deletion (best effort, log failure, do not fail request)
6. Return 204 No Content

**Rationale:** This matches the existing pattern in `sets/images/delete/handler.ts`. The alternative (S3-first) risks DB orphans if DB delete fails, which is harder to recover from than S3 orphans.

## Recommendations

### 1. Hard Delete (Recommended)

**Recommendation:** Use hard delete, not soft delete.

**Justification:**
- `gallery_images` table has no `deleted_at` column
- Adding soft delete requires a migration
- Existing `delete-album` uses hard delete pattern
- Cascade delete on `gallery_flags` is already configured for hard delete
- For MVP, hard delete is simpler and sufficient
- S3 cleanup makes soft delete more complex (would need separate cleanup job)

### 2. S3 Deletion Strategy

**Recommendation:** Best-effort S3 deletion, do not fail request on S3 error.

**Justification:**
- Matches existing pattern in `sets/images/delete/handler.ts`
- S3 orphans are low-impact (storage cost) vs DB orphans (data integrity)
- Future enhancement: background job to reconcile S3 with DB

### 3. Cover Image Handling

**Recommendation:** Before deleting an image, check if it's used as `cover_image_id` for any album and set to NULL.

**Implementation:**
```typescript
// Before deleting the image
await db
  .update(galleryAlbums)
  .set({ coverImageId: null })
  .where(eq(galleryAlbums.coverImageId, imageId))
```

### 4. Updatable Fields for PATCH

**Recommendation:** Allow updating these fields only:
- `title` (required, non-empty)
- `description` (nullable)
- `tags` (nullable array)
- `albumId` (nullable UUID, validates album exists and user owns it)

**Do NOT allow updating:**
- `imageUrl` - changing the image is a delete + re-upload
- `thumbnailUrl` - generated, not user-editable
- `flagged` - managed via flag endpoint
- `userId`, `id`, timestamps - system managed

## Missing ACs

The PM should consider adding these acceptance criteria:

### For PATCH `/api/gallery/images/:id`

1. **AC: Album validation on albumId change**
   > When updating `albumId` to a non-null value, verify the album exists and belongs to the authenticated user. Return 400 if album not found, 403 if album belongs to another user.

2. **AC: Title cannot be empty**
   > When updating `title`, it must be at least 1 character. Return 400 with validation error if empty string provided.

3. **AC: Tags array validation**
   > When updating `tags`, each tag must be a non-empty string with max length 50. Maximum 20 tags allowed. Return 400 if validation fails.

### For DELETE `/api/gallery/images/:id`

4. **AC: Cover image cleanup**
   > When deleting an image that is set as `coverImageId` for one or more albums, those albums must have their `coverImageId` set to NULL before the image is deleted.

5. **AC: S3 cleanup behavior**
   > S3 deletion is best-effort. If S3 deletion fails, the request should still succeed (return 204) and log the failure for manual review.

6. **AC: MOC gallery link cleanup**
   > When an image is deleted, all entries in `moc_gallery_images` referencing that image are automatically cascade-deleted by the database.

### General

7. **AC: Response format consistency**
   > PATCH should return the updated image object matching the GET response format. DELETE should return 204 No Content with no body.

8. **AC: S3 bucket configuration**
   > Document which environment variable holds the gallery images bucket name, and ensure it is configured in Vercel deployment.

## Appendix: Vercel S3 Configuration

**Action Item:** Verify S3 bucket access for Vercel functions.

The AWS Lambda handlers use `SETS_BUCKET` for set images. Gallery images may use:
- A shared bucket with different prefix
- A separate `GALLERY_BUCKET` env var
- No S3 deletion in V1 (defer to background job)

Check `apps/api/platforms/vercel/vercel.json` and `.env` files to determine current configuration. If S3 is not configured for Vercel, the story should either:
1. Add S3 configuration to Vercel deployment
2. Explicitly scope out S3 deletion for V1 (accept orphan files until AWS Lambda migration)
