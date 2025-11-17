# Flag Gallery Image Lambda

Lambda handler for flagging images for moderation review.

## Endpoint

- **Method**: POST
- **Path**: `/api/flag`
- **Auth**: Required (JWT)

## Request Body

```json
{
  "imageId": "uuid",
  "reason": "Optional reason for flagging"
}
```

## Response

**Success (201)**:
```json
{
  "message": "Image flagged for moderation",
  "flag": {
    "imageId": "uuid",
    "userId": "uuid",
    "reason": "Inappropriate content",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastUpdatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error (409)**:
```json
{
  "error": "CONFLICT",
  "message": "You have already flagged this image"
}
```

## Features

- Duplicate flag prevention (one flag per user per image)
- Optional reason field
- Validation with Zod schema
- Moderation workflow support
