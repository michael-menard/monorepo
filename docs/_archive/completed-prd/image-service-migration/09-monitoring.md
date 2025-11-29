# Image Service Migration - Monitoring & Observability

**Document:** 09-monitoring.md
**Version:** 1.0

---

## Monitoring Overview

The Image Service implements comprehensive observability with:

1. **CloudWatch Metrics** - Performance and health metrics
2. **CloudWatch Logs** - Structured logging with Pino
3. **CloudWatch Alarms** - Proactive alerting
4. **X-Ray Tracing** - Distributed request tracing
5. **CloudWatch Dashboards** - Centralized visualization

---

## Key Metrics

### Lambda Metrics

**Invocations:**

```typescript
{
  namespace: 'AWS/Lambda',
  metricName: 'Invocations',
  dimensions: {
    FunctionName: 'image-service-upload-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**Duration (Latency):**

```typescript
{
  namespace: 'AWS/Lambda',
  metricName: 'Duration',
  dimensions: {
    FunctionName: 'image-service-upload-prod',
  },
  statistics: ['p50', 'p95', 'p99', 'Average'],
  period: Duration.minutes(5),
}
```

**Errors:**

```typescript
{
  namespace: 'AWS/Lambda',
  metricName: 'Errors',
  dimensions: {
    FunctionName: 'image-service-upload-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**Throttles:**

```typescript
{
  namespace: 'AWS/Lambda',
  metricName: 'Throttles',
  dimensions: {
    FunctionName: 'image-service-upload-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**Concurrent Executions:**

```typescript
{
  namespace: 'AWS/Lambda',
  metricName: 'ConcurrentExecutions',
  dimensions: {
    FunctionName: 'image-service-upload-prod',
  },
  statistics: ['Maximum'],
  period: Duration.minutes(1),
}
```

---

### DynamoDB Metrics

**Consumed Read Capacity:**

```typescript
{
  namespace: 'AWS/DynamoDB',
  metricName: 'ConsumedReadCapacityUnits',
  dimensions: {
    TableName: 'ImageMetadata-prod',
  },
  statistics: ['Sum', 'Average'],
  period: Duration.minutes(5),
}
```

**Consumed Write Capacity:**

```typescript
{
  namespace: 'AWS/DynamoDB',
  metricName: 'ConsumedWriteCapacityUnits',
  dimensions: {
    TableName: 'ImageMetadata-prod',
  },
  statistics: ['Sum', 'Average'],
  period: Duration.minutes(5),
}
```

**User Errors (Validation, Conditional Checks):**

```typescript
{
  namespace: 'AWS/DynamoDB',
  metricName: 'UserErrors',
  dimensions: {
    TableName: 'ImageMetadata-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**System Errors (Throttling, Unavailability):**

```typescript
{
  namespace: 'AWS/DynamoDB',
  metricName: 'SystemErrors',
  dimensions: {
    TableName: 'ImageMetadata-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

---

### S3 Metrics

**Total Request Latency:**

```typescript
{
  namespace: 'AWS/S3',
  metricName: 'TotalRequestLatency',
  dimensions: {
    BucketName: 'images-lego-moc-prod',
  },
  statistics: ['Average', 'p95'],
  period: Duration.minutes(5),
}
```

**4xx Errors:**

```typescript
{
  namespace: 'AWS/S3',
  metricName: '4xxErrors',
  dimensions: {
    BucketName: 'images-lego-moc-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**5xx Errors:**

```typescript
{
  namespace: 'AWS/S3',
  metricName: '5xxErrors',
  dimensions: {
    BucketName: 'images-lego-moc-prod',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

---

### CloudFront Metrics

**Requests:**

```typescript
{
  namespace: 'AWS/CloudFront',
  metricName: 'Requests',
  dimensions: {
    DistributionId: 'E1234567890ABC',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**Bytes Downloaded:**

```typescript
{
  namespace: 'AWS/CloudFront',
  metricName: 'BytesDownloaded',
  dimensions: {
    DistributionId: 'E1234567890ABC',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**Cache Hit Rate:**

```typescript
{
  namespace: 'AWS/CloudFront',
  metricName: 'CacheHitRate',
  dimensions: {
    DistributionId: 'E1234567890ABC',
  },
  statistics: ['Average'],
  period: Duration.minutes(5),
}
```

**4xx Error Rate:**

```typescript
{
  namespace: 'AWS/CloudFront',
  metricName: '4xxErrorRate',
  dimensions: {
    DistributionId: 'E1234567890ABC',
  },
  statistics: ['Average'],
  period: Duration.minutes(5),
}
```

**5xx Error Rate:**

```typescript
{
  namespace: 'AWS/CloudFront',
  metricName: '5xxErrorRate',
  dimensions: {
    DistributionId: 'E1234567890ABC',
  },
  statistics: ['Average'],
  period: Duration.minutes(5),
}
```

---

### API Gateway Metrics

**Count (Total Requests):**

```typescript
{
  namespace: 'AWS/ApiGateway',
  metricName: 'Count',
  dimensions: {
    ApiId: 'abc123def456',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**Latency:**

```typescript
{
  namespace: 'AWS/ApiGateway',
  metricName: 'Latency',
  dimensions: {
    ApiId: 'abc123def456',
  },
  statistics: ['p50', 'p95', 'p99'],
  period: Duration.minutes(5),
}
```

**4xx Errors:**

```typescript
{
  namespace: 'AWS/ApiGateway',
  metricName: '4XXError',
  dimensions: {
    ApiId: 'abc123def456',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

**5xx Errors:**

```typescript
{
  namespace: 'AWS/ApiGateway',
  metricName: '5XXError',
  dimensions: {
    ApiId: 'abc123def456',
  },
  statistics: ['Sum'],
  period: Duration.minutes(5),
}
```

---

## Custom Metrics

### Application-Level Metrics

```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'

const cloudwatch = new CloudWatchClient({})

async function publishMetric(
  metricName: string,
  value: number,
  unit: string = 'Count',
  dimensions: Record<string, string> = {},
) {
  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: 'ImageService',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
            Name,
            Value,
          })),
        },
      ],
    }),
  )
}

// Usage in Lambda
await publishMetric('ImageUploadSuccess', 1, 'Count', {
  Stage: process.env.STAGE,
  Operation: 'upload',
})

await publishMetric('ImageProcessingDuration', 847, 'Milliseconds', {
  Stage: process.env.STAGE,
  Operation: 'sharp-processing',
})
```

---

### Custom Metrics List

| Metric                    | Description                      | Unit         | Dimensions          |
| ------------------------- | -------------------------------- | ------------ | ------------------- |
| `ImageUploadSuccess`      | Successful image uploads         | Count        | Stage, UserId       |
| `ImageUploadFailure`      | Failed image uploads             | Count        | Stage, ErrorType    |
| `ImageProcessingDuration` | Time to process image with Sharp | Milliseconds | Stage, ImageSize    |
| `S3UploadDuration`        | Time to upload to S3             | Milliseconds | Stage, FileSize     |
| `DynamoDBWriteDuration`   | Time to write metadata           | Milliseconds | Stage               |
| `CacheHitCount`           | Redis cache hits                 | Count        | Stage, CacheKey     |
| `CacheMissCount`          | Redis cache misses               | Count        | Stage, CacheKey     |
| `ColdStartCount`          | Lambda cold starts               | Count        | Stage, FunctionName |
| `OrphanedFileCount`       | S3 files without DynamoDB entry  | Count        | Stage               |
| `DuplicateUploadCount`    | Idempotency token reuse          | Count        | Stage               |

---

## CloudWatch Logs

### Structured Logging with Pino

```typescript
// src/lib/utils/logger.ts
import pino from 'pino'

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: label => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'password', 'token'],
      remove: true,
    },
  })
}
```

---

### Log Groups

**Lambda Functions:**

- `/aws/lambda/image-service-upload-prod`
- `/aws/lambda/image-service-get-prod`
- `/aws/lambda/image-service-list-prod`
- `/aws/lambda/image-service-update-prod`
- `/aws/lambda/image-service-delete-prod`

**Retention:**

- Dev: 7 days
- Staging: 14 days
- Production: 90 days

---

### Structured Log Format

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "name": "upload-handler",
  "requestId": "abc-123-def-456",
  "userId": "user-789",
  "imageId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "operation": "uploadImage",
  "s3Key": "images/user-789/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "fileSize": 524288,
  "processingDuration": 847,
  "msg": "Image uploaded successfully"
}
```

