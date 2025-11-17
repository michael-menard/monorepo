# Get MOC Parts Lists Handler

AWS Lambda handler for retrieving all parts lists associated with a MOC instruction.

## Endpoint

```
GET /api/moc-instructions/:mocId/parts-lists
```

## Authentication

Requires valid JWT token in Authorization header.

## Path Parameters

- `mocId` (string, required) - The ID of the MOC instruction

## Response

### Success (200)

```json
{
  "partsLists": [
    {
      "id": "string",
      "mocInstructionId": "string",
      "name": "string",
      "status": "planning|in_progress|completed",
      "totalParts": 0,
      "completedParts": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 0
}
```

### Error Responses

- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - MOC instruction not found or not owned by user
- `500 Internal Server Error` - Server error

## Functionality

1. Validates JWT token and extracts user ID
2. Verifies MOC ownership (user must own the MOC)
3. Retrieves all parts lists for the MOC
4. Returns parts lists ordered by creation date (newest first)

## Dependencies

- `@monorepo/db` - Database client and schema
- `drizzle-orm` - ORM for type-safe queries

## Configuration

- **Memory**: 256 MB
- **Timeout**: 10 seconds
- **Runtime**: Node.js 20.x
