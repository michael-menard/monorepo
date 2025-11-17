# Update Gallery Image Lambda

Lambda handler for updating gallery image metadata.

## Endpoint

- **Method**: PATCH
- **Path**: `/api/images/:id`
- **Auth**: Required (JWT)

## Path Parameters

- `id` (required): UUID of the image

## Request Body

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["new", "tags"],
  "albumId": "uuid-or-null"
}
```

All fields are optional. Only provided fields will be updated.

## Response

**Success (200)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["new", "tags"],
  "imageUrl": "https://...",
  "thumbnailUrl": "https://...",
  "albumId": "uuid",
  "flagged": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "lastUpdatedAt": "2024-01-01T12:00:00Z"
}
```

## Features

- Partial updates (only update provided fields)
- Ownership verification
- OpenSearch index update
- Redis cache invalidation (detail + list caches)
- Validation with Zod schema
