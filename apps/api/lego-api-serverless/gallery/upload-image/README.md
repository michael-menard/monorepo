# Upload Gallery Image Lambda

Lambda handler for uploading gallery images with multipart form data.

## Endpoint

- **Method**: POST
- **Path**: `/api/images`
- **Auth**: Required (JWT)

## Request

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` (required): Image file (JPEG, PNG, WebP, max 10MB)
- `title` (required): Image title (string)
- `description` (optional): Image description (string)
- `tags` (optional): JSON array of tags (e.g., `["tag1", "tag2"]`)
- `albumId` (optional): UUID of album to add image to

## Response

**Success (201)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "My Image",
  "description": "Description",
  "tags": ["tag1", "tag2"],
  "imageUrl": "https://...",
  "thumbnailUrl": "https://...",
  "albumId": "uuid",
  "flagged": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "lastUpdatedAt": "2024-01-01T00:00:00Z"
}
```

## Features

- Multipart form data parsing
- File validation (type, size)
- Image processing with Sharp (resize, optimize, WebP conversion)
- Thumbnail generation (400px)
- S3 upload (main image + thumbnail)
- PostgreSQL record creation
- OpenSearch indexing
- Redis cache invalidation
