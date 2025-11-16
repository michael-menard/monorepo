# Image Service Migration - Infrastructure

**Document:** 04-infrastructure.md
**Version:** 1.0

---

## Infrastructure Overview

**Tool:** SST v3 (Ion)
**Cloud Provider:** AWS
**Region:** us-east-1 (N. Virginia)
**Environments:** Development, Staging, Production

---

## SST Configuration

### Project Structure

```
apps/api/image-service/
├── sst.config.ts                 # Main SST configuration
├── src/
│   ├── functions/                # Lambda handlers
│   │   ├── upload.ts
│   │   ├── get.ts
│   │   ├── list.ts
│   │   ├── update.ts
│   │   └── delete.ts
│   ├── lib/
│   │   ├── db/                   # DynamoDB client
│   │   │   ├── client.ts
│   │   │   └── operations.ts
│   │   ├── storage/              # S3 client
│   │   │   ├── s3-client.ts
│   │   │   └── upload.ts
│   │   ├── cache/                # Redis client
│   │   │   └── redis-client.ts
│   │   ├── utils/
│   │   │   ├── logger.ts         # Pino logger
│   │   │   ├── validation.ts     # Zod schemas
│   │   │   └── errors.ts         # Custom error types
│   │   └── types/
│   │       └── image.ts          # TypeScript types
│   └── middleware/
│       ├── auth.ts               # JWT validation
│       └── error-handler.ts      # Global error handling
├── tests/
│   ├── unit/
│   └── integration/
└── package.json
```

---

### `sst.config.ts`

```typescript
import { SSTConfig } from 'sst'
import { ImageServiceStack } from './stacks/ImageServiceStack'

export default $config({
  app(input) {
    return {
      name: 'image-service',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
    }
  },
  async run() {
    await import('./stacks/ImageServiceStack')
  },
})
```

---

### ImageServiceStack

