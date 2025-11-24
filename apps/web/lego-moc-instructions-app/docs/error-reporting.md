# Frontend Error Reporting to CloudWatch

**Story 3.4: Frontend Error Reporting to CloudWatch**

This document describes the frontend error reporting system that captures and sends error reports to CloudWatch for monitoring in Grafana dashboards.

## Overview

The error reporting system provides comprehensive error tracking for the frontend application:

- **PII Sanitization**: All errors are sanitized to remove personally identifiable information before transmission
- **Automatic Error Capture**: Catches uncaught errors, unhandled promise rejections, and React component errors
- **Batching**: Errors are batched to reduce API calls
- **CloudWatch Integration**: Errors are logged to CloudWatch Logs for querying and visualization in Grafana

## Architecture

### Components

1. **Frontend Error Reporting Module** (`src/lib/tracking/error-reporting.ts`)
   - Captures and reports errors
   - Batches errors for efficient transmission
   - Provides session tracking

2. **React ErrorBoundary** (`src/components/ErrorBoundary.tsx`)
   - Catches React component errors
   - Shows fallback UI to users
   - Reports errors to CloudWatch

3. **Lambda Ingestion Function** (`apps/api/lego-api-serverless/src/lambda/tracking/frontend-error-ingestion.ts`)
   - Receives error reports from frontend
   - Validates payloads
   - Processes single and batch errors

4. **CloudWatch Logging Module** (`apps/api/lego-api-serverless/src/lib/tracking/cloudwatch-frontend-errors.ts`)
   - Sanitizes errors using PII sanitizer
   - Logs structured error data to CloudWatch
   - Provides fields for CloudWatch Insights queries

5. **PII Sanitizer Package** (`packages/tools/pii-sanitizer`)
   - Removes sensitive data from errors
   - Sanitizes emails, phone numbers, credit cards, SSN, API keys, JWT tokens, AWS keys
   - Configurable sanitization options

## Usage

### Error Boundary

Wrap components with ErrorBoundary to catch React errors:

```tsx
import { ErrorBoundary } from '../components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  )
}
```

**With Custom Fallback:**

```tsx
<ErrorBoundary fallback={<div>Something went wrong. Please refresh the page.</div>}>
  <YourApp />
</ErrorBoundary>
```

**With Custom Error Handler:**

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Custom handling
    console.log('Error caught:', error)
  }}
  context={{ userId: 'user-123', route: '/profile' }}
>
  <YourApp />
</ErrorBoundary>
```

### Manual Error Reporting

Report errors manually using the error reporting API:

```typescript
import { reportError } from './lib/tracking/error-reporting'

try {
  // Your code
} catch (error) {
  reportError('error', error as Error, {
    userId: 'user-123',
    route: '/profile',
    action: 'save-settings',
    metadata: {
      formData: 'sanitized-data',
    },
  })
}
```

### Global Error Handlers

Global error handlers are automatically initialized in `main.tsx`:

```typescript
import { initErrorReporting } from './lib/tracking/error-reporting'

