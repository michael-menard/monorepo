# Parse Parts List Lambda Function

**Story**: 4.6 - Implement CSV Parts List Parser Lambda

## Overview

Lambda function that parses CSV parts lists uploaded to S3 for MOC (My Own Creation) projects. The function downloads the CSV file from S3, validates and parses the data, and stores the parts information in the database.

## API Endpoint

```
POST /api/mocs/{id}/upload-parts-list
```

## Request Body

```json
{
  "s3Key": "parts-lists/{mocId}/{uuid}.csv",
  "mocId": "uuid-of-moc"
}
```

### Parameters

- `s3Key` (string, required): S3 key where the CSV file was uploaded
- `mocId` (string, required): UUID of the MOC to associate the parts list with

## CSV Format

The CSV file must have the following columns (case-sensitive):

- `Part ID` (required): LEGO part number (e.g., "3001")
- `Part Name` (required): Part description (e.g., "Brick 2 x 4")
- `Quantity` (required): Number of parts (positive integer)
- `Color` (required): Part color (e.g., "Red")

### Example CSV

```csv
Part ID,Part Name,Quantity,Color
3001,Brick 2 x 4,25,Red
3002,Brick 2 x 3,15,Blue
3003,Brick 2 x 2,50,Yellow
```

## Validation Rules

1. **File Format**: Must be a valid CSV with headers
2. **Max Rows**: 10,000 rows maximum
3. **Required Columns**: All four columns must be present
4. **Quantity**: Must be a positive integer
5. **Ownership**: User must own the MOC

## Response

### Success (200)

```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "partsListId": "uuid",
      "totalParts": 1250,
      "rowsProcessed": 125
    }
  }
}
```

### Error Responses

| Status Code | Error Type | Description |
|-------------|-----------|-------------|
| 400 | VALIDATION_ERROR | Invalid CSV format, missing columns, or invalid data |
| 401 | UNAUTHORIZED | Missing or invalid JWT token |
| 404 | NOT_FOUND | MOC not found or user doesn't have access |
| 500 | SERVER_ERROR | S3 download failed |
| 500 | DATABASE_ERROR | Failed to save parts list |

## Database Operations

The function performs the following operations in a transaction:

1. **Create Parts List Record** (`mocPartsLists` table):
   - Generates unique ID
   - Associates with MOC
   - Stores total parts count

2. **Insert Individual Parts** (`mocParts` table):
   - Inserts parts in batches of 1000 for performance
   - Stores part ID, name, quantity, and color for each part

3. **Update MOC**: Updates the MOC's `partsCount` field with the total

## Performance Characteristics

- **Lambda Timeout**: 5 minutes (300 seconds)
- **Lambda Memory**: 512 MB
- **Batch Insert Size**: 1,000 rows per database operation
- **Expected Performance**:
  - 1,000 rows: <10 seconds
  - 5,000 rows: <30 seconds
  - 10,000 rows: <60 seconds

## Environment Variables

- `BUCKET_NAME`: S3 bucket name for file storage (linked via SST)
- `NODE_ENV`: Environment (production/development)
- `STAGE`: Deployment stage

## Dependencies

- `@monorepo/db`: Database client and schema
- `@monorepo/lambda-auth`: JWT authentication utilities
- `@monorepo/lambda-responses`: Response formatting
- `csv-parser`: CSV parsing library
- `zod`: Schema validation
- `nanoid`: Unique ID generation

## Usage Flow

1. **Client uploads CSV to S3**:
   ```typescript
   const csvKey = `parts-lists/${mocId}/${uuid()}.csv`
   await uploadToS3({ key: csvKey, body: csvBuffer, contentType: 'text/csv' })
   ```

2. **Client invokes Lambda**:
   ```typescript
   POST /api/mocs/{mocId}/upload-parts-list
   {
     "s3Key": csvKey,
     "mocId": mocId
   }
   ```

3. **Lambda processes CSV**:
   - Downloads from S3
   - Parses and validates
   - Stores in database

4. **Client receives response** with parts list ID and totals

## Error Handling

The function handles various error scenarios:

- **CSV Parsing Errors**: Invalid format, malformed data
- **Validation Errors**: Missing columns, invalid quantities, row limit exceeded
- **S3 Errors**: File not found, access denied
- **Database Errors**: Transaction failures, constraint violations

All errors are logged and returned with appropriate HTTP status codes.

## Security

- **Authentication**: JWT token required (Cognito Authorizer)
- **Authorization**: User must own the MOC
- **Input Validation**: Zod schemas for request body
- **SQL Injection**: Protected by Drizzle ORM parameterized queries

## Testing

See test files for comprehensive test coverage including:
- Valid CSV parsing
- CSV validation errors
- Authorization checks
- Database transaction integrity
- Large file handling (10,000 rows)

## Related Files

- Handler: `/moc-parts-lists/parse-parts-list/index.ts`
- Schema: `/packages/tools/db/src/schema.ts` (mocPartsLists, mocParts tables)
- Config: `/sst.config.ts` (ParsePartsListFunction)
- Story: `/docs/stories/4.6-csv-parts-list-parser.md`
