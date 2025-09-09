import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorResponse, ValidationError, DatabaseError } from '../types/errors';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const errorResponse: ErrorResponse = {
    success: false,
    code: 'USER_NOT_FOUND',
    message: `Not Found - ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(errorResponse);
};

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log the error using pino logger if available
  if ((req as any).log) {
    (req as any).log.error(
      {
        err,
        userId: (req as any).userId,
        url: req.originalUrl,
        method: req.method,
      },
      err.message,
    );
  } else {
    logger.error({
      err,
      url: req.originalUrl,
      method: req.method,
      userId: (req as any).userId,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }, err.message);
  }

  // Default error response
  const errorResponse: ErrorResponse = {
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };

  let statusCode = 500;

  // Handle our custom AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorResponse.code = err.code;
    errorResponse.message = err.message;
    if (err.details) {
      errorResponse.details = err.details;
    }
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.message = 'Validation failed';
    errorResponse.details = err.flatten();
  }
  // Handle Mongoose duplicate key error
  else if ((err as any).code === 11000) {
    statusCode = 409;
    errorResponse.code = 'DUPLICATE_RESOURCE';
    errorResponse.message = 'Resource already exists';
    
    // Extract field name from duplicate key error if possible
    const keyMatch = err.message.match(/index: (\w+)_1/);
    if (keyMatch) {
      errorResponse.details = { field: keyMatch[1] };
    }
  }
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.message = 'Database validation failed';
    errorResponse.details = (err as any).errors;
  }
  // Handle Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.message = 'Invalid ID format';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.code = 'INVALID_TOKEN';
    errorResponse.message = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.code = 'TOKEN_EXPIRED';
    errorResponse.message = 'Token has expired';
  }
  // Handle rate limiting errors
  else if (err.message && err.message.includes('Too many requests')) {
    statusCode = 429;
    errorResponse.code = 'RATE_LIMIT_EXCEEDED';
    errorResponse.message = 'Too many requests, please try again later';
  }
  // Handle other known error types
  else {
    // For unknown errors, keep the generic message in production
    if (process.env.NODE_ENV === 'development') {
      errorResponse.message = err.message;
      errorResponse.details = { stack: err.stack };
    }
  }

  res.status(statusCode).json(errorResponse);
};
