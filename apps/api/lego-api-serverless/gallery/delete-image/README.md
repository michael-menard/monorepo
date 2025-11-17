# Delete Gallery Image Lambda

Lambda handler for deleting gallery images (S3, database, search index).

## Endpoint

- **Method**: DELETE
- **Path**: `/api/images/:id`
- **Auth**: Required (JWT)

## Path Parameters

- `id` (required): UUID of the image

## Response

**Success (204)**:
```json
{
  "message": "Image deleted successfully"
}
```

**Error (404)**:
```json
{
  "error": "NOT_FOUND",
  "message": "Image not found"
}
```

**Error (403)**:
```json
{
  "error": "FORBIDDEN",
  "message": "Access denied to this image"
}
```

## Features

- Ownership verification
- S3 deletion (main image + thumbnail)
- Database record deletion
- OpenSearch index deletion
- Redis cache invalidation
- Graceful handling of missing thumbnails
