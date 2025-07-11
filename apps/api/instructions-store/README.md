# File Upload API

A serverless file upload API built with AWS AppSync, DynamoDB, and S3 using the Serverless Framework.

## Architecture

- **AppSync**: GraphQL API for file operations
- **DynamoDB**: File metadata storage with user-based indexing
- **S3**: File storage with presigned URLs for secure uploads
- **Lambda**: Serverless functions for file processing

## Features

- Secure file uploads with presigned URLs
- File type and size validation
- User-based file organization
- Real-time file status tracking
- Automatic cleanup on deletion
- CORS support for web applications

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ installed
- Serverless Framework CLI installed globally

```bash
npm install -g serverless
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

3. **Deploy to AWS:**
   ```bash
   npm run deploy
   ```

4. **Deploy to production:**
   ```bash
   npm run deploy:prod
   ```

## Local Development

Run the API locally for development:

```bash
npm run offline
```

This will start a local AppSync endpoint at `http://localhost:20002`.

## API Operations

### Upload File

```graphql
mutation UploadFile($input: UploadFileInput!) {
  uploadFile(input: $input) {
    file {
      id
      name
      size
      type
      url
      userId
      createdAt
      status
    }
    presignedUrl
    expiresAt
  }
}
```

Variables:
```json
{
  "input": {
    "name": "document.pdf",
    "size": 1024000,
    "type": "application/pdf",
    "userId": "user123"
  }
}
```

### List Files

```graphql
query ListFiles($userId: String!, $limit: Int, $nextToken: String) {
  listFiles(userId: $userId, limit: $limit, nextToken: $nextToken) {
    items {
      id
      name
      size
      type
      url
      createdAt
      status
    }
    nextToken
  }
}
```

### Get File

```graphql
query GetFile($id: ID!) {
  getFile(id: $id) {
    id
    name
    size
    type
    url
    userId
    createdAt
    status
  }
}
```

### Delete File

```graphql
mutation DeleteFile($input: DeleteFileInput!) {
  deleteFile(input: $input) {
    success
    message
  }
}
```

## File Upload Process

1. **Request Upload**: Call `uploadFile` mutation with file metadata
2. **Get Presigned URL**: AppSync returns a presigned S3 URL
3. **Upload to S3**: Use the presigned URL to upload the file directly to S3
4. **Update Status**: File status is tracked in DynamoDB

## Security Features

- File type validation (images, documents, videos, audio)
- File size limits (50MB max)
- User-based access control
- Presigned URLs with expiration
- CORS configuration for web access

## Environment Variables

- `FILES_TABLE`: DynamoDB table name
- `UPLOADS_BUCKET`: S3 bucket name
- `APPSYNC_API_ID`: AppSync API ID

## File Types Supported

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Documents**: PDF, Word, Excel, Text, CSV
- **Videos**: MP4, WebM, OGG, QuickTime
- **Audio**: MPEG, WAV, OGG, WebM

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Cleanup

Remove all AWS resources:

```bash
npm run remove
```

## Outputs

After deployment, the following outputs are available:

- `GraphQLApiId`: AppSync API ID
- `GraphQLApiUrl`: AppSync API URL
- `FilesTableName`: DynamoDB table name
- `UploadsBucketName`: S3 bucket name

## Integration with Frontend

To integrate with the React file upload component:

1. Update the upload endpoint to use AppSync
2. Use the presigned URL for direct S3 uploads
3. Track upload progress and status
4. Handle file deletion through the API

## Monitoring

- CloudWatch logs for Lambda functions
- AppSync metrics in AWS Console
- DynamoDB metrics for performance monitoring
- S3 access logs for file operations 