// Initialize error reporting
initErrorReporting()
```

This captures:

- `window.onerror` - Uncaught JavaScript errors
- `window.onunhandledrejection` - Unhandled promise rejections

## Error Types

The system classifies errors into three types:

1. **error** - Uncaught JavaScript errors (`window.onerror`)
2. **unhandledrejection** - Unhandled promise rejections
3. **react-error-boundary** - React component errors caught by ErrorBoundary

## Batching

Errors are batched to reduce API calls:

- **Batch Size**: 10 errors (configurable via performance config)
- **Flush Interval**: 5000ms (configurable via performance config)
- **Critical Errors**: Sent immediately (React errors, ChunkLoadErrors)

Automatic flushing occurs:

- When batch size is reached
- On page visibility change (hidden)
- Before page unload

## PII Sanitization

All error data is sanitized before transmission to remove:

- Email addresses
- Phone numbers
- Credit card numbers
- Social Security Numbers
- API keys and tokens
- JWT tokens
- AWS access keys

Example:

```
Before: "User john.doe@example.com failed to login with card 4532-1234-5678-9010"
After:  "User [REDACTED] failed to login with card [REDACTED]"
```

## CloudWatch Logs

### Log Structure

Errors are logged with the following structure:

```json
{
  "ErrorType": "react-error-boundary",
  "ErrorName": "TypeError",
  "ErrorMessage": "[REDACTED]",
  "SessionId": "1234567890-abc123",
  "Timestamp": 1234567890000,
  "ISOTimestamp": "2024-01-01T00:00:00.000Z",
  "URL": "https://example.com/profile",
  "UserAgent": "Mozilla/5.0...",
  "Route": "/profile",
  "UserAction": "save-settings",
  "Stack": "[REDACTED stack trace...]",
  "ComponentStack": "[REDACTED component stack...]",
  "Metadata": { "key": "value" },
  "LogLevel": "ERROR",
  "Source": "Frontend"
}
```

### CloudWatch Insights Queries

Query errors in CloudWatch Insights:

**All Errors:**

```
fields @timestamp, ErrorType, ErrorName, ErrorMessage
| filter Source = "Frontend"
| sort @timestamp desc
| limit 100
```

**Errors by Type:**

```
fields @timestamp, ErrorType, ErrorName, ErrorMessage, SessionId
| filter Source = "Frontend" and ErrorType = "react-error-boundary"
| sort @timestamp desc
```

**Error Count by Name:**

```
fields ErrorName
| filter Source = "Frontend"
| stats count() by ErrorName
| sort count desc
```

**Errors by Route:**

```
fields @timestamp, Route, ErrorName, ErrorMessage
| filter Source = "Frontend"
| stats count() by Route
| sort count desc
```

**Session Errors:**

```
fields @timestamp, ErrorType, ErrorName, ErrorMessage
| filter Source = "Frontend" and SessionId = "1234567890-abc123"
| sort @timestamp asc
```

## Grafana Dashboards

### Error Rate Panel

Query:

```
fields @timestamp
| filter Source = "Frontend"
| stats count() as ErrorCount by bin(5m)
```

### Top Errors Panel

Query:

```
fields ErrorName, ErrorMessage
| filter Source = "Frontend"
| stats count() as Count by ErrorName
| sort Count desc
| limit 10
```

### Error Distribution Panel

Query:

```
fields ErrorType
| filter Source = "Frontend"
| stats count() as Count by ErrorType
```

### Recent Errors Table

Query:

```
fields @timestamp, ErrorType, ErrorName, ErrorMessage, Route
| filter Source = "Frontend"
| sort @timestamp desc
| limit 50
```

## Configuration

Error reporting is controlled by the performance configuration in `src/config/performance.ts`:

```typescript
{
  enabled: true, // Enable/disable error reporting
  production: {
    sendToAnalytics: true, // Send to CloudWatch
    batchSize: 10, // Number of errors before flush
    flushInterval: 5000, // Max time before flush (ms)
  },
  privacy: {
    anonymizeUserAgent: false, // Remove user agent
  }
}
```

## Development vs Production

### Development Mode

- Errors are logged to console only
- No data is sent to CloudWatch
- Full error details are shown in ErrorBoundary fallback UI
- Development mode indicator shown in error UI

### Production Mode

- Errors are sent to CloudWatch
- PII is sanitized
- User-friendly error messages shown
- Errors are batched for efficiency

## API Endpoint

**Endpoint:** `POST /api/tracking/errors`

**Single Error Payload:**

```json
{
  "type": "error",
  "sessionId": "1234567890-abc123",
  "timestamp": 1234567890000,
  "url": "https://example.com/profile",
  "userAgent": "Mozilla/5.0...",
  "error": {
    "message": "Error message",
    "name": "TypeError",
    "stack": "Error stack trace..."
  },
  "context": {
    "userId": "user-123",
    "route": "/profile",
    "action": "save-settings",
    "metadata": {}
  }
}
```

**Batch Error Payload:**

```json
{
  "sessionId": "1234567890-abc123",
  "errors": [
    {
      /* error 1 */
    },
    {
      /* error 2 */
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Error reports processed successfully",
  "processed": 2,
  "failed": 0
}
```

## Testing

### Manual Testing

Test error reporting in development:

```typescript
// Trigger an error
throw new Error('Test error')

// Trigger unhandled rejection
Promise.reject(new Error('Test rejection'))

// Trigger React error
function BrokenComponent() {
  throw new Error('React error')
  return <div>Never rendered</div>
}
```

### Monitoring

1. Check browser console for error logs in development
2. Check CloudWatch Logs for error entries in production
3. View error metrics in Grafana dashboards

## Best Practices

1. **Don't Report Sensitive Data**: Ensure error messages don't contain PII before throwing
2. **Use Error Boundaries**: Wrap major sections of your app in ErrorBoundary
3. **Provide Context**: Include route, userId, and action in error context
4. **Handle Expected Errors**: Don't report expected errors (e.g., validation failures)
5. **Test Error Reporting**: Regularly test error reporting in staging
6. **Monitor Error Rates**: Set up alerts for error rate spikes in Grafana

## Troubleshooting

### Errors Not Appearing in CloudWatch

1. Check that `sendToAnalytics` is enabled in performance config
2. Verify API endpoint is correct
3. Check browser network tab for failed requests
4. Ensure Lambda has permissions to write to CloudWatch Logs

### Too Many Errors Being Reported

1. Adjust batch size and flush interval in config
2. Filter out non-critical errors
3. Add error deduplication logic

### PII Appearing in Logs

1. Review PII sanitizer configuration
2. Add custom patterns to sanitizer
3. Ensure error messages don't contain PII before throwing

## Related Documentation

- [PII Sanitizer Package](../../../packages/tools/pii-sanitizer/README.md)
- [Web Vitals Tracking](./web-vitals-tracking.md)
- [Performance Configuration](../src/config/performance.ts)
- [Story 3.4](../../../docs/stories/3.4.frontend-error-reporting-cloudwatch.md)
