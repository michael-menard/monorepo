# Search Gallery Images Lambda

Lambda handler for searching gallery images using OpenSearch with PostgreSQL fallback.

## Endpoint

- **Method**: GET
- **Path**: `/api/images/search`
- **Auth**: Required (JWT)

## Query Parameters

- `search` (required): Search query string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

## Response

**Success (200)**:
```json
{
  "success": true,
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
  "total": 42,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Features (Story 3.8)

- **OpenSearch multi-match**: Searches title, description, tags
- **Fuzzy matching**: Tolerates typos
- **Relevance scoring**: Results sorted by match quality
- **User isolation**: Only searches user's images
- **PostgreSQL fallback**: Auto-fallback if OpenSearch unavailable
- **Redis caching**: 2-minute TTL for repeat queries
- **Performance tracking**: Logs search duration and source
