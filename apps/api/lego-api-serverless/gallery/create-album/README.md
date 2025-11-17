# Create Album Lambda

POST /api/albums - Create a new gallery album

## Request

```json
{
  "title": "My Album",
  "description": "Optional description",
  "coverImageId": "uuid-or-null"
}
```

## Response (201)

```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "My Album",
  "description": "Optional description",
  "coverImageId": null,
  "imageCount": 0,
  "coverImageUrl": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "lastUpdatedAt": "2024-01-01T00:00:00Z"
}
```
