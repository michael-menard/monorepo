# Link Gallery Image Lambda Function

Links an existing gallery image to a MOC instruction

## Overview

- **Domain:** mocInstructions
- **Authentication:** ownership
- **Runtime:** Node.js 20.x
- **Database:** PostgreSQL via @monorepo/db

## Functionality

Creates an association between a gallery image and a MOC instruction. Validates that both the MOC and image exist, and that the user owns the MOC.

## API Endpoints

- `POST /api/mocs/:id/gallery-images` - Link a gallery image to a MOC

## Request Body

```json
{
  "galleryImageId": "uuid"
}
```

## Dependencies

- `@monorepo/db` - Database client and schema
- `aws-lambda` - AWS Lambda type definitions

## Development

This function is part of the `lego-api-serverless` monorepo and deployed via SST.
