# Create MOC Parts List Handler

AWS Lambda handler for creating a new parts list for a MOC instruction.

## Endpoint

```
POST /api/moc-instructions/:mocId/parts-lists
```

## Authentication

Requires valid JWT token in Authorization header.

## Path Parameters

- `mocId` (string, required) - The ID of the MOC instruction

## Request Body

```json
{
  "name": "string (required)",
  "parts": [
    {
      "partNumber": "string (required)",
      "partName": "string (required)",
      "quantity": "number (required)",
      "colorId": "string (optional)",
      "colorName": "string (optional)",
      "category": "string (optional)",
      "imageUrl": "string (optional)"
    }
  ]
}
```

## Response

### Success (201)

```json
{
  "partsList": {
    "id": "string",
    "mocInstructionId": "string",
    "name": "string",
    "status": "planning",
    "totalParts": 0,
    "completedParts": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

- `400 Bad Request` - Missing required fields or invalid data
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - MOC instruction not found or not owned by user
- `500 Internal Server Error` - Server error

## Functionality

1. Validates JWT token and extracts user ID
2. Validates request body (name is required)
3. Verifies MOC ownership (user must own the MOC)
4. Creates new parts list with status "planning"
5. Creates parts list items if provided
6. Returns created parts list

## Dependencies

- `@monorepo/db` - Database client and schema
- `drizzle-orm` - ORM for type-safe queries
- `nanoid` - ID generation

## Configuration

- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Runtime**: Node.js 20.x