```typescript
import { Bucket, Function, Table, ApiGatewayV2, StackContext } from 'sst/constructs'
import { RemovalPolicy, Duration } from 'aws-cdk-lib'
import { Distribution, ViewerProtocolPolicy, CachePolicy } from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'

export function ImageServiceStack({ stack }: StackContext) {
  const stage = stack.stage

  // ===========================
  // DynamoDB Table
  // ===========================
  const imageMetadataTable = new Table(stack, 'ImageMetadata', {
    fields: {
      PK: 'string', // IMAGE#<imageId>
      SK: 'string', // METADATA
      GSI1PK: 'string', // USER#<userId>
      GSI1SK: 'string', // UPLOADED#<timestamp>
      GSI2PK: 'string', // ALBUM#<albumId>
      GSI2SK: 'string', // UPLOADED#<timestamp>
    },
    primaryIndex: { partitionKey: 'PK', sortKey: 'SK' },
    globalIndexes: {
      UserIndex: {
        partitionKey: 'GSI1PK',
        sortKey: 'GSI1SK',
        projection: 'all',
      },
      AlbumIndex: {
        partitionKey: 'GSI2PK',
        sortKey: 'GSI2SK',
        projection: 'all',
      },
    },
    timeToLiveAttribute: 'ttl',
    stream: 'new-and-old-images', // For future analytics
    cdk: {
      table: {
        billingMode: BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: stage === 'production',
        removalPolicy: stage === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
        encryption: TableEncryption.AWS_MANAGED,
      },
    },
  })

  // ===========================
  // S3 Bucket
  // ===========================
  const imageBucket = new Bucket(stack, 'ImageBucket', {
    cors: [
      {
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        allowedOrigins: ['https://lego-moc.com', 'https://*.lego-moc.com'],
        allowedHeaders: ['*'],
      },
    ],
    cdk: {
      bucket: {
        bucketName: `images-lego-moc-${stage}`,
        encryption: BucketEncryption.S3_MANAGED,
        lifecycleRules: [
          {
            id: 'DeleteIncompleteUploads',
            abortIncompleteMultipartUploadAfter: Duration.days(1),
            enabled: true,
          },
          {
            id: 'TransitionToIA',
            transitions: [
              {
                storageClass: StorageClass.INTELLIGENT_TIERING,
                transitionAfter: Duration.days(0), // Immediate
              },
            ],
            enabled: true,
          },
        ],
        removalPolicy: stage === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      },
    },
  })

  // ===========================
  // CloudFront Distribution
  // ===========================
  const distribution = new Distribution(stack, 'ImageCDN', {
    defaultBehavior: {
      origin: new S3Origin(imageBucket.cdk.bucket, {
        originAccessIdentity: new OriginAccessIdentity(stack, 'OAI'),
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new CachePolicy(stack, 'ImageCachePolicy', {
        defaultTtl: Duration.hours(24),
        maxTtl: Duration.days(365),
        minTtl: Duration.seconds(0),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      }),
    },
    priceClass: PriceClass.PRICE_CLASS_100, // US, Canada, Europe
    enabled: true,
    httpVersion: HttpVersion.HTTP2,
  })

  // ===========================
  // ElastiCache Redis (Optional)
  // ===========================
  const redis =
    stage !== 'dev'
      ? new CfnCacheCluster(stack, 'ImageCache', {
          cacheNodeType: 'cache.t4g.micro',
          engine: 'redis',
          numCacheNodes: 1,
          engineVersion: '7.0',
          port: 6379,
          azMode: stage === 'production' ? 'cross-az' : 'single-az',
          preferredMaintenanceWindow: 'sun:05:00-sun:07:00',
        })
      : null

  // ===========================
  // Lambda Functions
  // ===========================
  const uploadLambda = new Function(stack, 'UploadFunction', {
    handler: 'src/functions/upload.handler',
    runtime: 'nodejs20.x',
    timeout: '30 seconds',
    memorySize: '1024 MB',
    environment: {
      DYNAMODB_TABLE_NAME: imageMetadataTable.tableName,
      S3_BUCKET_NAME: imageBucket.bucketName,
      CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
      REDIS_ENDPOINT: redis?.attrRedisEndpointAddress || '',
      STAGE: stage,
    },
    permissions: [imageMetadataTable, imageBucket],
  })

  const getLambda = new Function(stack, 'GetFunction', {
    handler: 'src/functions/get.handler',
    runtime: 'nodejs20.x',
    timeout: '10 seconds',
    memorySize: '512 MB',
    environment: {
      DYNAMODB_TABLE_NAME: imageMetadataTable.tableName,
      CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
      REDIS_ENDPOINT: redis?.attrRedisEndpointAddress || '',
      STAGE: stage,
    },
    permissions: [imageMetadataTable],
  })

  const listLambda = new Function(stack, 'ListFunction', {
    handler: 'src/functions/list.handler',
    runtime: 'nodejs20.x',
    timeout: '10 seconds',
    memorySize: '512 MB',
    environment: {
      DYNAMODB_TABLE_NAME: imageMetadataTable.tableName,
      CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
      REDIS_ENDPOINT: redis?.attrRedisEndpointAddress || '',
      STAGE: stage,
    },
    permissions: [imageMetadataTable],
  })

  const updateLambda = new Function(stack, 'UpdateFunction', {
    handler: 'src/functions/update.handler',
    runtime: 'nodejs20.x',
    timeout: '10 seconds',
    memorySize: '512 MB',
    environment: {
      DYNAMODB_TABLE_NAME: imageMetadataTable.tableName,
      REDIS_ENDPOINT: redis?.attrRedisEndpointAddress || '',
      STAGE: stage,
    },
    permissions: [imageMetadataTable],
  })

  const deleteLambda = new Function(stack, 'DeleteFunction', {
    handler: 'src/functions/delete.handler',
    runtime: 'nodejs20.x',
    timeout: '15 seconds',
    memorySize: '512 MB',
    environment: {
      DYNAMODB_TABLE_NAME: imageMetadataTable.tableName,
      S3_BUCKET_NAME: imageBucket.bucketName,
      CLOUDFRONT_DISTRIBUTION_ID: distribution.distributionId,
      REDIS_ENDPOINT: redis?.attrRedisEndpointAddress || '',
      STAGE: stage,
    },
    permissions: [imageMetadataTable, imageBucket, 'cloudfront:CreateInvalidation'],
  })

  // ===========================
  // API Gateway HTTP API
  // ===========================
  const api = new ApiGatewayV2(stack, 'ImageApi', {
    cors: {
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowOrigins: ['https://lego-moc.com', 'https://*.lego-moc.com'],
      allowHeaders: ['Authorization', 'Content-Type'],
    },
    authorizers: {
      jwt: {
        type: 'jwt',
        jwt: {
          issuer: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
          audience: [process.env.COGNITO_CLIENT_ID!],
        },
      },
    },
    routes: {
      'POST /images': {
        function: uploadLambda,
        authorizer: 'jwt',
      },
      'GET /images/{id}': {
        function: getLambda,
        authorizer: 'jwt',
      },
      'GET /images': {
        function: listLambda,
        authorizer: 'jwt',
      },
      'PATCH /images/{id}': {
        function: updateLambda,
        authorizer: 'jwt',
      },
      'DELETE /images/{id}': {
        function: deleteLambda,
        authorizer: 'jwt',
      },
    },
    customDomain:
      stage === 'production'
        ? {
            domainName: 'images.lego-api.com',
            hostedZone: 'lego-api.com',
          }
        : undefined,
  })

  // ===========================
  // Outputs
  // ===========================
  stack.addOutputs({
    ApiEndpoint: api.url,
    ImageBucket: imageBucket.bucketName,
    CloudFrontDomain: distribution.distributionDomainName,
    DynamoDBTable: imageMetadataTable.tableName,
  })

  return {
    api,
    imageBucket,
    imageMetadataTable,
    distribution,
  }
}
```

