export interface ErrorResponse {
  success: false
  code: string
  message: string
  details?: any
  timestamp?: string
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'CSRF_FAILED'
  | 'TOKEN_EXPIRED'
  | 'USER_NOT_FOUND'
  | 'ALREADY_VERIFIED'
  | 'EMAIL_NOT_VERIFIED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DUPLICATE_RESOURCE'
  | 'INTERNAL_SERVER_ERROR'
  | 'EMAIL_REQUIRED'
  | 'PASSWORD_REQUIRED'
  | 'INVALID_TOKEN'
  | 'TOKEN_REQUIRED'
  | 'USER_ALREADY_EXISTS'
  | 'EMAIL_SEND_FAILED'
  | 'DATABASE_ERROR'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly details?: any
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Invalid credentials') {
    super(message, 'INVALID_CREDENTIALS', 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'USER_NOT_FOUND', 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 'USER_ALREADY_EXISTS', 409)
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401)
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message: string = 'Email not verified') {
    super(message, 'EMAIL_NOT_VERIFIED', 403)
  }
}

export class AlreadyVerifiedError extends AppError {
  constructor(message: string = 'User already verified') {
    super(message, 'ALREADY_VERIFIED', 400)
  }
}

export class CsrfError extends AppError {
  constructor(message: string = 'CSRF token validation failed') {
    super(message, 'CSRF_FAILED', 403)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
  }
}

export class EmailSendError extends AppError {
  constructor(message: string = 'Failed to send email') {
    super(message, 'EMAIL_SEND_FAILED', 500)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 'DATABASE_ERROR', 500)
  }
}
