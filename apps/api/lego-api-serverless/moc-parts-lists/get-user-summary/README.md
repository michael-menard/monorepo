# Get User Parts List Summary Handler

AWS Lambda handler for retrieving summary statistics of all parts lists across all user's MOCs.

## Endpoint

```
GET /api/user/parts-lists/summary
```

## Authentication

Requires valid JWT token in Authorization header.

## Response

### Success (200)

```json
{
  "summary": {
    "totalPartsLists": 0,
    "byStatus": {
      "planning": 0,
      "in_progress": 0,
      "completed": 0
    },
    "totalParts": 0,
    "totalCompletedParts": 0,
    "completionPercentage": 0
  }
}
```

### Error Responses

- `401 Unauthorized` - Missing or invalid JWT token
- `500 Internal Server Error` - Server error

## Functionality

1. Validates JWT token and extracts user ID
2. Retrieves all MOCs owned by the user
3. Aggregates statistics across all parts lists for user's MOCs:
   - Total number of parts lists
   - Count by status (planning, in_progress, completed)
   - Total parts across all lists
   - Total completed parts across all lists
   - Overall completion percentage
4. Returns aggregated summary

## Response Fields

- `totalPartsLists` - Total number of parts lists across all user's MOCs
- `byStatus.planning` - Number of parts lists in "planning" status
- `byStatus.in_progress` - Number of parts lists in "in_progress" status
- `byStatus.completed` - Number of parts lists in "completed" status
- `totalParts` - Sum of all parts across all parts lists
- `totalCompletedParts` - Sum of all completed parts across all parts lists
- `completionPercentage` - Overall completion percentage (0-100)

## Use Case

This endpoint provides a high-level overview of a user's parts collection progress across all their MOC projects. Useful for dashboard displays or progress tracking.

## Notes

- If the user has no MOCs, returns empty summary with all counts at 0
- Completion percentage is rounded to nearest integer
- Aggregates data across all MOCs owned by the user

## Dependencies

- `@monorepo/db` - Database client and schema
- `drizzle-orm` - ORM for type-safe queries

## Configuration

- **Memory**: 512 MB
- **Timeout**: 20 seconds
- **Runtime**: Node.js 20.x
