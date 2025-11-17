# Update MOC Parts List Status Handler

AWS Lambda handler for updating the status of a parts list (partial update).

## Endpoint

```
PATCH /api/moc-instructions/:mocId/parts-lists/:partsListId/status
```

## Authentication

Requires valid JWT token in Authorization header.

## Path Parameters

- `mocId` (string, required) - The ID of the MOC instruction
- `partsListId` (string, required) - The ID of the parts list to update

## Request Body

```json
{
  "status": "planning|in_progress|completed (required)"
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

- `400 Bad Request` - Missing or invalid status
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - MOC instruction or parts list not found
- `500 Internal Server Error` - Server error

## Functionality

1. Validates JWT token and extracts user ID
2. Validates status value (must be: planning, in_progress, or completed)
3. Verifies MOC ownership (user must own the MOC)
4. Verifies parts list exists and belongs to the MOC
5. Updates only the status field
6. Returns updated parts list

## Valid Status Values

- `planning` - Initial state, user is planning which parts to acquire
- `in_progress` - User has started acquiring parts
- `completed` - All parts have been acquired

## Use Case

This endpoint is useful for simple status transitions without modifying the entire parts list. Use `PUT /api/moc-instructions/:mocId/parts-lists/:partsListId` for full updates including parts.

## Dependencies

- `@monorepo/db` - Database client and schema
- `drizzle-orm` - ORM for type-safe queries

## Configuration

- **Memory**: 256 MB
- **Timeout**: 10 seconds
- **Runtime**: Node.js 20.x
