# Authentication Service Logging

## Overview

The auth service uses structured logging with Pino to provide comprehensive request tracking, user context, and security monitoring while protecting sensitive information.

## Features

- **Request ID Generation**: Every request gets a unique UUID for tracing
- **Sensitive Data Redaction**: Automatic removal of passwords, tokens, and credentials from logs
- **User Context**: Includes user ID, IP address, and user agent when available
- **Structured Events**: Standardized logging for authentication, security, and database events
- **Performance Monitoring**: Request duration and performance metrics

## Configuration

The logger is configured in `index.ts` with:

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.newPassword',
      'body.token',
      'body.refreshToken',
      'user.password',
      'user.refreshToken',
      'user.verificationToken',
      'user.resetPasswordToken',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: label => ({ level: label }),
  },
})

const httpLogger = pinoHttp({
  logger,
  genReqId: req => req.id || req.headers['x-request-id'] || uuidv4(),
  customProps: (req, res) => {
    return {
      userId: req.user?.id,
      correlationId: getOrCreateCorrelationId(req),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    }
  },
})
```

## Logging Utilities

Located in `utils/logger.ts`, these functions provide standardized logging:

### Authentication Events

```typescript
logAuthEvent(req, 'login', { email: user.email, method: 'email' })
logAuthEvent(req, 'signup', { email, verified: false })
```

### Security Events

```typescript
logSecurityEvent(req, 'failed_login', {
  email,
  reason: 'Invalid credentials',
  attempts: 3,
})
```

### User Actions

```typescript
logUserAction(req, 'password_reset_requested', { email })
logUserAction(req, 'email_verified', { userId: user.id })
```

### Error Logging

```typescript
logAuthError(req, error, 'signup_failed', { email, step: 'validation' })
```

### Database Operations

```typescript
logDatabaseOperation(req, 'user_created', {
  userId: user.id,
  table: 'users',
  operation: 'INSERT',
})
```

### Email Events

```typescript
logEmailEvent(req, 'verification_sent', true, {
  email,
  template: 'verification',
})
```

### Performance Monitoring

```typescript
const startTime = Date.now()
// ... operation ...
logPerformance(req, 'password_hash', Date.now() - startTime)
```

## Request Context

All log entries automatically include:

- **requestId**: Unique identifier for request tracing
- **correlationId**: For distributed tracing across services
- **userId**: When user is authenticated
- **ip**: Client IP address
- **userAgent**: Client browser/application
- **timestamp**: ISO 8601 formatted timestamp

## Sensitive Data Protection

The following fields are automatically redacted:

- Authorization headers
- Cookies
- Passwords (any field named `password`)
- Authentication tokens
- User credentials

## Log Levels

- **info**: Normal operations (login, signup, logout)
- **warn**: Failed email sends, validation errors
- **error**: Authentication failures, system errors
- **debug**: Detailed debugging information (development only)

## Environment Variables

- `LOG_LEVEL`: Set logging level (default: 'info')
- `NODE_ENV`: When set to 'development', enables more verbose logging

## Testing

Comprehensive tests in `__tests__/logger.test.ts` verify:

- Request ID generation and inclusion
- Sensitive data redaction
- User context handling
- Error logging with stack traces
- Performance monitoring
- All utility functions

Run tests with:

```bash
pnpm test __tests__/logger.test.ts
```

## Best Practices

1. **Always use structured logging functions** instead of `console.log`
2. **Include relevant context** (userId, email, operation type)
3. **Use appropriate log levels** (info for success, warn for recoverable issues, error for failures)
4. **Never manually log sensitive data** - rely on automatic redaction
5. **Include request context** by passing the `req` object to logging functions
6. **Use correlation IDs** for tracing requests across service boundaries

## Examples

### Successful Login

```typescript
// In controller
logAuthEvent(req, 'login_success', {
  email: user.email,
  loginMethod: 'email',
  userAgent: req.get('User-Agent'),
})
```

### Failed Authentication

```typescript
// In controller
logSecurityEvent(req, 'login_failed', {
  email: loginData.email,
  reason: 'Invalid credentials',
  ip: req.ip,
})
```

### Database Error

```typescript
// In controller
logAuthError(req, error, 'database_error', {
  operation: 'user_lookup',
  email: loginData.email,
})
```

All logs will automatically include request ID, user context, and timestamps while protecting sensitive information.
