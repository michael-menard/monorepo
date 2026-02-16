# @repo/s3-client

Shared S3 client utilities for AWS Lambda functions and backend services.

Supports both **AWS S3** (production) and **MinIO** (local development) with environment-aware configuration.

## Features

- Environment-aware S3 client (AWS S3 or MinIO)
- Connection reuse for Lambda optimization
- Bucket initialization helper
- Single upload for small files
- Multipart upload for large files (>5MB)
- Zod-validated configuration

## Installation

This is an internal workspace package. Import it in your application:

```typescript
import { uploadToS3, initializeBucket } from '@repo/s3-client'
```

## Configuration

The S3 client automatically detects the environment and configures itself accordingly.

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Node environment | `development` | No |
| `AWS_REGION` | AWS region for S3 | `us-east-1` | No |
| `S3_ENDPOINT` | Custom S3 endpoint (for MinIO) | - | No |
| `S3_ACCESS_KEY_ID` | Access key ID | - | MinIO only |
| `S3_SECRET_ACCESS_KEY` | Secret access key | - | MinIO only |

### Local Development (MinIO)

1. Start MinIO:

```bash
docker compose -f infra/compose.lego-app.yaml up -d minio
```

2. Set environment variables in `.env`:

```bash
NODE_ENV=development
AWS_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

3. Initialize bucket (optional, done automatically by Docker):

```typescript
import { initializeBucket } from '@repo/s3-client'

await initializeBucket('workflow-artifacts')
```

### Production (AWS S3)

1. Set environment variable:

```bash
AWS_REGION=us-east-1
```

2. Use IAM role for credentials (Lambda execution role):

```typescript
// No explicit credentials needed - uses Lambda execution role
import { uploadToS3 } from '@repo/s3-client'

const url = await uploadToS3({
  key: 'artifacts/example.txt',
  body: Buffer.from('content'),
  contentType: 'text/plain',
  bucket: 'my-production-bucket',
})
```

## API Reference

### `getS3Client(region?: string): S3Client`

Get or create S3 client instance. Client is reused across Lambda invocations for performance.

```typescript
import { getS3Client } from '@repo/s3-client'

const s3 = getS3Client()
// or
const s3 = getS3Client('us-west-2')
```

### `initializeBucket(bucketName: string): Promise<void>`

Create S3 bucket if it doesn't exist. Idempotent - succeeds if bucket already exists.

```typescript
import { initializeBucket } from '@repo/s3-client'

await initializeBucket('my-bucket')
```

### `uploadToS3(params): Promise<string>`

Upload file to S3. Returns the URL to access the file.

```typescript
import { uploadToS3 } from '@repo/s3-client'

const url = await uploadToS3({
  key: 'path/to/file.txt',
  body: Buffer.from('content'),
  contentType: 'text/plain',
  bucket: 'my-bucket',
  serverSideEncryption: 'AES256', // optional, defaults to AES256
})

console.log('Uploaded to:', url)
```

### `uploadToS3Multipart(params): Promise<string>`

Upload large file to S3 using multipart upload. Recommended for files >5MB.

```typescript
import { uploadToS3Multipart } from '@repo/s3-client'

const url = await uploadToS3Multipart({
  key: 'large-files/video.mp4',
  body: largeBuffer,
  contentType: 'video/mp4',
  bucket: 'my-bucket',
  partSize: 10 * 1024 * 1024, // optional, defaults to 5MB
})
```

### `deleteFromS3(params): Promise<void>`

Delete file from S3.

```typescript
import { deleteFromS3 } from '@repo/s3-client'

await deleteFromS3({
  key: 'path/to/file.txt',
  bucket: 'my-bucket',
})
```

### `loadS3Config(): S3ClientConfig`

Load and validate S3 configuration from environment variables.

```typescript
import { loadS3Config } from '@repo/s3-client'

const config = loadS3Config()
console.log('Using region:', config.region)
console.log('Using endpoint:', config.endpoint || 'AWS S3')
```

### `isLocalMode(): boolean`

Check if S3 client is in local mode (MinIO).

```typescript
import { isLocalMode } from '@repo/s3-client'

if (isLocalMode()) {
  console.log('Using local MinIO')
} else {
  console.log('Using AWS S3')
}
```

## Testing

### Smoke Test

Run the smoke test script to verify MinIO operations:

```bash
pnpm tsx packages/backend/s3-client/scripts/test-minio.ts
```

This will:
1. Initialize the `workflow-artifacts` bucket
2. Upload a test file
3. Download and verify the file
4. Delete the test file
5. Verify deletion

### Prerequisites

- MinIO running: `docker compose -f infra/compose.lego-app.yaml up -d minio`
- Environment variables set in `.env` (see `.env.example`)

## Architecture

### Environment Detection

The client automatically detects the environment:

- **Local**: `NODE_ENV=development` + `S3_ENDPOINT` set → MinIO mode
  - Uses `forcePathStyle: true` (required for MinIO)
  - Uses explicit credentials from environment variables
  - Returns path-style URLs: `http://localhost:9000/bucket/key`

- **Production**: No `S3_ENDPOINT` → AWS S3 mode
  - Uses virtual-hosted style URLs (AWS default)
  - Uses IAM role credentials (Lambda execution role)
  - Returns virtual-hosted URLs: `https://bucket.s3.amazonaws.com/key`

### Connection Reuse

The S3 client uses a singleton pattern to reuse the connection across Lambda invocations:

```typescript
let _s3Client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client(config)
  }
  return _s3Client
}
```

This improves Lambda performance by avoiding connection overhead on subsequent invocations.

## Security

### Local Development

- Default credentials: `minioadmin` / `minioadmin`
- **NEVER** use these credentials in production
- Credentials are stored in `.env` (gitignored)

### Production

- No credentials in code or environment variables
- Uses IAM role attached to Lambda function
- S3 bucket policies control access
- Server-side encryption enabled by default (AES256)

## Troubleshooting

### "Connection refused" error

- Ensure MinIO is running: `docker ps | grep minio`
- Check MinIO logs: `docker logs monorepo-minio`
- Verify endpoint in `.env`: `S3_ENDPOINT=http://localhost:9000`

### "Access Denied" error

- Verify credentials in `.env` match MinIO root credentials
- For production, check Lambda execution role has S3 permissions

### "Bucket not found" error

- Run bucket initialization: `await initializeBucket('bucket-name')`
- Check bucket exists: `docker exec monorepo-minio mc ls local/`

### URL mismatch between local and production

- This is expected - local uses `http://localhost:9000/bucket/key`
- Production uses `https://bucket.s3.amazonaws.com/key`
- Client automatically generates correct URLs based on environment

## Related Documentation

- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Root README - MinIO Setup](/README.md#local-object-storage-minio)
