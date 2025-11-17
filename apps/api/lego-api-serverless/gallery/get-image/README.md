# Get Gallery Image Lambda

Lambda handler for retrieving a single gallery image by ID.

## Endpoint

- **Method**: GET
- **Path**: `/api/images/:id`
- **Auth**: Required (JWT)

## Path Parameters

- `id` (required): UUID of the image

## Response

**Success (200)**:
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

- UUID validation
- Ownership verification (user can only access their own images)
- Redis caching (10 minutes)
- Proper error handling with meaningful status codes
