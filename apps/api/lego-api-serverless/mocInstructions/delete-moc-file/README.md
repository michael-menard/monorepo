# Delete MOC File Lambda Function

Deletes a file attachment from a MOC instruction

## Overview

- **Domain:** mocInstructions
- **Authentication:** ownership (user must own the MOC)
- **Runtime:** Node.js 20.x
- **Database:** PostgreSQL via @monorepo/db

## Functionality

This Lambda function handles deletion of file attachments (instructions, parts lists, images) from MOC instructions. It verifies:
- User authentication
- MOC ownership
- File existence and association with the MOC

After deletion, it updates the MOC's `updatedAt` timestamp.

## API Endpoints

- `DELETE /api/mocs/:id/files/:fileId` - Delete a file from a MOC

## Dependencies

- `@monorepo/db` - Database client and schema
- `aws-lambda` - AWS Lambda type definitions
- `uuid` - UUID generation

## Development

This function is part of the `lego-api-serverless` monorepo and deployed via SST.

### Local Testing

```bash
pnpm test
```

### Deployment

Deployed automatically via SST when changes are pushed to the main branch.
