# Structured Logging Implementation

## Overview

This document describes the structured logging implementation for Lambda functions in the LEGO API Serverless application (Story 3.2).

Structured logging provides JSON-formatted log output optimized for CloudWatch Logs, OpenSearch, and Grafana analysis with automatic request correlation and X-Ray tracing integration.

## Features

- **Pure JSON Output**: CloudWatch-optimized format (no pretty-printing)
- **Request Correlation**: Unique correlation ID for each request
- **X-Ray Integration**: Automatic trace ID capture and propagation
- **Rich Context**: Request ID, user ID, function name, method, path
- **Error Handling**: Structured error objects with stack traces
- **Performance**: Minimal overhead (<1ms per log entry)

## Log Format

All log entries follow this structured format:

```json
{
  "level": "INFO",
  "time": "2025-01-23T10:15:30.123Z",
  "context": "lambda-wrapper",
  "functionName": "GetMocById",
  "region": "us-east-1",
  "requestId": "abc123-def456-ghi789",
  "correlationId": "1706005530123-a1b2c3d4",
  "traceId": "1-5e645f3e-1234567890abcdef",
  "userId": "user-123",
  "method": "GET",
  "path": "/api/mocs/123",
  "msg": "Incoming request",
  "pathParameters": {
    "id": "123"
  }
}
```

### Core Fields

| Field          | Type   | Description                          | Always Present     |
| -------------- | ------ | ------------------------------------ | ------------------ |
| `level`        | string | Log level (DEBUG, INFO, WARN, ERROR) | Yes                |
| `time`         | string | ISO 8601 timestamp                   | Yes                |
| `context`      | string | Logger context/name                  | Yes                |
| `functionName` | string | Lambda function name                 | Yes (if in Lambda) |
| `region`       | string | AWS region                           | Yes (if in Lambda) |
| `msg`          | string | Log message                          | Yes                |

### Request Context Fields

| Field           | Type   | Description                        | Always Present        |
| --------------- | ------ | ---------------------------------- | --------------------- |
| `requestId`     | string | AWS Lambda request ID              | No (request scope)    |
| `correlationId` | string | Request correlation ID for tracing | No (request scope)    |
| `traceId`       | string | X-Ray trace ID                     | No (if X-Ray enabled) |
| `userId`        | string | Authenticated user ID              | No (if authenticated) |
| `method`        | string | HTTP method (GET, POST, etc.)      | No (HTTP requests)    |
| `path`          | string | API path                           | No (HTTP requests)    |

### Error Fields

When logging errors, additional fields are included:

```json
{
  "level": "ERROR",
  "error": {
    "message": "MOC not found",
    "name": "NotFoundError",
    "stack": "NotFoundError: MOC not found\n    at getMocById (/var/task/..."
  }
}
```

## Usage

### Automatic Structured Logging

All Lambda functions wrapped with `withErrorHandling()` automatically get structured logging:

```typescript
import { withErrorHandling } from '@/lib/utils/lambda-wrapper'

export const handler = withErrorHandling(async event => {
  // Logging is automatic - request/response logged with full context
  const moc = await getMocById(event.pathParameters.id)
  return successResponse(200, moc)
})
```

**Automatic logging includes:**

- Incoming request (INFO level)
- Request completion (INFO level)
- Errors (ERROR level)
- Cold starts (INFO level)

### Manual Logging with Full Context

For logging within handlers, create a logger with context:

```typescript
import { createLambdaLogger } from '@repo/logger'
import { withErrorHandling } from '@/lib/utils/lambda-wrapper'

export const handler = withErrorHandling(async event => {
  const logger = createLambdaLogger('moc-service', {
    requestId: event.requestContext.requestId,
    // Context automatically populated by wrapper
  })

  logger.info('Processing MOC request', { mocId: event.pathParameters.id })

  const moc = await getMocById(event.pathParameters.id)

  logger.info('MOC retrieved successfully', {
    mocId: moc.id,
    title: moc.title,
  })

  return successResponse(200, moc)
})
```

### Log Levels

Use appropriate log levels:

```typescript
// DEBUG: Detailed diagnostic information
logger.debug('Cache lookup', { key: 'moc:123', hit: true })

// INFO: General informational messages
logger.info('Processing request', { userId: '123', action: 'get' })

// WARN: Warning messages for potentially harmful situations
logger.warn('Slow query detected', { duration: 1500, query: 'getMocs' })

// ERROR: Error messages for failures
logger.error('Database query failed', error, { query: 'getMocs' })
```