---

## AWS Services Configuration

### API Gateway

**Type:** HTTP API (cheaper, simpler than REST API)
**Features:**

- JWT authorizer (Cognito)
- CORS enabled
- Request throttling: 1000 req/sec per user
- Custom domain: `images.lego-api.com`

**Throttling Settings:**

```typescript
{
  defaultRouteSettings: {
    throttlingBurstLimit: 5000,
    throttlingRateLimit: 1000,
  }
}
```

---

### Lambda Configuration

#### Upload Lambda

```typescript
{
  runtime: 'nodejs20.x',
  timeout: '30 seconds',
  memorySize: '1024 MB',
  environment: {
    DYNAMODB_TABLE_NAME: 'ImageMetadata',
    S3_BUCKET_NAME: 'images-lego-moc-prod',
    CLOUDFRONT_DOMAIN: 'd123xyz.cloudfront.net',
    MAX_FILE_SIZE: '10485760',  // 10 MB
    SUPPORTED_FORMATS: 'image/jpeg,image/png,image/webp',
  },
  reservedConcurrentExecutions: 100,  // Prevent runaway costs
}
```

**Dependencies:**

- `sharp` - Image processing
- `aws-sdk` - S3/DynamoDB clients
- `pino` - Structured logging
- `ulid` - ID generation
- `file-type` - Magic number validation

---

#### Get Lambda

```typescript
{
  runtime: 'nodejs20.x',
  timeout: '10 seconds',
  memorySize: '512 MB',
  environment: {
    DYNAMODB_TABLE_NAME: 'ImageMetadata',
    CLOUDFRONT_DOMAIN: 'd123xyz.cloudfront.net',
    REDIS_ENDPOINT: 'image-cache.abc123.0001.use1.cache.amazonaws.com',
  },
  reservedConcurrentExecutions: 500,
}
```

---

#### List Lambda

```typescript
{
  runtime: 'nodejs20.x',
  timeout: '10 seconds',
  memorySize: '512 MB',
  environment: {
    DYNAMODB_TABLE_NAME: 'ImageMetadata',
    MAX_PAGE_SIZE: '100',
  },
  reservedConcurrentExecutions: 200,
}
```

---

#### Delete Lambda

```typescript
{
  runtime: 'nodejs20.x',
  timeout: '15 seconds',
  memorySize: '512 MB',
  environment: {
    DYNAMODB_TABLE_NAME: 'ImageMetadata',
    S3_BUCKET_NAME: 'images-lego-moc-prod',
    CLOUDFRONT_DISTRIBUTION_ID: 'E1234567890ABC',
  },
  permissions: [
    'dynamodb:DeleteItem',
    's3:DeleteObject',
    'cloudfront:CreateInvalidation',
  ],
}
```

