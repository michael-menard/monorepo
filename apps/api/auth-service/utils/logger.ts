import { Request } from 'express';

/**
 * Extended Request interface that includes pino logger
 */
interface LoggerRequest extends Request {
  log: any;
  user?: { id: string; email?: string };
  userId?: string;
}

/**
 * Standard authentication event logging utility
 * Provides consistent structured logging for auth events
 */
export function logAuthEvent(
  req: LoggerRequest,
  event: string,
  details: Record<string, any> = {},
  level: 'info' | 'warn' | 'error' = 'info',
) {
  const logData = {
    ...details,
    userId: req.user?.id || req.userId,
    userEmail: req.user?.email,
    event,
    requestId: (req as any).id,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };

  req.log[level](logData, `Auth event: ${event}`);
}

/**
 * Log security events (failed logins, suspicious activity, etc.)
 */
export function logSecurityEvent(
  req: LoggerRequest,
  event: string,
  details: Record<string, any> = {},
) {
  logAuthEvent(req, event, { ...details, security: true }, 'warn');
}

/**
 * Log user actions with context
 */
export function logUserAction(
  req: LoggerRequest,
  action: string,
  details: Record<string, any> = {},
) {
  logAuthEvent(req, action, details, 'info');
}

/**
 * Log authentication errors with proper context
 */
export function logAuthError(
  req: LoggerRequest,
  error: string | Error,
  details: Record<string, any> = {},
) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  logAuthEvent(
    req,
    'auth_error',
    {
      ...details,
      error: errorMessage,
      stack: errorStack,
    },
    'error',
  );
}

/**
 * Log database operations with context
 */
export function logDatabaseOperation(
  req: LoggerRequest,
  operation: string,
  collection: string,
  details: Record<string, any> = {},
) {
  logAuthEvent(req, 'database_operation', {
    ...details,
    operation,
    collection,
  });
}

/**
 * Log email operations
 */
export function logEmailEvent(
  req: LoggerRequest,
  emailType: string,
  recipient: string,
  success: boolean,
  details: Record<string, any> = {},
) {
  logAuthEvent(
    req,
    'email_sent',
    {
      ...details,
      emailType,
      recipient,
      success,
    },
    success ? 'info' : 'warn',
  );
}

/**
 * Log validation errors with sanitized data
 */
export function logValidationError(
  req: LoggerRequest,
  field: string,
  error: string,
  details: Record<string, any> = {},
) {
  logAuthEvent(
    req,
    'validation_error',
    {
      ...details,
      field,
      validationError: error,
    },
    'warn',
  );
}

/**
 * Log rate limiting events
 */
export function logRateLimitHit(
  req: LoggerRequest,
  limit: number,
  windowMs: number,
  details: Record<string, any> = {},
) {
  logSecurityEvent(req, 'rate_limit_hit', {
    ...details,
    limit,
    windowMs,
  });
}

/**
 * Sanitize user object for logging (remove sensitive fields)
 */
export function sanitizeUserForLogging(user: any) {
  if (!user) return null;

  const sanitized = {
    id: user._id || user.id,
    email: user.email,
    name: user.name,
    isVerified: user.isVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return sanitized;
}

/**
 * Create correlation ID for tracking requests across services
 */
export function getOrCreateCorrelationId(req: Request): string {
  return (
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    (req as any).id
  );
}

/**
 * Log performance metrics for operations
 */
export function logPerformance(
  req: LoggerRequest,
  operation: string,
  duration: number,
  details: Record<string, any> = {},
) {
  logAuthEvent(req, 'performance_metric', {
    ...details,
    operation,
    duration,
    durationMs: `${duration}ms`,
  });
}