## Correlation ID

### What is a Correlation ID?

A correlation ID is a unique identifier that allows tracing a request through multiple services, logs, and systems.

### Automatic Generation

Correlation IDs are automatically generated for each request if not provided:

```
Format: {timestamp}-{random}
Example: 1706005530123-a1b2c3d4
```

### Client-Provided Correlation ID

Clients can provide correlation IDs via header:

```http
GET /api/mocs/123 HTTP/1.1
X-Correlation-ID: client-abc123
```

The Lambda wrapper will extract and use the client-provided correlation ID.

### Correlation ID in Responses

All responses include the correlation ID header for client-side tracing:

```http
HTTP/1.1 200 OK
X-Correlation-ID: 1706005530123-a1b2c3d4
Content-Type: application/json
```

### Tracing Requests Across Services

Use the correlation ID to trace a request through logs:

**CloudWatch Logs Insights Query:**

```sql
fields @timestamp, @message, level, msg, correlationId
| filter correlationId = "1706005530123-a1b2c3d4"
| sort @timestamp asc
```

This shows all log entries for a specific request across all Lambda functions.

## X-Ray Integration

### Automatic X-Ray Trace ID Capture

The logger automatically extracts and includes the X-Ray trace ID:

```typescript
// X-Ray trace ID automatically captured from environment
const traceId = process.env._X_AMZN_TRACE_ID
// Parsed to: "1-5e645f3e-1234567890abcdef"
```

### Correlation ID in X-Ray Traces

The correlation ID is added as an X-Ray annotation for searchability:

```typescript
addAnnotation('correlationId', correlationId)
```

This allows filtering X-Ray traces by correlation ID in the AWS X-Ray console.

### Linking Logs to X-Ray Traces

With both `correlationId` and `traceId` in logs, you can:

1. Find logs by correlation ID
2. Extract the X-Ray trace ID from logs
3. View the full X-Ray trace for detailed timing analysis

## Environment-Specific Configuration

### Log Levels by Environment

Log levels are automatically configured based on environment:

| Environment | Default Level | Description                             |
| ----------- | ------------- | --------------------------------------- |
| Development | DEBUG         | All logs including detailed diagnostics |
| Staging     | INFO          | Informational logs and above            |
| Production  | INFO          | Informational logs and above            |

### Override Log Level

Set the `LOG_LEVEL` environment variable to override:

```bash
LOG_LEVEL=DEBUG  # Force DEBUG level
LOG_LEVEL=WARN   # Only WARN and ERROR
LOG_LEVEL=ERROR  # Only ERROR
```

## CloudWatch Logs Insights Queries

### Find Logs by Correlation ID

```sql
fields @timestamp, level, msg, correlationId, userId
| filter correlationId = "1706005530123-a1b2c3d4"
| sort @timestamp asc
```

### Find All Errors for a User

```sql
fields @timestamp, msg, error.message, userId, path
| filter level = "ERROR" and userId = "user-123"
| sort @timestamp desc
| limit 100
```

### Find Slow Requests

```sql
fields @timestamp, msg, duration, path, method
| filter duration > 1000  # Requests taking > 1 second
| sort duration desc
| limit 50
```

### Cold Start Analysis

```sql
fields @timestamp, functionName, path, method
| filter msg = "Cold start detected"
| stats count() by functionName
| sort count desc
```

### Error Rate by Function

```sql
fields @timestamp, level, functionName
| filter level = "ERROR"
| stats count() as errorCount by functionName
| sort errorCount desc
```

### Request Volume by Path

```sql
fields @timestamp, path, method
| filter msg = "Incoming request"
| stats count() as requests by path, method
| sort requests desc
```

## OpenSearch Integration

### Structured Logs in OpenSearch

When logs are sent to OpenSearch (Story 2.4), all fields are automatically indexed:

```json
{
  "_index": "lambda-logs-2025.01",
  "_source": {
    "level": "INFO",
    "time": "2025-01-23T10:15:30.123Z",
    "correlationId": "1706005530123-a1b2c3d4",
    "userId": "user-123",
    "path": "/api/mocs/123",
    ...
  }
}
```

### OpenSearch Queries

**Find all requests by a user:**

```
userId: "user-123" AND level: "INFO"
```

**Find errors in the last hour:**

```
level: "ERROR" AND time: [now-1h TO now]
```

**Trace a specific request:**

```
correlationId: "1706005530123-a1b2c3d4"
```