---

### DynamoDB Configuration

**Table:** `ImageMetadata-${stage}`
**Capacity:** On-Demand (auto-scaling)
**Features:**

- Point-in-Time Recovery (PITR) - Production only
- DynamoDB Streams - For analytics
- TTL - For temp images
- AWS managed encryption (SSE)

**GSI Configuration:**

```typescript
{
  UserIndex: {
    partitionKey: 'GSI1PK',   // USER#<userId>
    sortKey: 'GSI1SK',        // UPLOADED#<timestamp>
    projectionType: 'ALL',
  },
  AlbumIndex: {
    partitionKey: 'GSI2PK',   // ALBUM#<albumId>
    sortKey: 'GSI2SK',        // UPLOADED#<timestamp>
    projectionType: 'ALL',
  }
}
```

**Estimated Costs (on-demand):**

- Reads: $0.25 per 1M reads
- Writes: $1.25 per 1M writes
- Storage: $0.25/GB/month

---

### S3 Bucket Configuration

**Bucket:** `images-lego-moc-${stage}`
**Storage Class:** Intelligent-Tiering (automatic)
**Features:**

- Transfer Acceleration (global uploads)
- Lifecycle policies
- CloudFront OAI (Origin Access Identity)
- Encryption at rest (AES256)

**Lifecycle Rules:**

```typescript
{
  rules: [
    {
      id: 'DeleteIncompleteUploads',
      abortIncompleteMultipartUploadAfter: Duration.days(1),
      enabled: true,
    },
    {
      id: 'IntelligentTiering',
      transitions: [
        {
          storageClass: StorageClass.INTELLIGENT_TIERING,
          transitionAfter: Duration.days(0), // Immediate
        },
      ],
      enabled: true,
    },
  ]
}
```

**Estimated Costs:**

- Storage: $0.023/GB/month (Frequent Access)
- Storage: $0.0125/GB/month (Infrequent Access)
- PUT requests: $0.005 per 1000
- GET requests: $0.0004 per 1000 (billed to CloudFront)

---

### CloudFront Configuration

**Distribution:** `d123xyz.cloudfront.net`
**Price Class:** PriceClass_100 (US, Canada, Europe)
**Features:**

- HTTPS only (TLS 1.2+)
- Brotli + Gzip compression
- Origin Access Identity (OAI)
- Custom domain: `images.lego-api.com`

**Cache Behavior:**

```typescript
{
  defaultTtl: Duration.hours(24),
  maxTtl: Duration.days(365),
  minTtl: Duration.seconds(0),
  enableAcceptEncodingBrotli: true,
  enableAcceptEncodingGzip: true,
  viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
}
```

**Estimated Costs:**

- Data transfer: $0.085/GB (first 10 TB)
- Requests: $0.0075 per 10,000 HTTPS requests

---

### ElastiCache Redis Configuration

**Node Type:** `cache.t4g.micro` (0.5 GB memory)
**Engine:** Redis 7.x
**Multi-AZ:** Production only

**Configuration:**

```typescript
{
  cacheNodeType: 'cache.t4g.micro',
  engine: 'redis',
  numCacheNodes: 1,
  engineVersion: '7.0',
  port: 6379,
  azMode: stage === 'production' ? 'cross-az' : 'single-az',
  preferredMaintenanceWindow: 'sun:05:00-sun:07:00',
  snapshotRetentionLimit: stage === 'production' ? 7 : 0,
}
```

**Estimated Cost:**

- Single-AZ: $11/month
- Multi-AZ: $22/month (Production)

---

## Deployment Pipeline

### CI/CD with GitHub Actions

**Workflow:** `.github/workflows/image-service.yml`

```yaml
name: Image Service Deployment

on:
  push:
    branches: [dev, staging, main]
    paths:
      - 'apps/api/image-service/**'
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm --filter image-service test

      - name: Type check
        run: pnpm --filter image-service check-types

  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to dev
        run: pnpm --filter image-service sst deploy --stage dev

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: pnpm --filter image-service sst deploy --stage staging

  deploy-production:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: pnpm --filter image-service sst deploy --stage production
```

