# Update MOC Parts List Handler

AWS Lambda handler for updating an existing parts list (full replacement).

## Endpoint

```
PUT /api/moc-instructions/:mocId/parts-lists/:partsListId
```

## Authentication

Requires valid JWT token in Authorization header.

## Path Parameters

- `mocId` (string, required) - The ID of the MOC instruction
- `partsListId` (string, required) - The ID of the parts list to update

## Request Body

All fields are optional. Only provided fields will be updated.

```json
{
  "name": "string (optional)",
  "status": "planning|in_progress|completed (optional)",
  "parts": [
    {
      "id": "string (optional, for existing items)",
      "partNumber": "string (required)",
      "partName": "string (required)",
      "quantity": "number (required)",
      "colorId": "string (optional)",
      "colorName": "string (optional)",
      "category": "string (optional)",
      "imageUrl": "string (optional)",
      "acquired": "boolean (optional)"
    }
  ]
}
```

## Response

### Success (200)

```json
{
  "partsList": {
    "id": "string",
    "mocInstructionId": "string",
    "name": "string",
    "status": "planning|in_progress|completed",
    "totalParts": 0,
    "completedParts": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

- `400 Bad Request` - Missing required path parameters or invalid data
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - MOC instruction or parts list not found
- `500 Internal Server Error` - Server error

## Functionality

1. Validates JWT token and extracts user ID
2. Verifies MOC ownership (user must own the MOC)
3. Verifies parts list exists and belongs to the MOC
4. Updates parts list metadata (name, status) if provided
5. Replaces all parts list items if parts array is provided
6. Automatically updates totalParts and completedParts counts
7. Returns updated parts list

## Notes

- When `parts` array is provided, **all existing items are deleted and replaced**
- The `totalParts` and `completedParts` fields are automatically calculated
- `completedParts` is calculated from the number of items with `acquired: true`

## Dependencies

- `@monorepo/db` - Database client and schema
- `drizzle-orm` - ORM for type-safe queries
- `nanoid` - ID generation for new items

## Configuration

- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Runtime**: Node.js 20.x