---

### Log Queries with CloudWatch Insights

**Query 1: Top 10 slowest uploads**

```
fields @timestamp, userId, imageId, processingDuration
| filter operation = "uploadImage"
| sort processingDuration desc
| limit 10
```

**Query 2: Error rate by error type**

```
fields @timestamp, errorType
| filter level = "error"
| stats count() by errorType
| sort count desc
```

**Query 3: Average upload duration by hour**

```
fields @timestamp, processingDuration
| filter operation = "uploadImage"
| stats avg(processingDuration) as avgDuration by bin(5m)
| sort @timestamp desc
```

**Query 4: Cold start frequency**

```
fields @timestamp, @message
| filter @message like /Cold start detected/
| stats count() as coldStarts by bin(1h)
```

---

## CloudWatch Alarms

### Upload Lambda Alarms

**Error Rate Alarm:**

```typescript
new Alarm(stack, 'UploadErrorRateAlarm', {
  metric: uploadLambda.metricErrors({
    period: Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 10, // More than 10 errors in 5 minutes
  evaluationPeriods: 2,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Upload Lambda error rate exceeded threshold',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

**Latency Alarm (P95):**

```typescript
new Alarm(stack, 'UploadLatencyAlarm', {
  metric: uploadLambda.metricDuration({
    period: Duration.minutes(5),
    statistic: 'p95',
  }),
  threshold: 3000, // P95 > 3 seconds
  evaluationPeriods: 2,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmDescription: 'Upload Lambda P95 latency exceeded 3 seconds',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

**Throttle Alarm:**

```typescript
new Alarm(stack, 'UploadThrottleAlarm', {
  metric: uploadLambda.metricThrottles({
    period: Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'Upload Lambda throttling detected',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

---

### DynamoDB Alarms

**System Errors Alarm:**

```typescript
new Alarm(stack, 'DynamoDBSystemErrorsAlarm', {
  metric: imageMetadataTable.metricSystemErrors({
    period: Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'DynamoDB system errors detected',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

**User Errors Alarm (Throttling):**

```typescript
new Alarm(stack, 'DynamoDBUserErrorsAlarm', {
  metric: imageMetadataTable.metricUserErrors({
    period: Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 2,
  alarmDescription: 'DynamoDB throttling or user errors detected',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

---

### CloudFront Alarms

**5xx Error Rate Alarm:**

```typescript
new Alarm(stack, 'CloudFront5xxAlarm', {
  metric: distribution.metric5xxErrorRate({
    period: Duration.minutes(5),
  }),
  threshold: 1, // 1% error rate
  evaluationPeriods: 2,
  alarmDescription: 'CloudFront 5xx error rate exceeded 1%',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

**Cache Hit Rate Alarm:**

```typescript
new Alarm(stack, 'CloudFrontCacheHitRateAlarm', {
  metric: distribution.metricCacheHitRate({
    period: Duration.minutes(15),
  }),
  threshold: 80, // Alert if cache hit rate <80%
  evaluationPeriods: 2,
  comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
  alarmDescription: 'CloudFront cache hit rate below 80%',
  actionsEnabled: true,
  alarmActions: [snsAlarmTopic],
})
```

---

### SNS Alarm Topic

```typescript
import { Topic } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'

const snsAlarmTopic = new Topic(stack, 'ImageServiceAlarms', {
  displayName: 'Image Service Alarms',
  topicName: `image-service-alarms-${stage}`,
})

snsAlarmTopic.addSubscription(new EmailSubscription('devops@lego-moc.com'))

// Optional: Slack integration via Lambda
snsAlarmTopic.addSubscription(new LambdaSubscription(slackNotificationLambda))
```

---

## AWS X-Ray Tracing

### Enable X-Ray

```typescript
// sst.config.ts
const uploadLambda = new Function(stack, 'UploadFunction', {
  // ... other config
  cdk: {
    function: {
      tracing: Tracing.ACTIVE,
    },
  },
})
```

---

### X-Ray Instrumentation

```typescript
// src/functions/upload.ts
import AWSXRay from 'aws-xray-sdk-core'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'

// Wrap AWS SDK clients with X-Ray
const dynamodb = AWSXRay.captureAWSv3Client(new DynamoDBClient({}))
const s3 = AWSXRay.captureAWSv3Client(new S3Client({}))

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const segment = AWSXRay.getSegment()

  // Create subsegment for image processing
  const processSegment = segment?.addNewSubsegment('ImageProcessing')
  try {
    const processed = await sharp(file.buffer).webp().toBuffer()
    processSegment?.close()
  } catch (error) {
    processSegment?.addError(error)
    processSegment?.close()
    throw error
  }

  // Create subsegment for S3 upload
  const uploadSegment = segment?.addNewSubsegment('S3Upload')
  try {
    await uploadToS3(key, processed)
    uploadSegment?.close()
  } catch (error) {
    uploadSegment?.addError(error)
    uploadSegment?.close()
    throw error
  }

  // DynamoDB write is automatically traced (wrapped client)
  await saveImageMetadata({ ... })
}
```

---

### X-Ray Service Map

X-Ray automatically generates service map showing:

- API Gateway → Lambda
- Lambda → DynamoDB
- Lambda → S3
- Latency at each hop
- Error rates

**Access:** AWS Console → X-Ray → Service Map

---

## CloudWatch Dashboard

### Dashboard Configuration

```typescript
import { Dashboard, GraphWidget, SingleValueWidget } from 'aws-cdk-lib/aws-cloudwatch'

const dashboard = new Dashboard(stack, 'ImageServiceDashboard', {
  dashboardName: `image-service-${stage}`,
})

// Upload Lambda metrics
dashboard.addWidgets(
  new GraphWidget({
    title: 'Upload Lambda - Invocations',
    left: [uploadLambda.metricInvocations()],
    width: 12,
  }),
  new GraphWidget({
    title: 'Upload Lambda - Duration (P95)',
    left: [uploadLambda.metricDuration({ statistic: 'p95' })],
    width: 12,
  }),
)

// DynamoDB metrics
dashboard.addWidgets(
  new GraphWidget({
    title: 'DynamoDB - Consumed Capacity',
    left: [
      imageMetadataTable.metricConsumedReadCapacityUnits(),
      imageMetadataTable.metricConsumedWriteCapacityUnits(),
    ],
    width: 12,
  }),
  new GraphWidget({
    title: 'DynamoDB - Errors',
    left: [imageMetadataTable.metricSystemErrors(), imageMetadataTable.metricUserErrors()],
    width: 12,
  }),
)

// CloudFront metrics
dashboard.addWidgets(
  new GraphWidget({
    title: 'CloudFront - Cache Hit Rate',
    left: [distribution.metricCacheHitRate()],
    width: 12,
  }),
  new SingleValueWidget({
    title: 'CloudFront - Requests (24h)',
    metrics: [distribution.metricRequests({ period: Duration.hours(24) })],
    width: 6,
  }),
)
```

---

### Dashboard Widgets

**Widget 1: Upload Success Rate**

- Metric: `ImageUploadSuccess / (ImageUploadSuccess + ImageUploadFailure)`
- Target: >99.9%

**Widget 2: P95 Upload Latency**

- Metric: `AWS/Lambda Duration (p95)`
- Target: <1000ms

**Widget 3: DynamoDB Throttling**

- Metric: `AWS/DynamoDB UserErrors`
- Target: 0

**Widget 4: CloudFront Cache Hit Rate**

- Metric: `AWS/CloudFront CacheHitRate`
- Target: >85%

**Widget 5: Lambda Error Rate**

- Metric: `AWS/Lambda Errors / Invocations`
- Target: <0.1%

---

## Health Checks

### Lambda Health Endpoint

```typescript
// src/functions/health.ts
export const handler: APIGatewayProxyHandlerV2 = async () => {
  const checks = {
    dynamodb: await checkDynamoDB(),
    s3: await checkS3(),
    cloudfront: await checkCloudFront(),
    redis: await checkRedis(),
  }

  const allHealthy = Object.values(checks).every(check => check.status === 'up')

  return {
    statusCode: allHealthy ? 200 : 503,
    body: JSON.stringify({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: checks,
    }),
  }
}

async function checkDynamoDB(): Promise<{ status: string }> {
  try {
    await dynamodb.describeTable({ TableName: 'ImageMetadata-prod' })
    return { status: 'up' }
  } catch (error) {
    return { status: 'down' }
  }
}

async function checkS3(): Promise<{ status: string }> {
  try {
    await s3.headBucket({ Bucket: 'images-lego-moc-prod' })
    return { status: 'up' }
  } catch (error) {
    return { status: 'down' }
  }
}
```

**Route:** `GET /health` (no authentication required)

---

## Monitoring Checklist

### Pre-Launch

- [ ] CloudWatch Logs configured with retention
- [ ] CloudWatch Alarms created for all critical metrics
- [ ] SNS topic configured with email subscriptions
- [ ] CloudWatch Dashboard created
- [ ] X-Ray tracing enabled on all Lambdas
- [ ] Custom metrics instrumented in code
- [ ] Health check endpoint implemented

### Post-Launch

- [ ] Review dashboard daily for first week
- [ ] Tune alarm thresholds based on actual traffic
- [ ] Review CloudWatch Insights queries weekly
- [ ] Monitor cost metrics (AWS Cost Explorer)
- [ ] Review X-Ray service map for bottlenecks
- [ ] Optimize Lambda memory based on metrics

---

## Next Steps

1. Review [10-implementation-phases.md](./10-implementation-phases.md) - Detailed task breakdown
2. Set up monitoring infrastructure before Phase 1 deployment
3. Create runbooks for common alarm scenarios

---

[← Back to Cost Analysis](./08-cost-analysis.md) | [Next: Implementation Phases →](./10-implementation-phases.md)
