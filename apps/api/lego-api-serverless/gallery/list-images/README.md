# List Gallery Images Lambda

Lambda handler for listing gallery images with pagination and filtering.

## Endpoint

- **Method**: GET
- **Path**: `/api/images`
- **Auth**: Required (JWT)

## Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search query (future feature)
- `albumId` (optional): Filter by album UUID (if omitted, returns standalone images only)

## Response

**Success (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "My Image",
      "description": "Description",
      "tags": ["tag1", "tag2"],
      "imageUrl": "https://...",
      "thumbnailUrl": "https://...",
      "albumId": null,
      "flagged": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastUpdatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Features

- Pagination support
- Album filtering
- User isolation (only returns user's images)
- Redis caching (5 minutes)
- Standalone images (no album) by default