---

## Monitoring & Observability

### CloudWatch Metrics

**Lambda Metrics:**

- Invocations
- Duration (P50, P95, P99)
- Errors
- Throttles
- Concurrent executions

**DynamoDB Metrics:**

- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors (ValidationException, ConditionalCheckFailedException)
- SystemErrors (InternalServerError)

**S3 Metrics:**

- TotalRequestLatency
- 4xxErrors
- 5xxErrors
- BytesUploaded

**CloudFront Metrics:**

- Requests
- BytesDownloaded
- 4xxErrorRate
- 5xxErrorRate
- CacheHitRate

---

### CloudWatch Alarms

```typescript
// Lambda error rate alarm
new Alarm(stack, 'UploadErrorAlarm', {
  metric: uploadLambda.metricErrors({
    period: Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 10,
  evaluationPeriods: 2,
  alarmDescription: 'Upload Lambda errors exceeded threshold',
  actionsEnabled: true,
})

// DynamoDB throttling alarm
new Alarm(stack, 'DynamoDBThrottleAlarm', {
  metric: imageMetadataTable.metricUserErrors({
    period: Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'DynamoDB throttling detected',
})

// CloudFront 5xx error alarm
new Alarm(stack, 'CloudFront5xxAlarm', {
  metric: distribution.metric5xxErrorRate({
    period: Duration.minutes(5),
  }),
  threshold: 1, // 1% error rate
  evaluationPeriods: 2,
})
```

---

### CloudWatch Logs

**Log Groups:**

- `/aws/lambda/image-service-upload-${stage}`
- `/aws/lambda/image-service-get-${stage}`
- `/aws/lambda/image-service-list-${stage}`
- `/aws/lambda/image-service-update-${stage}`
- `/aws/lambda/image-service-delete-${stage}`

**Retention:** 7 days (dev), 30 days (staging), 90 days (production)

---

## Security Configuration

### IAM Roles

**Lambda Execution Role:**

```typescript
{
  policies: [
    {
      Effect: 'Allow',
      Action: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
      ],
      Resource: [
        `arn:aws:dynamodb:us-east-1:*:table/ImageMetadata-${stage}`,
        `arn:aws:dynamodb:us-east-1:*:table/ImageMetadata-${stage}/index/*`,
      ],
    },
    {
      Effect: 'Allow',
      Action: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
      ],
      Resource: `arn:aws:s3:::images-lego-moc-${stage}/*`,
    },
    {
      Effect: 'Allow',
      Action: 'cloudfront:CreateInvalidation',
      Resource: `arn:aws:cloudfront::*:distribution/${distribution.distributionId}`,
    },
  ],
}
```

---

### S3 Bucket Policy

```typescript
{
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'AllowCloudFrontOAI',
      Effect: 'Allow',
      Principal: {
        AWS: `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${oai.originAccessIdentityId}`,
      },
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::images-lego-moc-${stage}/*`,
    },
  ],
}
```

---

## Cost Estimation

**Monthly costs (production):**

| Service           | Cost           | Details                     |
| ----------------- | -------------- | --------------------------- |
| **DynamoDB**      | $15            | 1M reads, 100K writes       |
| **S3**            | $12            | 500 GB storage, 1M PUTs     |
| **CloudFront**    | $45            | 2 TB transfer, 10M requests |
| **Lambda**        | $8             | 1M invocations, 512 MB avg  |
| **API Gateway**   | $3             | 1M requests                 |
| **ElastiCache**   | $22            | Multi-AZ Redis              |
| **CloudWatch**    | $5             | Logs + metrics              |
| **Data Transfer** | $6             | S3 → Lambda → API Gateway   |
| **Total**         | **$116/month** |                             |

---

## Next Steps

1. Review [05-migration-strategy.md](05-migration-strategy.md) - Phased migration plan
2. Review [09-monitoring.md](09-monitoring.md) - Observability setup
3. Review [10-implementation-phases.md](10-implementation-phases.md) - Detailed tasks

---

[← Back to API Specification](03-api-specification.md) | [Next: Migration Strategy →](05-migration-strategy.md)