## Best Practices

### 1. Use Appropriate Log Levels

- **DEBUG**: Only for development debugging
- **INFO**: Normal application flow
- **WARN**: Potentially harmful situations
- **ERROR**: Failures and exceptions

### 2. Include Relevant Context

```typescript
// Good: Includes relevant business context
logger.info('MOC retrieved', {
  mocId: '123',
  title: 'My MOC',
  userId: 'user-456',
})

// Bad: No context
logger.info('MOC retrieved')
```

### 3. Structure Error Logs

```typescript
// Good: Error object + context
try {
  await deleteMoc(mocId)
} catch (error) {
  logger.error('Failed to delete MOC', error as Error, {
    mocId,
    userId,
  })
  throw error
}

// Bad: Error message only
catch (error) {
  logger.error('Delete failed')
}
```

### 4. Don't Log Sensitive Data

```typescript
// Bad: Logs password
logger.info('User login', { email, password })

// Good: Omits sensitive data
logger.info('User login', { email })
```

### 5. Use Correlation IDs for Tracing

```typescript
// Extract correlation ID for downstream calls
const correlationId = event.headers['X-Correlation-ID']

// Pass to downstream services
await callExternalApi({
  headers: {
    'X-Correlation-ID': correlationId,
  },
})
```

### 6. Log Business Events

```typescript
// Good: Logs important business events
logger.info('MOC published', {
  mocId,
  title,
  userId,
  publishedAt: new Date().toISOString(),
})
```

## Migration from console.log

### Before (console.log)

```typescript
console.log('Getting MOC:', mocId)
console.error('Error getting MOC:', error)
```

**Problems:**

- Unstructured text output
- No correlation ID
- No request context
- Difficult to query in CloudWatch

### After (Structured Logging)

```typescript
logger.info('Getting MOC', { mocId })
logger.error('Error getting MOC', error as Error, { mocId })
```

**Benefits:**

- Structured JSON output
- Automatic correlation ID
- Full request context
- Easy CloudWatch queries
- X-Ray integration

### Migration Checklist

- [ ] Replace `console.log` with `logger.info`
- [ ] Replace `console.error` with `logger.error`
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Replace `console.debug` with `logger.debug`
- [ ] Add context objects with relevant data
- [ ] Pass Error objects to `logger.error()` (not just messages)

## Performance Considerations

### Log Volume

**Estimated log volume per request:**

- Incoming request: ~500 bytes
- Response: ~300 bytes
- Average business logs: ~200 bytes each
- **Total per request**: ~1-2 KB

**Monthly cost estimate (100 users, 10K requests/month):**

- Log volume: ~20 MB/month
- CloudWatch ingestion: $0.01/month
- Storage (30 days): <$0.01/month
- **Total**: ~$0.02/month

### Logging Overhead

**Performance impact:**

- JSON serialization: < 0.5ms per log entry
- Total per request: < 2ms
- **Negligible impact on Lambda execution time**

### Log Level Filtering

Use appropriate log levels to control volume:

```typescript
// Development: DEBUG level (high volume)
// Staging: INFO level (medium volume)
// Production: INFO level (medium volume)
// Production (high traffic): WARN level (low volume)
```

## Troubleshooting

### Logs Not Appearing

1. **Check Lambda Execution Role**
   - Verify `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` permissions

2. **Check Log Level**
   - Verify `LOG_LEVEL` environment variable
   - Ensure log level is appropriate (DEBUG, INFO, WARN, ERROR)

3. **Check CloudWatch Log Group**
   - Verify log group exists: `/aws/lambda/{function-name}`
   - Check log stream for recent entries

### Missing Correlation IDs

1. **Check Header Extraction**
   - Verify client sends `X-Correlation-ID` header (optional)
   - Automatic generation should always provide correlation ID

2. **Check Response Headers**
   - All responses should include `X-Correlation-ID` header

### JSON Parsing Errors

1. **Check Log Format**
   - Ensure using `LambdaLogger` (pure JSON)
   - Not using `SimpleLogger` with `pino-pretty`

2. **Check CloudWatch Logs Insights**
   - JSON logs should be automatically parsed
   - Fields accessible via dot notation: `correlationId`, `userId`, etc.

## References

- Story 3.2: Structured Logging Implementation
- Story 2.4: OpenSearch Integration for Log Analysis
- Story 5.3: X-Ray Annotations and Metadata
- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [AWS Lambda Logging Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/python-logging.html)
- [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/)
