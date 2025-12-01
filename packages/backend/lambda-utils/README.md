# @monorepo/lambda-utils

Lambda utility functions for multipart parsing and CloudWatch metrics.

## Features

- **Multipart Form Data Parser**: Parse multipart/form-data requests in AWS Lambda using Busboy
- **CloudWatch Metrics**: Publish custom metrics to CloudWatch for monitoring and observability

## Installation

```bash
npm install @monorepo/lambda-utils
```

## Usage

### Multipart Parser

Parse multipart form data from API Gateway events:

```typescript
import { parseMultipartForm, getFile, getField } from '@monorepo/lambda-utils'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse multipart form data
    const formData = await parseMultipartForm(event)

    // Get uploaded file
    const file = getFile(formData)
    if (!file) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file uploaded' }),
      }
    }

    // Get form fields
    const title = getField(formData, 'title')
    const description = getField(formData, 'description')

    console.log('File:', file.filename, file.mimetype, file.buffer.length, 'bytes')
    console.log('Fields:', { title, description })

    // Process the file...

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Upload successful' }),
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upload failed' }),
    }
  }
}
```

### CloudWatch Metrics

Publish custom metrics to CloudWatch:

```typescript
import { CloudWatchMetrics, MetricName } from '@monorepo/lambda-utils'
import { StandardUnit } from '@aws-sdk/client-cloudwatch'

// Create metrics client
const metrics = new CloudWatchMetrics({
  region: 'us-east-1',
  namespace: 'MyApp/Uploads',
  environment: process.env.NODE_ENV || 'development',
  logger: console, // Optional logger
})

// Record upload success
await metrics.recordUploadSuccess('gallery')

// Record upload failure
await metrics.recordUploadFailure('gallery', 'validation')

// Record processing time
await metrics.recordProcessingTime(1250, 'gallery')

// Record file size
await metrics.recordFileSize(1024 * 500, 'gallery') // 500KB

// Record image dimensions
await metrics.recordImageDimensions(1920, 1080, 'gallery')

// Measure and record processing time automatically
const result = await metrics.measureProcessingTime(async () => {
  // Your async operation here
  return await processImage()
}, 'gallery')

// Publish custom metric
await metrics.publishMetric(
  MetricName.UploadSuccess,
  1,
  StandardUnit.Count,
  'wishlist'
)
```

## API Reference

### Multipart Parser

#### `parseMultipartForm(event: APIGatewayProxyEventV2): Promise<ParsedFormData>`

Parse multipart form data from API Gateway event.

**Parameters:**
- `event`: API Gateway HTTP API event

**Returns:**
- `ParsedFormData`: Object containing `fields` and `files`

**Limits:**
- Max file size: 10MB
- Max files: 1 per request
- Max fields: 20

#### `getFile(formData: ParsedFormData): ParsedFile | undefined`

Get the first uploaded file from parsed form data.

#### `getField(formData: ParsedFormData, fieldName: string): string | undefined`

Get a form field value by name.

#### Types

```typescript
interface ParsedFile {
  fieldname: string
  filename: string
  encoding: string
  mimetype: string
  buffer: Buffer
}

interface ParsedFormData {
  fields: Record<string, string>
  files: ParsedFile[]
}
```

### CloudWatch Metrics

#### `new CloudWatchMetrics(config: CloudWatchMetricsConfig)`

Create a new CloudWatch metrics client.

**Configuration:**
```typescript
interface CloudWatchMetricsConfig {
  region: string          // AWS region
  namespace: string       // CloudWatch namespace
  environment?: string    // Environment name (default: 'development')
  logger?: Logger        // Optional logger for error logging
}
```

#### Methods

- `publishMetric(metricName, value, unit?, uploadType?)`: Publish a custom metric
- `recordUploadSuccess(uploadType)`: Record successful upload
- `recordUploadFailure(uploadType, errorType)`: Record failed upload
- `recordProcessingTime(durationMs, uploadType)`: Record processing duration
- `recordFileSize(sizeBytes, uploadType)`: Record file size
- `recordImageDimensions(width, height, uploadType)`: Record image dimensions
- `measureProcessingTime(operation, uploadType)`: Measure and record operation duration

#### Metric Names

```typescript
enum MetricName {
  UploadSuccess = 'UploadSuccess',
  UploadFailure = 'UploadFailure',
  ProcessingTime = 'ProcessingTime',
  FileSize = 'FileSize',
  ImageWidth = 'ImageWidth',
  ImageHeight = 'ImageHeight',
  ValidationError = 'ValidationError',
  S3Error = 'S3Error',
  DatabaseError = 'DatabaseError',
}
```

#### Upload Types

```typescript
type ImageUploadType = 'gallery' | 'wishlist' | 'moc'
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run type-check

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## License

MIT
