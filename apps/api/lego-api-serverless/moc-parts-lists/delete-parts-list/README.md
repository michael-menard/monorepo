# Delete MOC Parts List Handler

AWS Lambda handler for deleting a parts list and all its associated items.

## Endpoint

```
DELETE /api/moc-instructions/:mocId/parts-lists/:partsListId
```

## Authentication

Requires valid JWT token in Authorization header.

## Path Parameters

- `mocId` (string, required) - The ID of the MOC instruction
- `partsListId` (string, required) - The ID of the parts list to delete

## Response

### Success (200)

```json
{
  "message": "Parts list deleted successfully",
  "partsListId": "string"
}
```

### Error Responses

- `400 Bad Request` - Missing required path parameters
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - MOC instruction or parts list not found
- `500 Internal Server Error` - Server error

## Functionality

1. Validates JWT token and extracts user ID
2. Verifies MOC ownership (user must own the MOC)
3. Verifies parts list exists and belongs to the MOC
4. Deletes all parts list items (cascade delete)
5. Deletes the parts list
6. Returns success message

## Notes

- **Cascade Delete**: All parts list items are automatically deleted when the parts list is deleted
- This operation is permanent and cannot be undone
- User must own the MOC to delete its parts lists

## Dependencies

- `@monorepo/db` - Database client and schema
- `drizzle-orm` - ORM for type-safe queries

## Configuration

- **Memory**: 256 MB
- **Timeout**: 10 seconds
- **Runtime**: Node.js 20.x
