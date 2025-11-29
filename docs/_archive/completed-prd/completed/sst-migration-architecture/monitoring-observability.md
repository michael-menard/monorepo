# Monitoring & Observability

## CloudWatch Dashboards

**Dashboard: LEGO-API-Serverless-{Stage}**

**Widgets**:

**Lambda Metrics** (per function):

- Invocations (total, success, errors, throttles)
- Duration (avg, p50, p95, p99, max)
- Concurrent Executions
- Cold Starts (custom metric)
- Error Rate (%)

**API Gateway Metrics**:

- Request Count
- 4xx Error Rate
- 5xx Error Rate
- Latency (p50, p95, p99)

**Database Metrics**:

- RDS Proxy Connections (active, idle, borrow latency)
- RDS CPU Utilization
- RDS Freeable Memory
- RDS Database Connections

**Cache Metrics**:

- Redis Cache Hit Rate (custom metric)
- Redis Memory Usage
- Redis Evictions

**Search Metrics**:

- OpenSearch Cluster Status
- OpenSearch Indexing Rate
- OpenSearch Search Latency

**Business KPIs** (custom metrics):

- MOCs Created (per hour)
- Images Uploaded (per hour)
- Searches Performed (per hour)

## CloudWatch Alarms

**Critical Alarms** (SNS → Email/Slack):

- Lambda Error Rate >5% (5 min window)
- API Gateway 5xx Error Rate >3% (5 min window)
- RDS CPU >80% (10 min window)
- OpenSearch Cluster Status RED
- Lambda Cold Start >2s (p99)

**Warning Alarms**:

- Lambda Throttles >10 (5 min window)
- API Gateway Latency >1s (p99)
- RDS Freeable Memory <1GB
- Redis Evictions >100/min

## AWS X-Ray Tracing

**Enabled for All Lambdas**: Active tracing with custom subsegments

**Instrumentation**:

```typescript
import { captureAWSv3Client } from 'aws-xray-sdk-core'
import { S3Client } from '@aws-sdk/client-s3'

const s3Client = captureAWSv3Client(new S3Client({}))

// Custom subsegments
import AWSXRay from 'aws-xray-sdk-core'

export const handler = async event => {
  const segment = AWSXRay.getSegment()
  const subsegment = segment.addNewSubsegment('DatabaseQuery')

  try {
    const result = await db.select().from(mocInstructions)
    subsegment.close()
    return result
  } catch (error) {
    subsegment.addError(error)
    subsegment.close()
    throw error
  }
}
```

**Service Map**: Visualizes request flow through API Gateway → Lambda → RDS/Redis/OpenSearch/S3

## Logging Strategy

**Structured JSON Logging** (Pino):

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: label => ({ level: label }),
  },
})

logger.info({ userId, mocId, action: 'CREATE_MOC' }, 'MOC created successfully')
logger.error({ error, userId, requestId }, 'Failed to upload image')
```

**Log Aggregation**: CloudWatch Logs Insights for querying

**Sample Query** (find all errors for a user):

```
fields @timestamp, message, userId, error
| filter level = "error" and userId = "user-123"
| sort @timestamp desc
| limit 100
```

## Cost Monitoring

**AWS Cost Explorer Tags**:

- `Project: LEGO-API`
- `Environment: dev|staging|production`
- `Service: Lambda|RDS|Redis|OpenSearch|S3`

**Budget**: $200/month with 80% and 100% threshold alerts

**Cost Breakdown Tracking**:

- Lambda invocations + duration
- RDS instance + storage + backups
- ElastiCache node hours
- OpenSearch node hours
- S3 storage + requests
- Data transfer (VPC → Internet)

---
