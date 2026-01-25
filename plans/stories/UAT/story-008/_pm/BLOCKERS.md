# BLOCKERS: STORY-008 - Gallery Images Write

## Status: NO BLOCKERS

All blocking decisions have been resolved by PM:

### Resolved Decisions

| Decision | Resolution |
|----------|------------|
| Soft vs Hard Delete | **Hard delete** - No `deleted_at` column exists, cascade deletes configured, matches existing patterns |
| S3 Deletion Strategy | **Best-effort, DB-first** - Delete DB record, then attempt S3 cleanup. Log S3 failures, do not fail request. |
| Album Cover Handling | **Clear coverImageId** - Before deleting image, set `coverImageId = NULL` on any albums using it |
| Album Validation on Update | **Yes** - Validate albumId exists and belongs to user |
| Empty Body Handling | **200 with updated lastUpdatedAt** - Empty PATCH is valid no-op |

### Implementation Notes

1. **No migration required** - Hard delete removes rows directly
2. **Cascade deletes automatic** - `gallery_flags` and `moc_gallery_images` have `ON DELETE CASCADE`
3. **S3 bucket config** - Need to verify env var for gallery images S3 bucket exists in Vercel config

This story is unblocked and ready for implementation.
